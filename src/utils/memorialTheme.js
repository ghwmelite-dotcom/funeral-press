/**
 * Memorial theme helpers — pure, side-effect-free.
 * These utilities gate premium/specialty themes behind `features.allThemes`.
 */

/**
 * Returns true if the given theme key maps to a premium or specialty theme.
 * @param {string} themeKey
 * @param {Record<string, {category: string}>} themesMap  — pass the `themes` object
 * @returns {boolean}
 */
export function isPremiumTheme(themeKey, themesMap) {
  const t = themesMap[themeKey]
  if (!t) return false
  return t.category === 'premium' || t.category === 'specialty'
}

/**
 * Resolve the effective theme for a public memorial page.
 *
 * Rules:
 *  - If `features.allThemes` is truthy the chosen theme is used as-is.
 *  - If the chosen theme is premium/specialty AND the memorial is not entitled,
 *    fall back to the first 'classic' theme found in `themesMap`, or the
 *    `defaultKey` (first key in the map) as a last resort.
 *
 * @param {string}  themeKey    — the memorial's stored theme key
 * @param {object}  features    — entitlement features object (may be `{}`)
 * @param {Record<string, {category: string}>} themesMap
 * @returns {{ themeKey: string, theme: object, fellBack: boolean }}
 */
export function resolveMemorialTheme(themeKey, features, themesMap) {
  const chosen = themesMap[themeKey]
  const allThemes = !!(features && features.allThemes)

  // Theme key is valid AND entitled (or it's a classic theme) — use it
  if (chosen && (allThemes || !isPremiumTheme(themeKey, themesMap))) {
    return { themeKey, theme: chosen, fellBack: false }
  }

  // Find the first classic theme as the fallback
  const classicEntry = Object.entries(themesMap).find(([, t]) => t.category === 'classic')

  if (classicEntry) {
    const [fallbackKey, fallbackTheme] = classicEntry
    return { themeKey: fallbackKey, theme: fallbackTheme, fellBack: true }
  }

  // Ultimate safety net — use the first theme in the map
  const [firstKey, firstTheme] = Object.entries(themesMap)[0]
  return { themeKey: firstKey, theme: firstTheme, fellBack: true }
}
