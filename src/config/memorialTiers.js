// Frontend mirror of workers/tierConfig.js — must stay identical (separate
// build context); enforced by the drift test in
// src/config/__tests__/memorialTiers.test.js.
export const TIERS = {
  free: { rank: 0, label: 'Free' },
  premium: {
    rank: 1,
    label: 'Premium',
    lifetimePesewas: 30000,
    annualPesewas: 12000,
    planCodeAnnual: 'PAYSTACK_PLAN_MEMORIAL_PREMIUM_ANNUAL',
  },
  heritage: {
    rank: 2,
    label: 'Heritage',
    lifetimePesewas: 70000,
    annualPesewas: 28000,
    planCodeAnnual: 'PAYSTACK_PLAN_MEMORIAL_HERITAGE_ANNUAL',
  },
}

// Feature → minimum tier rank required to use it.
export const FEATURE_MIN_RANK = {
  unlimitedPhotos: 1,
  allThemes: 1,
  tributeVideo: 1,
  removeBranding: 1,
  passwordProtect: 1,
  customDomain: 2,
  multiLanguage: 2,
}

export const FREE_PHOTO_CAP = 10
export const LIVESTREAM_RETENTION_DAYS = { free: 365, premium: 1095, heritage: 1825 } // 1 / 3 / 5 years

// Unknown tier degrades to free (rank 0); unknown feature is never granted.
export function tierHasFeature(tier, feature) {
  const rank = TIERS[tier]?.rank ?? 0
  return rank >= (FEATURE_MIN_RANK[feature] ?? Infinity)
}

// Returns the slice of gallery photos visible on a public surface.
// Premium/heritage get all photos; free tier is capped at FREE_PHOTO_CAP.
// Never mutates storage — display-only.
export function visibleGalleryPhotos(photos, features) {
  const all = photos ?? []
  if (features?.unlimitedPhotos) return all
  return all.slice(0, FREE_PHOTO_CAP)
}
