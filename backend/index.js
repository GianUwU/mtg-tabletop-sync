const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Persistent storage setup
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const DELETED_SESSIONS_FILE = path.join(DATA_DIR, 'deleted_sessions.json');
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const deletedSessions = new Set();

function loadDeletedSessions() {
  if (fs.existsSync(DELETED_SESSIONS_FILE)) {
    try {
      const raw = fs.readFileSync(DELETED_SESSIONS_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const k of data) {
          if (typeof k === 'string') deletedSessions.add(k);
        }
      }
    } catch (e) {
      console.error('Error loading deleted sessions file:', e);
    }
  }
}

function saveDeletedSessions() {
  try {
    fs.writeFileSync(DELETED_SESSIONS_FILE, JSON.stringify(Array.from(deletedSessions), null, 2));
  } catch (e) {
    console.error('Error saving deleted sessions file:', e);
  }
}

loadDeletedSessions();

function isSessionDeleted(sessionKey) {
  if (!sessionKey || typeof sessionKey !== 'string') return false;
  const cleanKey = sessionKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return deletedSessions.has(cleanKey);
}

function markSessionDeleted(sessionKey) {
  if (!sessionKey || typeof sessionKey !== 'string') return;
  const cleanKey = sessionKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  deletedSessions.add(cleanKey);
  saveDeletedSessions();
}

function generate4DigitCode() {
  let code = '';
  let attempts = 0;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
  } while ((deletedSessions.has(code) || sessions.has(code)) && attempts < 1000);
  return code;
}

// Session Manager
const sessions = new Map();

function sanitizeKey(key) {
  if (!key || typeof key !== 'string') return generate4DigitCode();
  const clean = key.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return clean || generate4DigitCode();
}

function getSessionFilePath(sessionKey) {
  return path.join(SESSIONS_DIR, `${sessionKey}.json`);
}

function loadSession(sessionKey) {
  const cleanKey = sanitizeKey(sessionKey);
  if (isSessionDeleted(cleanKey)) {
    return null;
  }
  if (sessions.has(cleanKey)) {
    return sessions.get(cleanKey);
  }

  const filePath = getSessionFilePath(cleanKey);
  let state = { players: [] };
  let lastActiveAt = Date.now();

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      state = JSON.parse(raw);
      if (!Array.isArray(state.players)) {
        state.players = [];
      } else {
        for (const p of state.players) {
          if (!Array.isArray(p.sides)) {
            p.sides = [typeof p.life === 'number' ? p.life : 20, 0, 0, 0];
          }
        }
      }
      if (typeof state._lastActiveAt === 'number') {
        lastActiveAt = state._lastActiveAt;
      }
    } catch (err) {
      console.error(`Error loading session file ${filePath}:`, err);
    }
  }

  const sessionObj = {
    sessionKey: cleanKey,
    state,
    clients: new Set(),
    lastActiveAt,
    dirty: false,
    saveTimer: null,
  };

  sessions.set(cleanKey, sessionObj);
  return sessionObj;
}

function initPersistedSessions() {
  try {
    const files = fs.readdirSync(SESSIONS_DIR);
    const now = Date.now();
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionKey = file.slice(0, -5);
        if (isSessionDeleted(sessionKey)) {
          try { fs.unlinkSync(path.join(SESSIONS_DIR, file)); } catch (_) {}
          continue;
        }
        const session = loadSession(sessionKey);
        if (session && now - session.lastActiveAt >= TWO_HOURS_MS) {
          sessions.delete(session.sessionKey);
        }
      }
    }
  } catch (err) {
    console.error('Error initializing persisted sessions:', err);
  }
}

initPersistedSessions();

function touchSessionActivity(session) {
  session.lastActiveAt = Date.now();
  session.state._lastActiveAt = session.lastActiveAt;
}

function scheduleSave(session) {
  touchSessionActivity(session);
  session.dirty = true;
  if (session.saveTimer) return;

  session.saveTimer = setTimeout(() => {
    session.saveTimer = null;
    if (session.dirty) {
      const filePath = getSessionFilePath(session.sessionKey);
      fs.writeFile(filePath, JSON.stringify(session.state, null, 2), (err) => {
        if (err) {
          console.error(`Failed to save session ${session.sessionKey}:`, err);
        } else {
          session.dirty = false;
        }
      });
    }
  }, 100);
}

