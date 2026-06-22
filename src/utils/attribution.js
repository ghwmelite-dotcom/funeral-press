// Marketing attribution capture.
//
// Without this, a paid/organic visitor's channel (utm_source/medium/campaign,
// gclid, fbclid, referrer) is never recorded, so conversions can't be tied back
// to the campaign that produced them. We capture on first load and ride the
// attribution along in every analytics event's metadata (queryable in D1 via
// json_extract) and in GA4 event params.
//
// First-touch (the campaign that originally acquired the visitor) is persisted
// in localStorage so it survives across sessions. Last-touch (the most recent
// campaign) lives in sessionStorage. Both are reported so the marketer can do
// first- or last-touch attribution.

const FIRST_KEY = 'fp-attribution-first'
const LAST_KEY = 'fp-attribution-last'

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const CLICK_IDS = ['gclid', 'fbclid', 'ttclid', 'msclkid']

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode / SSR) — attribution is best-effort */
  }
}

/**
 * Parse campaign params from a query string. Returns null when there's nothing
 * campaign-related to record (a plain organic/direct visit), so we don't
 * overwrite a real first-touch with an empty object on later navigations.
 */
function parseTouch(search) {
  const params = new URLSearchParams(search || '')
  const touch = {}
  for (const k of UTM_PARAMS) {
    const v = params.get(k)
    if (v) touch[k] = v.slice(0, 200)
  }
  for (const k of CLICK_IDS) {
    const v = params.get(k)
    if (v) touch[k] = v.slice(0, 200)
  }
  // Referral/share/partner codes the app already understands are useful channel
  // signals too.
  for (const k of ['ref', 'share', 'partner', 'from', 'src']) {
    const v = params.get(k)
    if (v) touch[`p_${k}`] = v.slice(0, 200)
  }
  return Object.keys(touch).length ? touch : null
}

/**
 * Capture attribution from the current URL. Call once on app init, before any
 * events fire. Idempotent and safe to call on every load.
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return
  const touch = parseTouch(window.location.search)

  // Last-touch: overwrite each session a campaign param appears.
  if (touch) {
    writeJson(sessionStorage, LAST_KEY, {
      ...touch,
      landing_path: window.location.pathname,
      ts: new Date().toISOString(),
    })
  }

  // First-touch: only set once, ever, for this browser.
  if (touch && !readJson(localStorage, FIRST_KEY)) {
    writeJson(localStorage, FIRST_KEY, {
      ...touch,
      landing_path: window.location.pathname,
      referrer: (document.referrer || '').slice(0, 300),
      ts: new Date().toISOString(),
    })
  }
}

/**
 * Flattened attribution to merge into an event's metadata / GA4 params.
 * Last-touch keys are bare (utm_source); first-touch keys are prefixed
 * (first_utm_source) so both are queryable without collision.
 */
export function getAttribution() {
  if (typeof window === 'undefined') return {}
  const out = {}
  const last = readJson(sessionStorage, LAST_KEY)
  const first = readJson(localStorage, FIRST_KEY)
  if (last) {
    for (const [k, v] of Object.entries(last)) {
      if (k === 'ts') continue
      out[k] = v
    }
  }
  if (first) {
    for (const [k, v] of Object.entries(first)) {
      if (k === 'ts') continue
      out[`first_${k}`] = v
    }
  }
  return out
}
