// Unified analytics — every event is sent to BOTH GA4 and the first-party D1
// pipeline (POST /analytics/event), with marketing attribution attached.
//
// Previously two siloed pipelines existed: GA4-only (events.*) and D1-only
// (the old trackEvent.js). That meant GA4 saw traffic with zero conversions
// while D1 saw conversions with no channel — making ad spend unattributable.
// This module is now the single source of truth; trackEvent.js re-exports it.

import { getAttribution } from './attribution'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

// Session id: stable across navigations within a tab, resets on a new tab.
function getSessionId() {
  try {
    let id = sessionStorage.getItem('fp-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('fp-session-id', id)
    }
    return id
  } catch {
    return null
  }
}

function getToken() {
  try {
    const raw = localStorage.getItem('fp-auth')
    if (raw) return JSON.parse(raw).accessToken || JSON.parse(raw).token || null
  } catch { /* ignore */ }
  return null
}

// Don't record prerender/headless/bot loads (puppeteer sets navigator.webdriver)
// — they would inflate traffic counts and pollute the funnel.
function isTrackable() {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false
  return true
}

/**
 * Track an event to GA4 + D1. Fire-and-forget; never blocks or throws into UI.
 * @param {string} eventName  e.g. 'signup_completed', 'payment_completed'
 * @param {Object} [params]   event params / metadata
 * @param {Object} [opts]     { token } to attach a specific auth token (so the
 *                            D1 row gets user_id for funnel joins)
 */
export function trackEvent(eventName, params = {}, { token } = {}) {
  if (!isTrackable()) return
  const attribution = getAttribution()
  const enriched = { ...params, ...attribution }

  // GA4 — lets conversions be marked and imported into Google/Meta Ads.
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, enriched)
    }
  } catch { /* ignore */ }

  // First-party D1 — channel→conversion is queryable in our own database.
  try {
    const headers = { 'Content-Type': 'application/json' }
    const authToken = token || getToken()
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    fetch(`${API_BASE}/analytics/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventName,
        session_id: getSessionId(),
        metadata: enriched,
      }),
      keepalive: true,
    }).catch(() => {}) // analytics must never break the app
  } catch { /* ignore */ }
}

// Named conversion/product events. All route through the unified trackEvent, so
// each now reaches BOTH GA4 and D1.
export const events = {
  sessionStarted: () => trackEvent('session_started'),
  signupCompleted: (method) => trackEvent('signup_completed', { method }),
  brochureStarted: (product) => trackEvent('brochure_started', { product }),
  brochureCompleted: (format) => trackEvent('brochure_completed', { format }),
  paymentCompleted: (params) => trackEvent('payment_completed', params),
  donationCompleted: (params) => trackEvent('donation_completed', params),
  memorialPageCreated: () => trackEvent('memorial_page_created'),
  memorialPageShared: (method) => trackEvent('memorial_page_shared', { method }),
  obituaryCreated: () => trackEvent('obituary_created'),
  budgetPlannerUsed: () => trackEvent('budget_planner_used'),
  qrCodeGenerated: () => trackEvent('qr_code_generated'),
  referralLinkShared: (method) => trackEvent('referral_link_shared', { method }),
  themeSelected: (theme) => trackEvent('theme_selected', { theme }),
}