function flushAllSessions() {
  for (const session of sessions.values()) {
    if (session.dirty) {
      const filePath = getSessionFilePath(session.sessionKey);
      try {
        fs.writeFileSync(filePath, JSON.stringify(session.state, null, 2));
        session.dirty = false;
      } catch (err) {
        console.error(`Failed to flush session ${session.sessionKey}:`, err);
      }
    }
  }
}

function getActiveSessionsList() {
  const list = [];

  for (const [key, session] of sessions.entries()) {
    if (isSessionDeleted(key)) continue;
    // Closed rooms (no clients currently connected) must not show up in the room switch dropdown
    if (session.clients.size === 0) continue;

    list.push({
      sessionKey: key,
      connectedClients: session.clients.size,
      playerCount: Array.isArray(session.state?.players) ? session.state.players.length : 0,
      lastActiveAt: session.lastActiveAt,
    });
  }

  return list.sort((a, b) => {
    if (b.connectedClients !== a.connectedClients) {
      return b.connectedClients - a.connectedClients;
    }
    return b.lastActiveAt - a.lastActiveAt;
  });
}

function broadcastSession(session, payload) {
  const data = JSON.stringify({
    ...payload,
    sessionKey: session.sessionKey,
  });

  for (const client of session.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastStateUpdate(session, ackActionId) {
  session.state.version = (session.state.version || 0) + 1;
  scheduleSave(session);
  broadcastSession(session, {
    type: 'sync',
    state: session.state,
    version: session.state.version,
    connectedClients: session.clients.size,
    ackActionId: ackActionId || null,
  });
}

function broadcastGlobalSessionList() {
  const list = getActiveSessionsList();
  const data = JSON.stringify({
    type: 'active_sessions',
    sessions: list,
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function moveClientToSession(ws, targetSessionKey, prevSession) {
  let targetKey = sanitizeKey(targetSessionKey);

  if (isSessionDeleted(targetKey)) {
    const remaining = getActiveSessionsList().filter(s => s.sessionKey !== targetKey);
    const fallbackKey = remaining.length > 0 ? remaining[0].sessionKey : generate4DigitCode();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session_deleted',
        sessionKey: targetKey,
        fallbackKey,
        error: 'This session has been deleted and cannot be accessed.',
      }));
    }
    targetKey = fallbackKey;
  }

  if (prevSession && prevSession.sessionKey === targetKey) {
    touchSessionActivity(prevSession);
    return prevSession;
  }

  if (prevSession) {
    prevSession.clients.delete(ws);
    touchSessionActivity(prevSession);
    scheduleSave(prevSession);
    broadcastSession(prevSession, {
      type: 'presence',
      connectedClients: prevSession.clients.size,
    });
  }

  let newSession = loadSession(targetKey);
  if (!newSession) {
    targetKey = generate4DigitCode();
    newSession = loadSession(targetKey);
  }
  newSession.clients.add(ws);
  touchSessionActivity(newSession);
  scheduleSave(newSession);

  setTimeout(broadcastGlobalSessionList, 50);

  return newSession;
}

// Periodic cleanup of inactive sessions (> 2h)
setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const [key, session] of sessions.entries()) {
    if (session.clients.size === 0 && (now - session.lastActiveAt >= TWO_HOURS_MS)) {
      sessions.delete(key);
      changed = true;
    }
  }

  if (changed) {
    broadcastGlobalSessionList();
  }
}, 60000);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

app.get('/api/sessions', (req, res) => {
  res.json({ sessions: getActiveSessionsList().filter(s => !isSessionDeleted(s.sessionKey)) });
});

app.get('/api/session/:sessionKey', (req, res) => {
  const key = sanitizeKey(req.params.sessionKey);
  if (isSessionDeleted(key)) {
    return res.status(404).json({ error: 'This session has been permanently deleted.', deleted: true });
  }
  const session = loadSession(key);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.', deleted: true });
  }
  res.json({
    sessionKey: session.sessionKey,
    state: session.state,
    connectedClients: session.clients.size,
    lastActiveAt: session.lastActiveAt,
  });
});

