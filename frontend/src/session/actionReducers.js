import { normalizePlayerSides } from './playerUtils'
import { DEFAULT_ROOM_SETTINGS } from './constants'

export function applyAddPlayer(state, newPlayer) {
  return {
    ...state,
    players: [...(state.players || []).filter((p) => p.id !== newPlayer.id), newPlayer],
  }
}

export function applyUpdateLife(state, playerId, delta, sideIndex = 0) {
  return {
    ...state,
    players: (state.players || []).map((p) => {
      if (p.id !== playerId) return p
      const currentSides = normalizePlayerSides(p)
      const target = currentSides.find((side) => side.index === sideIndex) || (sideIndex === 0 ? currentSides[0] : null)
      if (target) {
        target.value = (target.value || 0) + delta
      }
      const mainSide = currentSides.find((side) => side.index === 0) || currentSides[0]

      // Commander damage decreases main life
      if (target && sideIndex !== 0 && (target.type === 'commander' || (target.label && target.label.toLowerCase().includes('commander')))) {
        if (mainSide) {
          mainSide.value = (mainSide.value || 0) - delta
        }
      }

      return {
        ...p,
        life: mainSide?.value ?? 20,
        sides: currentSides,
      }
    }),
  }
}

export function applyAddSide(state, playerId, sideObj) {
  return {
    ...state,
    players: (state.players || []).map((p) => {
      if (p.id !== playerId) return p
      const currentSides = normalizePlayerSides(p).filter((side) => side.index !== sideObj.index)
      return {
        ...p,
        sides: [...currentSides, sideObj].sort((a, b) => a.index - b.index),
      }
    }),
  }
}

export function applyRemoveSide(state, playerId, sideIndex) {
  if (sideIndex === 0) return state
  return {
    ...state,
    players: (state.players || []).map((p) => {
      if (p.id !== playerId) return p
      const currentSides = normalizePlayerSides(p).filter((side) => side.index !== sideIndex)
      return {
        ...p,
        sides: currentSides,
      }
    }),
  }
}

export function applyUpdateSide(state, playerId, sideIndex, updates) {
  return {
    ...state,
    players: (state.players || []).map((p) => {
      if (p.id !== playerId) return p
      const currentSides = normalizePlayerSides(p)
      const target = currentSides.find((side) => side.index === sideIndex)
      if (target) {
        Object.assign(target, updates)
      }
      const updatedPlayer = { ...p, sides: currentSides }
      if (sideIndex === 0) {
        if (updates.color) updatedPlayer.color = updates.color
        if (updates.bgImage !== undefined) updatedPlayer.bgImage = updates.bgImage
        if (typeof updates.value === 'number') updatedPlayer.life = updates.value
        if (updates.borderStyles) updatedPlayer.borderStyles = updates.borderStyles
      }
      return updatedPlayer
    }),
  }
}

export function applyUpdatePlayer(state, playerId, updates) {
  return {
    ...state,
    players: (state.players || []).map((p) =>
      p.id === playerId ? { ...p, ...updates } : p
    ),
  }
}

export function applyMergePlayers(state, player1Id, player2Id) {
  return {
    ...state,
    players: (state.players || []).map((p) => {
      if (p.id === player1Id) return { ...p, mergedWith: player2Id }
      if (p.id === player2Id) return { ...p, mergedWith: player1Id }
      return p
    }),
  }
}

export function applyUnmergePlayer(state, playerId) {
  const p1 = (state.players || []).find((p) => p.id === playerId)
  if (!p1 || !p1.mergedWith) return state
  const p2 = (state.players || []).find((p) => p.id === p1.mergedWith)
  const baseX = p1.x ?? 0
  const baseY = p1.y ?? 0
  const angleDeg = p1.angle ?? 0
  const rad = (angleDeg * Math.PI) / 180
  const offX = Math.round(95 * Math.cos(rad))
  const offY = Math.round(95 * Math.sin(rad))

  return {
    ...state,
    players: (state.players || []).map((p) => {
      if (p.id === playerId) {
        return { ...p, mergedWith: null, x: baseX - offX, y: baseY - offY, angle: angleDeg }
      }
      if (p2 && p.id === p2.id) {
        return { ...p, mergedWith: null, x: baseX + offX, y: baseY + offY, angle: angleDeg }
      }
      return p
    }),
  }
}

export function applyRemovePlayer(state, playerId) {
  return {
    ...state,
    players: (state.players || []).filter((p) => p.id !== playerId && p.mergedWith !== playerId).map((p) => {
      if (p.mergedWith === playerId) return { ...p, mergedWith: null }
      return p
    }),
  }
}

export function applyReorderPlayers(state, newOrderOrSource, targetId) {
  if (Array.isArray(newOrderOrSource)) {
    const order = newOrderOrSource
    const players = state.players || []
    const playerMap = new Map(players.map((p) => [p.id, p]))
    const newPlayers = []
    for (const id of order) {
      if (playerMap.has(id)) {
        newPlayers.push(playerMap.get(id))
        playerMap.delete(id)
      }
    }
    for (const remaining of playerMap.values()) {
      newPlayers.push(remaining)
    }
    return {
      ...state,
      players: newPlayers,
    }
  }

  const sourceId = newOrderOrSource
  const newPlayers = [...(state.players || [])]
  const sourceIndex = newPlayers.findIndex((p) => p.id === sourceId)
  const targetIndex = newPlayers.findIndex((p) => p.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return state
  const [movedPlayer] = newPlayers.splice(sourceIndex, 1)
  newPlayers.splice(targetIndex, 0, movedPlayer)
  return {
    ...state,
    players: newPlayers,
  }
}

export function applyResetAllLife(state, soloLife = 40, teamLife = 60, gameMode = 'commander') {
  return {
    ...state,
    gameMode,
    players: (state.players || []).map((p) => {
      const targetLife = p.mergedWith ? teamLife : soloLife
      const currentSides = normalizePlayerSides(p).map((side) => {
        if (side.index === 0) {
          return { ...side, value: targetLife }
        } else {
          return { ...side, value: 0 }
        }
      })
      return {
        ...p,
        life: targetLife,
        sides: currentSides,
      }
    }),
  }
}

export function applyHighlightCard(state, cardId) {
  return {
    ...state,
    highlightedCardId: cardId,
  }
}

export function applyUpdateRoomSettings(state, settingsUpdates) {
  return {
    ...state,
    roomSettings: {
      ...DEFAULT_ROOM_SETTINGS,
      ...(state.roomSettings || {}),
      ...settingsUpdates,
    },
  }
}
