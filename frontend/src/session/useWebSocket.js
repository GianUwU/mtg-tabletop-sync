import { useState, useEffect, useRef, useCallback } from 'react'

export function useWebSocket({
  sessionKey,
  serverStateRef,
  pendingActionsRef,
  onStateReconciled,
  onSessionDeleted,
  activeSessionKeyRef,
}) {
  const [connected, setConnected] = useState(false)
  const [clientCount, setClientCount] = useState(1)
  const [activeSessions, setActiveSessions] = useState([])
  const wsRef = useRef(null)

  // Fetch initial list of active sessions
  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.sessions)) {
          setActiveSessions(data.sessions)
        }
      })
      .catch(() => {})
  }, [])

  // Establish WebSocket connection and handle auto-reconnect
  useEffect(() => {
    let reconnectTimeout = null
    let isMounted = true

    pendingActionsRef.current = []
    serverStateRef.current = { players: [] }
    onStateReconciled({ players: [] })

    function connect() {
      if (!isMounted) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/ws?session=${encodeURIComponent(sessionKey)}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isMounted) return
        setConnected(true)
        ws.send(JSON.stringify({ type: 'join', sessionKey }))
      }

      ws.onmessage = (event) => {
        if (!isMounted) return
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'active_sessions' && Array.isArray(data.sessions)) {
            setActiveSessions(data.sessions)
            return
          }

          if (data.type === 'session_deleted') {
            if (onSessionDeleted) onSessionDeleted(data)
            return
          }

          if (data.sessionKey && data.sessionKey !== activeSessionKeyRef.current) {
            return
          }

          if (data.type === 'sync') {
            if (data.state && typeof data.state === 'object') {
              // Stale version check
              const incomingVersion = typeof data.version === 'number' ? data.version : 0
              const currentVersion = typeof serverStateRef.current.version === 'number' ? serverStateRef.current.version : 0

              if (incomingVersion >= currentVersion) {
                serverStateRef.current = { ...data.state, version: incomingVersion }
              } else {
                console.info('Ignored stale sync version', incomingVersion)
                if (typeof data.connectedClients === 'number') {
                  setClientCount(data.connectedClients)
                }
                return
              }

              // Acknowledge processed action and prune
              if (data.ackActionId) {
                pendingActionsRef.current = pendingActionsRef.current.filter(
                  (a) => a.actionId !== data.ackActionId
                )
              }

              // Prune stale actions older than 8 seconds
              const now = Date.now()
              pendingActionsRef.current = pendingActionsRef.current.filter(
                (a) => now - a.timestamp < 8000
              )

              onStateReconciled(serverStateRef.current)
            }

            if (typeof data.connectedClients === 'number') {
              setClientCount(data.connectedClients)
            }
          } else if (data.type === 'presence') {
            if (typeof data.connectedClients === 'number') {
              setClientCount(data.connectedClients)
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e)
        }
      }

      ws.onclose = () => {
        if (!isMounted) return
        setConnected(false)
        reconnectTimeout = setTimeout(connect, 1000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (wsRef.current) wsRef.current.close()
    }
  }, [sessionKey, onStateReconciled, onSessionDeleted, activeSessionKeyRef, pendingActionsRef, serverStateRef])

  const sendRawMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return {
    connected,
    clientCount,
    activeSessions,
    setActiveSessions,
    sendRawMessage,
  }
}
