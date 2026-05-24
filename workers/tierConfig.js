// Single source of truth for Memorial Page Premium tiers, features, and pricing.
// Imported by workers/auth-api.js. The frontend mirror lives at
// src/config/memorialTiers.js and is kept in sync by a drift test.
export const TIERS = {
  free:    { rank: 0, label: 'Free' },
  premium: { rank: 1, label: 'Premium',  lifetimePesewas: 30000, annualPesewas: 12000,
             planCodeAnnual: 'PAYSTACK_PLAN_MEMORIAL_PREMIUM_ANNUAL' },
  heritage:{ rank: 2, label: 'Heritage', lifetimePesewas: 70000, annualPesewas: 28000,
             planCodeAnnual: 'PAYSTACK_PLAN_MEMORIAL_HERITAGE_ANNUAL' },
}

// Feature → minimum tier rank required to use it.
export const FEATURE_MIN_RANK = {
  unlimitedPhotos: 1, allThemes: 1, tributeVideo: 1, removeBranding: 1, passwordProtect: 1,
  customDomain: 2, multiLanguage: 2,
}

export const FREE_PHOTO_CAP = 10
export const LIVESTREAM_RETENTION_DAYS = { free: 365, premium: 365 * 3, heritage: 365 * 5 }

export function tierHasFeature(tier, feature) {
  const rank = TIERS[tier]?.rank ?? 0
  return rank >= (FEATURE_MIN_RANK[feature] ?? Infinity)
}
