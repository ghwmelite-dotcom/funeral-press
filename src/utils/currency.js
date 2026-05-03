// Locale → currency mapping for the donation flow's display currency.
// Server still settles to GHS via FX (see workers/utils/fxRate.js).
const LOCALE_TO_CURRENCY = {
  GH: 'GHS', GB: 'GBP', US: 'USD', CA: 'CAD', NG: 'NGN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  IE: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR',
}

const SYMBOLS = { GHS: 'GHS ', GBP: '£', USD: '$', CAD: 'C$', EUR: '€', NGN: '₦' }

const QUICK_AMOUNTS_MAJOR = {
  GHS: [50, 100, 200, 500],
  GBP: [25, 50, 100, 200],
  USD: [25, 50, 100, 200],
  CAD: [25, 50, 100, 200],
  EUR: [25, 50, 100, 200],
  NGN: [10000, 25000, 50000, 100000],
}

// Best-effort guess from navigator.language. Falls back to GHS for the
// Ghana-first audience. Never throws — UI components can swap to a manual
// picker if the user disagrees.
export function detectCurrency() {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-GH'
  const country = (lang.split('-')[1] || 'GH').toUpperCase()
  return LOCALE_TO_CURRENCY[country] || 'GHS'
}

export function formatMinor(minor, currency) {
  const major = (minor / 100).toFixed(2)
  return `${SYMBOLS[currency] || `${currency} `}${major}`
}

export function quickAmounts(currency) {
  return QUICK_AMOUNTS_MAJOR[currency] || [25, 50, 100, 200]
}

// Major (whole units) → minor (cents/pesewas/pence). Two-decimal currencies only in v1.
export function majorToMinor(major, _currency) {
  const n = parseFloat(major)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}
