/**
 * Generate a random 4-digit numeric room code string
 */
export function generate4DigitCode() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Generate a unique optimistic action ID
 */
export function generateActionId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Determine the initial session key from URL query param, path, hash, or generate a new code.
 */
export function getInitialSessionKey() {
  if (typeof window === 'undefined') return '1000'

  const searchParams = new URLSearchParams(window.location.search)
  const queryParam = searchParams.get('session') || searchParams.get('s')
  if (queryParam && queryParam.trim()) {
    return queryParam.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (path && path !== 'index.html' && path !== 'main') {
    return path.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash && hash !== 'main') {
    return hash.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  const randomKey = generate4DigitCode()
  const url = new URL(window.location.href)
  url.searchParams.set('session', randomKey)
  window.history.replaceState({}, '', url)
  return randomKey
}
