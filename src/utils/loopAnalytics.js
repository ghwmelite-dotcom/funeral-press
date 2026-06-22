// Growth-loop event tracking (spec §2.6). The unified trackEvent already
// mirrors every event to GA4 and to the first-party analytics_events table
// (with user_id when a token is passed), so K-factor stays computable in D1.
import { trackEvent } from './analytics'

const SURFACE_KEY = 'fp-loop-surface'

export const LOOP_SURFACES = [
  'memorial_footer',
  'post_condolence',
  'qr_ribbon',
  'referral_dashboard',
  'referral_post_export',
]

export function recordLoopEvent(eventType, surface, metadata = {}, { token } = {}) {
  // token → the D1 row gets user_id, required for the
  // signup → first_design → purchase funnel joins (spec §2.6).
  trackEvent(eventType, { surface, ...metadata }, { token })
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
