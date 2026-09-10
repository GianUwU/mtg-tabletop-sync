const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Persistent storage setup
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// 4-Character Alphanumeric Room Codes (0-9, A-Z) -> 36^4 = 1,679,616 possibilities
const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateRoomCode() {
  let code = '';
  let attempts = 0;
  do {
    code = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      code += ALPHANUMERIC_CHARS[bytes[i] % ALPHANUMERIC_CHARS.length];
    }
    attempts++;
  } while (sessions.has(code) && attempts < 1000);
  return code;
}

const generate4DigitCode = generateRoomCode;

// Input Sanitization Helpers to Prevent Prototype Pollution & Type Confusion
function sanitizeKey(key) {
  if (!key || typeof key !== 'string') return generateRoomCode();
  const clean = key.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 32);
  return clean || generateRoomCode();
}

function sanitizeString(val, fallback = '', maxLen = 128) {
  if (typeof val !== 'string') return fallback;
  return val.slice(0, maxLen);
}

function sanitizeNumber(val, fallback = 0, min = -1000000, max = 1000000) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function sanitizeColor(val, fallback = '#38bdf8') {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function sanitizeBorderStyles(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => typeof item === 'string').slice(0, 10);
}

function sanitizeSides(sidesArr, defaultLife = 20, defaultColor = '#38bdf8', bgImage = null) {
  if (!Array.isArray(sidesArr) || sidesArr.length === 0) {
    return [{
      index: 0,
      type: 'life',
      label: '',
      value: defaultLife,
      color: defaultColor,
      bgImage: bgImage,
      borderStyles: [],
    }];
  }

  return sidesArr.slice(0, 20).map((side, i) => {
    if (typeof side !== 'object' || side === null) {
      return {
        index: i,
        type: i === 0 ? 'life' : 'custom',
        label: i === 0 ? '' : 'Counter',
        value: typeof side === 'number' && Number.isFinite(side) ? side : 0,
        color: defaultColor,
        bgImage: null,
        borderStyles: [],
      };
    }
    return {
      index: typeof side.index === 'number' && Number.isFinite(side.index) ? sanitizeNumber(side.index, i, -100, 100) : i,
      id: sanitizeString(side.id, `s_${i}_${Date.now()}`, 64),
      type: sanitizeString(side.type, i === 0 ? 'life' : 'custom', 32),
      label: sanitizeString(side.label, '', 64),
      value: sanitizeNumber(side.value, i === 0 ? defaultLife : 0),
      color: sanitizeColor(side.color, defaultColor),
      bgImage: side.bgImage && typeof side.bgImage === 'string' ? sanitizeString(side.bgImage, null, 512) : null,
      borderStyles: sanitizeBorderStyles(side.borderStyles),
    };
  });
}

// Session Manager
const sessions = new Map();

function getSessionFilePath(sessionKey) {
  return path.join(SESSIONS_DIR, `${sessionKey}.json`);
}

function loadSession(sessionKey) {
  const cleanKey = sanitizeKey(sessionKey);
  if (sessions.has(cleanKey)) {
    return sessions.get(cleanKey);
  }

  const filePath = getSessionFilePath(cleanKey);
  let state = { players: [] };
  let lastActiveAt = Date.now();

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        state = parsed;
        if (!Array.isArray(state.players)) {
          state.players = [];
        } else {
          for (const p of state.players) {
            p.sides = sanitizeSides(p.sides, typeof p.life === 'number' ? p.life : 20, p.color, p.bgImage);
            const mainSide = p.sides.find(s => s.index === 0) || p.sides[0];
            if (mainSide) p.life = mainSide.value;
          }
        }
        if (typeof state._lastActiveAt === 'number') {
          lastActiveAt = state._lastActiveAt;
        }
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

function moveClientToSession(ws, targetSessionKey, prevSession) {
  let targetKey = sanitizeKey(targetSessionKey);

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
    targetKey = generateRoomCode();
    newSession = loadSession(targetKey);
  }
  newSession.clients.add(ws);
  touchSessionActivity(newSession);
  scheduleSave(newSession);

  return newSession;
}

