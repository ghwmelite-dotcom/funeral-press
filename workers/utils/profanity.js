import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'

// Local extension: common Twi/Ga/Ewe slurs used as insults in Ghanaian funeral contexts.
// Keep this list private; do not echo to users.
// NOTE: This list needs review by a Ghanaian moderation team before public launch.
// Some of these terms have non-insulting colloquial uses; v1 errs on caution.
const LOCAL_DENYLIST = [
  'kwasea',     // Twi: idiot/fool — common slur
  'kwasia',     // alt spelling
  'aboa',       // Twi: animal (used as insult)
  'gyimii',     // Twi: stupid
  // Add more as flagged by moderation team
]

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false
  const lower = text.toLowerCase()

  // Local denylist (whole-word match)
  for (const term of LOCAL_DENYLIST) {
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(lower)) return true
  }

  // Library check (English)
  return matcher.hasMatch(text)
}
