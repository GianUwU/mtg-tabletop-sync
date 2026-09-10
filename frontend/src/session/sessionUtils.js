const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Generate a random 4-character alphanumeric room code (0-9, A-Z)
 */
export function generate4DigitCode() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += ALPHANUMERIC_CHARS[bytes[i] % ALPHANUMERIC_CHARS.length]
    }
    return code
  }
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += ALPHANUMERIC_CHARS[Math.floor(Math.random() * ALPHANUMERIC_CHARS.length)]
  }
  return code
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
  if (typeof window === 'undefined') return 'A1B2'

  const searchParams = new URLSearchParams(window.location.search)
  const queryParam = searchParams.get('session') || searchParams.get('s')
  if (queryParam && queryParam.trim()) {
    return queryParam.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 32)
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (path && path !== 'index.html' && path !== 'main') {
    return path.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 32)
  }

  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash && hash !== 'main') {
    return hash.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 32)
  }

  const randomKey = generate4DigitCode()
  const url = new URL(window.location.href)
  url.searchParams.set('session', randomKey)
  window.history.replaceState({}, '', url)
  return randomKey
}
