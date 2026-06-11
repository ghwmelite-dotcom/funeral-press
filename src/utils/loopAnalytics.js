// Growth-loop event tracking (spec §2.6) — mirrors every event to GA4 and to
// the first-party analytics_events table so K-factor is computable in D1.
import { trackEvent } from './analytics'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'
const SURFACE_KEY = 'fp-loop-surface'

export const LOOP_SURFACES = [
  'memorial_footer',
  'post_condolence',
  'qr_ribbon',
  'referral_dashboard',
  'referral_post_export',
]

export function recordLoopEvent(eventType, surface, metadata = {}, { token } = {}) {
  trackEvent(eventType, { surface, ...metadata })
  try {
    const headers = { 'Content-Type': 'application/json' }
    // With a token, /analytics/event stores user_id — required for the
    // signup → first_design → purchase funnel joins (spec §2.6).
    if (token) headers.Authorization = `Bearer ${token}`
    fetch(`${API_BASE}/analytics/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ event_type: eventType, metadata: { surface, ...metadata } }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* never break the page for analytics */ }
}

export function captureLoopSurface(surface) {
  if (!LOOP_SURFACES.includes(surface)) return
  try { localStorage.setItem(SURFACE_KEY, surface) } catch { /* ignore */ }
}

export function getStoredLoopSurface() {
  try { return localStorage.getItem(SURFACE_KEY) } catch { return null }
}

export function clearStoredLoopSurface() {
  try { localStorage.removeItem(SURFACE_KEY) } catch { /* ignore */ }
}
