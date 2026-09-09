import { normalizePlayerSides } from './playerUtils'

/**
 * Reconcile server truth with unacknowledged client predictions
 */
export function reconcileState(baseServerState, pendingActions) {
  let current = {
    ...baseServerState,
    players: Array.isArray(baseServerState?.players)
      ? baseServerState.players.map((p) => ({
          ...p,
          sides: normalizePlayerSides(p),
        }))
      : [],
  }

  for (const action of pendingActions) {
    try {
      current = action.apply(current)
    } catch (err) {
      console.error('Error applying pending action in reconciliation:', err)
    }
  }

  return current
}