// Periodic cleanup of inactive sessions (> 2h)
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (session.clients.size === 0 && (now - session.lastActiveAt >= TWO_HOURS_MS)) {
      sessions.delete(key);
    }
  }
}, 60000);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/session/:sessionKey', (req, res) => {
  const key = sanitizeKey(req.params.sessionKey);
  const session = loadSession(key);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }
  res.json({
    sessionKey: session.sessionKey,
    state: session.state,
    connectedClients: session.clients.size,
    lastActiveAt: session.lastActiveAt,
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  let currentSession = null;

  try {
    const url = new URL(req.url, 'http://localhost');
    const queryKey = url.searchParams.get('session') || url.searchParams.get('s');
    const initialKey = queryKey ? sanitizeKey(queryKey) : generateRoomCode();
    currentSession = moveClientToSession(ws, initialKey, null);

    ws.send(JSON.stringify({
      type: 'sync',
      sessionKey: currentSession.sessionKey,
      state: currentSession.state,
      connectedClients: currentSession.clients.size,
    }));
  } catch (e) {
    console.error('Error in initial WS connection setup:', e);
    currentSession = moveClientToSession(ws, generateRoomCode(), null);
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!msg || typeof msg !== 'object') return;

      const targetSessionKey = msg.sessionKey ? sanitizeKey(msg.sessionKey) : (currentSession ? currentSession.sessionKey : generateRoomCode());

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
      if (msg.type === 'add_player' && msg.player && typeof msg.player === 'object') {
        if (currentSession.state.players.length >= 32) return; // Cap players per room

        const pData = msg.player;
        const pColor = sanitizeColor(pData.color, '#38bdf8');
        const defaultLife = typeof pData.life === 'number' && Number.isFinite(pData.life) ? sanitizeNumber(pData.life, 20) : 20;
        const initialSides = sanitizeSides(pData.sides, defaultLife, pColor, pData.bgImage);
        const mainSide = initialSides.find(s => s.index === 0) || initialSides[0];

        const newPlayer = {
          id: sanitizeString(pData.id, `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`, 64),
          name: sanitizeString(pData.name, `Player ${currentSession.state.players.length + 1}`, 40),
          x: sanitizeNumber(pData.x, 0, -2000, 2000),
          y: sanitizeNumber(pData.y, -220, -2000, 2000),
          angle: sanitizeNumber(pData.angle, 0, -360, 360),
          life: mainSide ? mainSide.value : 20,
          sides: initialSides,
          color: pColor,
          mergedWith: pData.mergedWith && typeof pData.mergedWith === 'string' ? sanitizeString(pData.mergedWith, null, 64) : null,
        };

        currentSession.state.players.push(newPlayer);
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // 2. Update Life / Side Value
      if (msg.type === 'update_life' && typeof msg.playerId === 'string') {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player) {
          player.sides = sanitizeSides(player.sides, player.life || 20, player.color, player.bgImage);
          const sideIndex = sanitizeNumber(msg.sideIndex, 0, -100, 100);
          const delta = sanitizeNumber(msg.delta, 1, -1000, 1000);

          let targetSide = player.sides.find(s => s.index === sideIndex);
          if (!targetSide && sideIndex === 0) {
            targetSide = player.sides[0];
          }
          if (targetSide) {
            targetSide.value = sanitizeNumber((targetSide.value || 0) + delta);
          }
          const mainSide = player.sides.find(s => s.index === 0) || player.sides[0];

          // Commander damage subtraction from main life
          if (targetSide && sideIndex !== 0 && (targetSide.type === 'commander' || (targetSide.label && targetSide.label.toLowerCase().includes('commander')))) {
            if (mainSide) {
              mainSide.value = sanitizeNumber((mainSide.value || 0) - delta);
            }
          }

          if (mainSide) player.life = mainSide.value;

          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Reset All Players Life (for game modes)
      if (msg.type === 'reset_all_life') {
        const soloLife = sanitizeNumber(msg.soloLife, 40, 1, 9999);
        const teamLife = sanitizeNumber(msg.teamLife, 60, 1, 9999);
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
        if (typeof msg.gameMode === 'string') {
          currentSession.state.gameMode = sanitizeString(msg.gameMode, 'commander', 32);
        }
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // Add Side
      if (msg.type === 'add_side' && typeof msg.playerId === 'string' && msg.side && typeof msg.side === 'object') {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player) {
          player.sides = sanitizeSides(player.sides, player.life || 20, player.color, player.bgImage);
          if (player.sides.length >= 20) return; // Limit sides per player

          const sideObj = {
            index: sanitizeNumber(msg.side.index, player.sides.length, -100, 100),
            id: sanitizeString(msg.side.id, `s_${player.sides.length}_${Date.now()}`, 64),
            type: sanitizeString(msg.side.type, 'custom', 32),
            label: sanitizeString(msg.side.label, 'Counter', 64),
            value: sanitizeNumber(msg.side.value, 0),
            color: sanitizeColor(msg.side.color, player.color || '#38bdf8'),
            bgImage: msg.side.bgImage && typeof msg.side.bgImage === 'string' ? sanitizeString(msg.side.bgImage, null, 512) : null,
            borderStyles: sanitizeBorderStyles(msg.side.borderStyles),
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
      if (msg.type === 'remove_side' && typeof msg.playerId === 'string' && typeof msg.sideIndex === 'number') {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player && Array.isArray(player.sides) && msg.sideIndex !== 0) {
          player.sides = player.sides.filter(s => s.index !== msg.sideIndex);
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Update Side Properties
      if (msg.type === 'update_side' && typeof msg.playerId === 'string' && typeof msg.sideIndex === 'number' && msg.updates && typeof msg.updates === 'object') {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player && Array.isArray(player.sides)) {
          const targetSide = player.sides.find(s => s.index === msg.sideIndex);
          if (targetSide) {
            const u = msg.updates;
            if (u.label !== undefined) targetSide.label = sanitizeString(u.label, targetSide.label, 64);
            if (u.type !== undefined) targetSide.type = sanitizeString(u.type, targetSide.type, 32);
            if (u.color !== undefined) targetSide.color = sanitizeColor(u.color, targetSide.color);
            if (u.bgImage !== undefined) targetSide.bgImage = u.bgImage ? sanitizeString(u.bgImage, null, 512) : null;
            if (u.borderStyles !== undefined) targetSide.borderStyles = sanitizeBorderStyles(u.borderStyles);
            if (typeof u.value === 'number' && Number.isFinite(u.value)) {
              targetSide.value = sanitizeNumber(u.value);
              if (msg.sideIndex === 0) {
                player.life = targetSide.value;
              }
            }
          }
          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Remove Player
      if (msg.type === 'remove_player' && typeof msg.playerId === 'string') {
        const toRemove = currentSession.state.players.find(p => p.id === msg.playerId);
        if (toRemove && toRemove.mergedWith) {
          const other = currentSession.state.players.find(p => p.id === toRemove.mergedWith);
          if (other) other.mergedWith = null;
        }
        currentSession.state.players = currentSession.state.players.filter(p => p.id !== msg.playerId);
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // Update Player Properties
      if (msg.type === 'update_player' && typeof msg.playerId === 'string' && msg.updates && typeof msg.updates === 'object') {
        const player = currentSession.state.players.find(p => p.id === msg.playerId);
        if (player) {
          const u = msg.updates;
          if (u.name !== undefined) player.name = sanitizeString(u.name, player.name, 40);
          if (typeof u.x === 'number') player.x = sanitizeNumber(u.x, player.x, -2000, 2000);
          if (typeof u.y === 'number') player.y = sanitizeNumber(u.y, player.y, -2000, 2000);
          if (typeof u.angle === 'number') player.angle = sanitizeNumber(u.angle, player.angle, -360, 360);
          if (u.color !== undefined) player.color = sanitizeColor(u.color, player.color);
          if (u.bgImage !== undefined) player.bgImage = u.bgImage ? sanitizeString(u.bgImage, null, 512) : null;
          if (u.borderStyles !== undefined) player.borderStyles = sanitizeBorderStyles(u.borderStyles);
          if (u.mergedWith !== undefined) player.mergedWith = u.mergedWith ? sanitizeString(u.mergedWith, null, 64) : null;

          if (Array.isArray(u.sides)) {
            player.sides = sanitizeSides(u.sides, player.life || 20, player.color, player.bgImage);
            const mainSide = player.sides.find(s => s.index === 0) || player.sides[0];
            if (mainSide) player.life = mainSide.value;
          }

          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Merge Players
      if (msg.type === 'merge_players' && typeof msg.player1Id === 'string' && typeof msg.player2Id === 'string') {
        const p1 = currentSession.state.players.find(p => p.id === msg.player1Id);
        const p2 = currentSession.state.players.find(p => p.id === msg.player2Id);
        if (p1 && p2 && p1.id !== p2.id) {
          p1.mergedWith = p2.id;
          p2.mergedWith = p1.id;
          p2.x = p1.x;
          p2.y = p1.y;
          p2.angle = p1.angle;

          broadcastStateUpdate(currentSession, msg.actionId);
        }
        return;
      }

      // Unmerge Players
      if (msg.type === 'unmerge_player' && typeof msg.playerId === 'string') {
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

      // Highlight Card
      if (msg.type === 'highlight_card') {
        currentSession.state.highlightedCardId = msg.cardId ? sanitizeString(msg.cardId, null, 64) : null;
        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // Update Room Settings
      if (msg.type === 'update_room_settings' && msg.settings && typeof msg.settings === 'object') {
        if (!currentSession.state.roomSettings || typeof currentSession.state.roomSettings !== 'object') {
          currentSession.state.roomSettings = {};
        }

        const safeKeys = [
          'theme', 'icon', 'primaryColor', 'secondaryColor', 'accentColor',
          'customFont', 'zoomScale', 'orientation', 'layout', 'customColors',
          'hideCounters', 'turnBallMode', 'showClock', 'tableBackground',
          'gameMode', 'keepScreenAwake'
        ];

        for (const key of safeKeys) {
          if (msg.settings[key] !== undefined) {
            const val = msg.settings[key];
            if (typeof val === 'string') {
              currentSession.state.roomSettings[key] = sanitizeString(val, '', 256);
            } else if (typeof val === 'number') {
              currentSession.state.roomSettings[key] = sanitizeNumber(val, 1, -1000, 1000);
            } else if (typeof val === 'boolean') {
              currentSession.state.roomSettings[key] = Boolean(val);
            } else if (Array.isArray(val)) {
              currentSession.state.roomSettings[key] = val.filter(x => typeof x === 'string').slice(0, 50);
            }
          }
        }

        broadcastStateUpdate(currentSession, msg.actionId);
        return;
      }

      // Reorder Players
      if (msg.type === 'reorder_players') {
        const players = currentSession.state.players;
        if (Array.isArray(msg.order)) {
          const safeOrder = msg.order.filter(id => typeof id === 'string');
          const playerMap = new Map(players.map((p) => [p.id, p]));
          const newPlayers = [];
          for (const id of safeOrder) {
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
        if (typeof msg.sourceId === 'string' && typeof msg.targetId === 'string') {
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