app.delete('/api/session/:sessionKey', (req, res) => {
  const keyToDelete = sanitizeKey(req.params.sessionKey);
  markSessionDeleted(keyToDelete);
  const filePath = getSessionFilePath(keyToDelete);
  const sessionObj = sessions.get(keyToDelete);

  if (sessionObj) {
    if (sessionObj.saveTimer) {
      clearTimeout(sessionObj.saveTimer);
      sessionObj.saveTimer = null;
    }
    sessionObj.dirty = false;
    sessions.delete(keyToDelete);

    const remaining = getActiveSessionsList().filter(s => s.sessionKey !== keyToDelete && !isSessionDeleted(s.sessionKey));
    const fallbackKey = remaining.length > 0 ? remaining[0].sessionKey : generate4DigitCode();

    for (const client of sessionObj.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'session_deleted',
          sessionKey: keyToDelete,
          fallbackKey,
        }));
      }
    }
    sessionObj.clients.clear();
  }

  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }

  broadcastGlobalSessionList();
  res.json({ success: true, deletedKey: keyToDelete, deleted: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  let currentSession = null;

  try {
    const url = new URL(req.url, 'http://localhost');
    const queryKey = url.searchParams.get('session') || url.searchParams.get('s');
    const initialKey = queryKey ? sanitizeKey(queryKey) : generate4DigitCode();
    currentSession = moveClientToSession(ws, initialKey, null);

    ws.send(JSON.stringify({
      type: 'sync',
      sessionKey: currentSession.sessionKey,
      state: currentSession.state,
      connectedClients: currentSession.clients.size,
    }));

    ws.send(JSON.stringify({
      type: 'active_sessions',
      sessions: getActiveSessionsList(),
    }));
  } catch (e) {
    console.error('Error in initial WS connection setup:', e);
    currentSession = moveClientToSession(ws, generate4DigitCode(), null);
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const targetSessionKey = msg.sessionKey ? sanitizeKey(msg.sessionKey) : (currentSession ? currentSession.sessionKey : generate4DigitCode());

      if (!currentSession || currentSession.sessionKey !== targetSessionKey || msg.type === 'join') {
        currentSession = moveClientToSession(ws, targetSessionKey, currentSession);

        ws.send(JSON.stringify({
          type: 'sync',
          sessionKey: currentSession.sessionKey,
          state: currentSession.state,
          connectedClients: currentSession.clients.size,
        }));

        if (msg.type === 'join') return;
      }

      touchSessionActivity(currentSession);

      if (!Array.isArray(currentSession.state.players)) {
        currentSession.state.players = [];
      }

      // 1. Add Player
      if (msg.type === 'add_player' && msg.player) {
        const initialSides = Array.isArray(msg.player.sides)
          ? msg.player.sides
          : [typeof msg.player.life === 'number' ? msg.player.life : 20, 0, 0, 0];

        const newPlayer = {
          id: msg.player.id || `p_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          name: msg.player.name || `Player ${currentSession.state.players.length + 1}`,
          // 2D position (normalized or pixel offset from center)
          x: typeof msg.player.x === 'number' ? msg.player.x : 0,
          y: typeof msg.player.y === 'number' ? msg.player.y : -220,
          angle: typeof msg.player.angle === 'number' ? msg.player.angle : 0,
          life: typeof initialSides[0] === 'object' && initialSides[0] !== null ? (initialSides[0].value ?? 20) : (initialSides[0] ?? 20),
          sides: initialSides,
          color: msg.player.color || '#38bdf8',
          // Merge support
          mergedWith: msg.player.mergedWith || null,
        };

        currentSession.state.players.push(newPlayer);
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // 2. Update Life / Side Value
      if (msg.type === 'update_life' && msg.playerId) {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player) {
          if (!Array.isArray(player.sides)) {
            player.sides = [{ index: 0, type: 'life', label: '', value: typeof player.life === 'number' ? player.life : 20, color: player.color || '#fbbf24', bgImage: player.bgImage || null }];
          }
          const sideIndex = typeof msg.sideIndex === 'number' ? msg.sideIndex : 0;
          const delta = typeof msg.delta === 'number' ? msg.delta : 1;

          let targetSide = player.sides.find(s => s.index === sideIndex);
          if (!targetSide && sideIndex === 0) {
            targetSide = player.sides[0];
          }
          if (targetSide) {
            targetSide.value = (targetSide.value || 0) + delta;
          }
          const mainSide = player.sides.find(s => s.index === 0) || player.sides[0];
          
          // Upping commander damage should equally subtract from main life
          if (targetSide && sideIndex !== 0 && (targetSide.type === 'commander' || (targetSide.label && targetSide.label.toLowerCase().includes('commander')))) {
            if (mainSide) {
              mainSide.value = (mainSide.value || 0) - delta;
            }
          }

          if (mainSide) player.life = mainSide.value;

          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Reset All Players Life (for game modes)
      if (msg.type === 'reset_all_life') {
        const soloLife = typeof msg.soloLife === 'number' ? msg.soloLife : 40;
        const teamLife = typeof msg.teamLife === 'number' ? msg.teamLife : 60;
        for (const p of currentSession.state.players) {
          const startingLife = p.mergedWith ? teamLife : soloLife;
          p.life = startingLife;
          if (Array.isArray(p.sides)) {
            for (const s of p.sides) {
              if (s.index === 0) {
                s.value = startingLife;
              } else {
                s.value = 0;
              }
            }
          }
        }
        if (msg.gameMode) {
          currentSession.state.gameMode = msg.gameMode;
        }
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // Add Side (with signed integer index)
      if (msg.type === 'add_side' && msg.playerId && msg.side) {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player) {
          if (!Array.isArray(player.sides)) {
            player.sides = [{ index: 0, type: 'life', label: '', value: typeof player.life === 'number' ? player.life : 20, color: player.color || '#fbbf24', bgImage: player.bgImage || null }];
          }
          const sideObj = {
            index: typeof msg.side.index === 'number' ? msg.side.index : player.sides.length,
            type: msg.side.type || 'custom',
            label: msg.side.label || 'Counter',
            value: typeof msg.side.value === 'number' ? msg.side.value : 0,
            color: msg.side.color || '#38bdf8',
            bgImage: msg.side.bgImage || null,
          };

          const existingIdx = player.sides.findIndex(s => s.index === sideObj.index);
          if (existingIdx >= 0) {
            player.sides[existingIdx] = sideObj;
          } else {
            player.sides.push(sideObj);
          }

          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Remove Side
      if (msg.type === 'remove_side' && msg.playerId && typeof msg.sideIndex === 'number') {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player && Array.isArray(player.sides) && msg.sideIndex !== 0) {
          player.sides = player.sides.filter(s => s.index !== msg.sideIndex);
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Update Side Properties
      if (msg.type === 'update_side' && msg.playerId && typeof msg.sideIndex === 'number' && msg.updates) {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player && Array.isArray(player.sides)) {
          const targetSide = player.sides.find(s => s.index === msg.sideIndex);
          if (targetSide) {
            Object.assign(targetSide, msg.updates);
          }
          if (msg.sideIndex === 0 && typeof msg.updates.value === 'number') {
            player.life = msg.updates.value;
          }
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // 3. Remove Player (or unmerge)
      if (msg.type === 'remove_player' && msg.playerId) {
        const toRemove = currentSession.state.players.find(p => p.id === msg.playerId);
        if (toRemove && toRemove.mergedWith) {
          const other = currentSession.state.players.find(p => p.id === toRemove.mergedWith);
          if (other) other.mergedWith = null;
        }
        currentSession.state.players = currentSession.state.players.filter(p => p.id !== msg.playerId);
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // 4. Update Player Properties (x, y, angle, name, color, mergedWith)
      if (msg.type === 'update_player' && msg.playerId && msg.updates) {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player) {
          Object.assign(player, msg.updates);
          if (Array.isArray(msg.updates.sides)) {
            player.life = msg.updates.sides[0];
          }
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // 5. Merge Players
      if (msg.type === 'merge_players' && msg.player1Id && msg.player2Id) {
        const p1 = currentSession.state.players.find(p => p.id === msg.player1Id);
        const p2 = currentSession.state.players.find(p => p.id === msg.player2Id);
        if (p1 && p2) {
          p1.mergedWith = p2.id;
          p2.mergedWith = p1.id;
          // Synchronize position
          p2.x = p1.x;
          p2.y = p1.y;
          p2.angle = p1.angle;

          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // 6. Unmerge Players
      if (msg.type === 'unmerge_player' && msg.playerId) {
        const p1 = currentSession.state.players.find(p => p.id === msg.playerId);
        if (p1 && p1.mergedWith) {
          const p2 = currentSession.state.players.find(p => p.id === p1.mergedWith);
          p1.mergedWith = null;
          if (p2) {
            p2.mergedWith = null;
            const baseX = typeof p1.x === 'number' ? p1.x : 0;
            const baseY = typeof p1.y === 'number' ? p1.y : 0;
            const angleDeg = typeof p1.angle === 'number' ? p1.angle : 0;
            const rad = (angleDeg * Math.PI) / 180;
            // Place side-by-side perpendicular to facing direction
            const offX = Math.round(95 * Math.cos(rad));
            const offY = Math.round(95 * Math.sin(rad));

            p1.x = baseX - offX;
            p1.y = baseY - offY;
            p1.angle = angleDeg;

            p2.x = baseX + offX;
            p2.y = baseY + offY;
            p2.angle = angleDeg;
          }
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // 7. Delete Session
      if (msg.type === 'delete_session' && msg.sessionKey) {
        const keyToDelete = sanitizeKey(msg.sessionKey);
        markSessionDeleted(keyToDelete);
        const filePath = getSessionFilePath(keyToDelete);
        const sessionObj = sessions.get(keyToDelete);

        if (sessionObj) {
          if (sessionObj.saveTimer) {
            clearTimeout(sessionObj.saveTimer);
            sessionObj.saveTimer = null;
          }
          sessionObj.dirty = false;
          sessions.delete(keyToDelete);

          const remaining = getActiveSessionsList().filter(s => s.sessionKey !== keyToDelete && !isSessionDeleted(s.sessionKey));
          const fallbackKey = remaining.length > 0 ? remaining[0].sessionKey : generate4DigitCode();

          for (const client of sessionObj.clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'session_deleted',
                sessionKey: keyToDelete,
                fallbackKey,
              }));
            }
          }
          sessionObj.clients.clear();
        }

        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {
            console.error('Error deleting session file:', e);
          }
        }

        broadcastGlobalSessionList();
        return;
      }

      // 8. Highlight Card (Synced focus token)
      if (msg.type === 'highlight_card') {
        currentSession.state.highlightedCardId = msg.cardId || null;
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // 9. Update Room Settings
      if (msg.type === 'update_room_settings' && msg.settings && typeof msg.settings === 'object') {
        if (!currentSession.state.roomSettings || typeof currentSession.state.roomSettings !== 'object') {
          currentSession.state.roomSettings = {};
        }
        Object.assign(currentSession.state.roomSettings, msg.settings);
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // 11. Reorder Players
      if (msg.type === 'reorder_players') {
        const players = currentSession.state.players;
        if (Array.isArray(msg.order)) {
          const playerMap = new Map(players.map((p) => [p.id, p]));
          const newPlayers = [];
          for (const id of msg.order) {
            if (playerMap.has(id)) {
              newPlayers.push(playerMap.get(id));
              playerMap.delete(id);
            }
          }
          for (const remaining of playerMap.values()) {
            newPlayers.push(remaining);
          }
          currentSession.state.players = newPlayers;
          broadcastStateUpdate(currentSession, msg.actionId);
          return;
        }
        if (msg.sourceId && msg.targetId) {
          const sourceIndex = players.findIndex((p) => p.id === msg.sourceId);
          const targetIndex = players.findIndex((p) => p.id === msg.targetId);
          if (sourceIndex >= 0 && targetIndex >= 0 && sourceIndex !== targetIndex) {
            const [movedPlayer] = players.splice(sourceIndex, 1);
            players.splice(targetIndex, 0, movedPlayer);
            broadcastStateUpdate(currentSession, msg.actionId);
          }
          return;
        }
      }

      // 10. Generic Patch
      if (msg.type === 'patch') {
        if (msg.updates && typeof msg.updates === 'object') {
          Object.assign(currentSession.state, msg.updates);
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }
    } catch (err) {
      console.error('Invalid WS message received:', err);
    }
  });

  ws.on('close', () => {
    if (currentSession) {
      currentSession.clients.delete(ws);
      touchSessionActivity(currentSession);
      scheduleSave(currentSession);

      broadcastSession(currentSession, {
        type: 'presence',
        connectedClients: currentSession.clients.size,
      });

      setTimeout(broadcastGlobalSessionList, 50);
    }
  });
});

process.on('SIGTERM', () => {
  flushAllSessions();
  process.exit(0);
});

process.on('SIGINT', () => {
  flushAllSessions();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
