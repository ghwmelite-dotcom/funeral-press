export const RECOMMENDATIONS = {
  Catholic: { tags: ['cross', 'ornate', 'scripture'], templates: ['brochure-001', 'brochure-003', 'booklet-002'] },
  Protestant: { tags: ['cross', 'hymn-layout', 'scripture'], templates: ['brochure-001', 'brochure-003'] },
  Pentecostal: { tags: ['vibrant', 'praise', 'spirit'], templates: ['brochure-004', 'poster-002'] },
  Methodist: { tags: ['cross', 'traditional', 'hymn-layout'], templates: ['brochure-001', 'booklet-001'] },
  Presbyterian: { tags: ['cross', 'traditional', 'elegant'], templates: ['brochure-001', 'booklet-001'] },
  Anglican: { tags: ['cross', 'ornate', 'hymn-layout'], templates: ['brochure-001', 'brochure-003'] },
  Baptist: { tags: ['cross', 'scripture', 'warm'], templates: ['brochure-001', 'brochure-004'] },
  'Seventh-Day Adventist': { tags: ['cross', 'nature', 'scripture'], templates: ['brochure-001', 'brochure-006'] },
  Muslim: { tags: ['geometric', 'crescent', 'green-accent'], templates: ['brochure-005', 'booklet-004'] },
  Traditional: { tags: ['kente', 'adinkra', 'gold-black', 'royal'], templates: ['brochure-002', 'poster-001', 'brochure-007'] },
  'Non-religious': { tags: ['modern', 'minimal', 'nature'], templates: ['brochure-006', 'poster-003'] },
}

/**
 * Get template recommendations based on denomination/cultural context.
 * @param {string} denomination - Religious/cultural denomination
 * @returns {{ tags: string[], templates: string[] } | null}
 */
export function getRecommendations(denomination) {
  if (!denomination) return null
  return RECOMMENDATIONS[denomination] || null
}

/**
 * Check if a template ID is recommended for a denomination.
 * @param {string} templateId
 * @param {string} denomination
 * @returns {boolean}
 */
export function isRecommended(templateId, denomination) {
  const rec = getRecommendations(denomination)
  if (!rec) return false
  return rec.templates.includes(templateId)
}
