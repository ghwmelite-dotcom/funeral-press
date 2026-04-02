const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

// Generate a session ID that persists across page navigations but resets on new tab
let sessionId = sessionStorage.getItem('fp-session-id')
if (!sessionId) {
  sessionId = crypto.randomUUID()
  sessionStorage.setItem('fp-session-id', sessionId)
}

/**
 * Track an analytics event. Fire-and-forget, never blocks UI.
 * @param {string} eventType - event identifier (e.g., 'design_started', 'payment_completed')
 * @param {Object} [metadata={}] - additional context (product_type, template_id, etc.)
 */
export function trackEvent(eventType, metadata = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  fetch(`${API_BASE}/analytics/event`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      event_type: eventType,
      session_id: sessionId,
      metadata,
    }),
  }).catch(() => {}) // Silent fail — analytics must never break the app
}

function getToken() {
  try {
    const raw = localStorage.getItem('fp-auth')
    if (raw) {
      const auth = JSON.parse(raw)
      return auth.token || null
    }
  } catch { /* ignore */ }
  return null
}
