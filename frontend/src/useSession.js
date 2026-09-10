import { useState, useRef, useCallback } from 'react'

// Modular Session Components
import { DEFAULT_ROOM_SETTINGS } from './session/constants'
import { generate4DigitCode, generateActionId, getInitialSessionKey } from './session/sessionUtils'
import { normalizePlayerSides } from './session/playerUtils'
import { reconcileState } from './session/reconcile'
import { useWebSocket } from './session/useWebSocket'
import {
  applyAddPlayer,
  applyUpdateLife,
  applyAddSide,
  applyRemoveSide,
  applyUpdateSide,
  applyUpdatePlayer,
  applyMergePlayers,
  applyUnmergePlayer,
  applyRemovePlayer,
  applyReorderPlayers,
  applyResetAllLife,
  applyHighlightCard,
  applyUpdateRoomSettings,
} from './session/actionReducers'

// Re-export core utilities for backwards compatibility
export { DEFAULT_ROOM_SETTINGS } from './session/constants'
export { generate4DigitCode, getInitialSessionKey } from './session/sessionUtils'
export { normalizePlayerSides } from './session/playerUtils'

export function useSession() {
  const [sessionKey, setSessionKey] = useState(() => getInitialSessionKey())
  const [state, setState] = useState({ players: [] })

  const activeSessionKeyRef = useRef(sessionKey)
  const serverStateRef = useRef({ players: [] })
  const pendingActionsRef = useRef([])

  activeSessionKeyRef.current = sessionKey

  const onStateReconciled = useCallback((baseServerState) => {
    const nextState = reconcileState(baseServerState, pendingActionsRef.current)
    setState(nextState)
  }, [])

  const switchSession = useCallback((newKey) => {
    const clean = (newKey || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 32) || generate4DigitCode()
    setSessionKey(clean)
    const url = new URL(window.location.href)
    url.searchParams.set('session', clean)
    window.history.pushState({}, '', url)
  }, [])

  const {
    connected,
    clientCount,
    sendRawMessage,
  } = useWebSocket({
    sessionKey,
    serverStateRef,
    pendingActionsRef,
    onStateReconciled,
    activeSessionKeyRef,
  })

  // Dispatch optimistic action with client prediction and tracking
  const dispatchAction = useCallback((msgType, payload, applyFn) => {
    const actionId = generateActionId()
    const actionItem = {
      actionId,
      type: msgType,
      apply: applyFn,
      timestamp: Date.now(),
    }

    pendingActionsRef.current.push(actionItem)

    // Immediately compute optimistic UI state
    const nextState = reconcileState(serverStateRef.current, pendingActionsRef.current)
    setState(nextState)

    // Send payload with actionId attached
    sendRawMessage({
      type: msgType,
      sessionKey: activeSessionKeyRef.current,
      actionId,
      ...payload,
    })
  }, [sendRawMessage])

  // Add player
  const addPlayer = useCallback((playerData) => {
    const newId = playerData.id || `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const newPlayer = {
      ...playerData,
      id: newId,
      sides: normalizePlayerSides(playerData),
    }

    dispatchAction(
      'add_player',
      { player: newPlayer },
      (s) => applyAddPlayer(s, newPlayer)
    )
  }, [dispatchAction])

  // Update life / side counter
  const updateLife = useCallback((playerId, delta, sideIndex = 0) => {
    dispatchAction(
      'update_life',
      { playerId, delta, sideIndex },
      (s) => applyUpdateLife(s, playerId, delta, sideIndex)
    )
  }, [dispatchAction])

  // Add side to player with signed integer index
  const addSide = useCallback((playerId, sideData) => {
    const sideObj = {
      index: typeof sideData.index === 'number' ? sideData.index : 1,
      id: sideData.id || `s_${sideData.index || 1}_${Date.now()}`,
      type: sideData.type || 'custom',
      label: sideData.label || 'Counter',
      value: typeof sideData.value === 'number' ? sideData.value : 0,
      color: sideData.color || '#38bdf8',
      bgImage: sideData.bgImage || null,
      borderStyles: Array.isArray(sideData.borderStyles) ? sideData.borderStyles : [],
    }

    dispatchAction(
      'add_side',
      { playerId, side: sideObj },
      (s) => applyAddSide(s, playerId, sideObj)
    )
  }, [dispatchAction])

  // Remove side from player
  const removeSide = useCallback((playerId, sideIndex) => {
    if (sideIndex === 0) return // Main side cannot be removed

    dispatchAction(
      'remove_side',
      { playerId, sideIndex },
      (s) => applyRemoveSide(s, playerId, sideIndex)
    )
  }, [dispatchAction])

  // Update side properties (color, bgImage, label, value, borderStyles)
  const updateSide = useCallback((playerId, sideIndex, updates) => {
    dispatchAction(
      'update_side',
      { playerId, sideIndex, updates },
      (s) => applyUpdateSide(s, playerId, sideIndex, updates)
    )
  }, [dispatchAction])

  // Update player properties (x, y, angle, name, color, borderStyles, etc.)
  const updatePlayer = useCallback((playerId, updates) => {
    dispatchAction(
      'update_player',
      { playerId, updates },
      (s) => applyUpdatePlayer(s, playerId, updates)
    )
  }, [dispatchAction])

  // Merge 2 players into 1 wide card
  const mergePlayers = useCallback((player1Id, player2Id) => {
    dispatchAction(
      'merge_players',
      { player1Id, player2Id },
      (s) => applyMergePlayers(s, player1Id, player2Id)
    )
  }, [dispatchAction])

  // Unmerge wide card back into 2 separate cards side-by-side
  const unmergePlayer = useCallback((playerId) => {
    dispatchAction(
      'unmerge_player',
      { playerId },
      (s) => applyUnmergePlayer(s, playerId)
    )
  }, [dispatchAction])

  // Remove player
  const removePlayer = useCallback((playerId) => {
    dispatchAction(
      'remove_player',
      { playerId },
      (s) => applyRemovePlayer(s, playerId)
    )
  }, [dispatchAction])

  // Reorder players
  const reorderPlayers = useCallback((newOrderOrSource, targetId) => {
    const payload = Array.isArray(newOrderOrSource)
      ? { order: newOrderOrSource }
      : { sourceId: newOrderOrSource, targetId }

    dispatchAction(
      'reorder_players',
      payload,
      (s) => applyReorderPlayers(s, newOrderOrSource, targetId)
    )
  }, [dispatchAction])

  const createNewSession = useCallback(() => {
    const newKey = generate4DigitCode()
    switchSession(newKey)
  }, [switchSession])

  // Reset all players' life according to game mode & reset side counters
  const resetAllPlayersLife = useCallback((soloLife = 40, teamLife = 60, gameMode = 'commander') => {
    dispatchAction(
      'reset_all_life',
      { soloLife, teamLife, gameMode },
      (s) => applyResetAllLife(s, soloLife, teamLife, gameMode)
    )
  }, [dispatchAction])

  // Highlight card (synced token)
  const setHighlightedCard = useCallback((cardId) => {
    dispatchAction(
      'highlight_card',
      { cardId },
      (s) => applyHighlightCard(s, cardId)
    )
  }, [dispatchAction])

  // Update room settings (theme, icon, colors, fonts, scaling)
  const updateRoomSettings = useCallback((settingsUpdates) => {
    dispatchAction(
      'update_room_settings',
      { settings: settingsUpdates },
      (s) => applyUpdateRoomSettings(s, settingsUpdates)
    )
  }, [dispatchAction])

  const roomSettings = {
    ...DEFAULT_ROOM_SETTINGS,
    ...(state.roomSettings || {}),
  }

  return {
    sessionKey,
    state,
    roomSettings,
    players: state.players || [],
    highlightedCardId: state.highlightedCardId || null,
    connected,
    clientCount,
    addPlayer,
    updateLife,
    addSide,
    removeSide,
    updateSide,
    updatePlayer,
    mergePlayers,
    unmergePlayer,
    removePlayer,
    reorderPlayers,
    switchSession,
    createNewSession,
    resetAllPlayersLife,
    setHighlightedCard,
    updateRoomSettings,
  }
}
