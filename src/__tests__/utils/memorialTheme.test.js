import { describe, it, expect } from 'vitest'
import { isPremiumTheme, resolveMemorialTheme } from '../../utils/memorialTheme'

// ─── Fixture theme map ────────────────────────────────────────────────────────
// Mirrors the real themes.js shape — minimal fields needed for the helpers.

const THEMES = {
  blackGold:      { name: 'Black & Gold',    category: 'classic',   pageBg: '#0A0A0A', heading: '#C9A84C' },
  whiteNavy:      { name: 'White & Navy',    category: 'classic',   pageBg: '#FFFFFF', heading: '#1A2A4A' },
  emeraldSerenity:{ name: 'Emerald Serenity',category: 'premium',   pageBg: '#0D1F17', heading: '#7FB069' },
  royalPurple:    { name: 'Royal Purple',    category: 'premium',   pageBg: '#1A0F2E', heading: '#C4B5E0' },
  kenteRoyal:     { name: 'Kente Royal',     category: 'specialty', pageBg: '#1C0E04', heading: '#C83030' },
  militaryHonor:  { name: 'Military Honor',  category: 'specialty', pageBg: '#0E1A10', heading: '#B8A04C' },
}

// ─── isPremiumTheme ───────────────────────────────────────────────────────────

describe('isPremiumTheme', () => {
  it('returns false for a classic theme', () => {
    expect(isPremiumTheme('blackGold', THEMES)).toBe(false)
  })

  it('returns false for another classic theme', () => {
    expect(isPremiumTheme('whiteNavy', THEMES)).toBe(false)
  })

  it('returns true for a premium theme', () => {
    expect(isPremiumTheme('emeraldSerenity', THEMES)).toBe(true)
  })

  it('returns true for another premium theme', () => {
    expect(isPremiumTheme('royalPurple', THEMES)).toBe(true)
  })

  it('returns true for a specialty theme', () => {
    expect(isPremiumTheme('kenteRoyal', THEMES)).toBe(true)
  })

  it('returns true for another specialty theme', () => {
    expect(isPremiumTheme('militaryHonor', THEMES)).toBe(true)
  })

  it('returns false for an unknown theme key', () => {
    expect(isPremiumTheme('nonExistent', THEMES)).toBe(false)
  })
})

// ─── resolveMemorialTheme ─────────────────────────────────────────────────────

describe('resolveMemorialTheme', () => {
  // ── Entitled (allThemes = true) ────────────────────────────────────────────

  it('returns the premium theme unchanged when allThemes is true', () => {
    const { themeKey, theme, fellBack } = resolveMemorialTheme(
      'emeraldSerenity',
      { allThemes: true },
      THEMES,
    )
    expect(themeKey).toBe('emeraldSerenity')
    expect(theme).toBe(THEMES.emeraldSerenity)
    expect(fellBack).toBe(false)
  })

  it('returns a specialty theme unchanged when allThemes is true', () => {
    const { themeKey, theme, fellBack } = resolveMemorialTheme(
      'kenteRoyal',
      { allThemes: true },
      THEMES,
    )
    expect(themeKey).toBe('kenteRoyal')
    expect(theme).toBe(THEMES.kenteRoyal)
    expect(fellBack).toBe(false)
  })

  // ── Classic theme — always allowed regardless of entitlement ──────────────

  it('returns a classic theme unchanged when allThemes is false', () => {
    const { themeKey, theme, fellBack } = resolveMemorialTheme(
      'blackGold',
      { allThemes: false },
      THEMES,
    )
    expect(themeKey).toBe('blackGold')
    expect(theme).toBe(THEMES.blackGold)
    expect(fellBack).toBe(false)
  })

  it('returns a classic theme unchanged when features is empty {}', () => {
    const { themeKey, theme, fellBack } = resolveMemorialTheme(
      'whiteNavy',
      {},
      THEMES,
    )
    expect(themeKey).toBe('whiteNavy')
    expect(theme).toBe(THEMES.whiteNavy)
    expect(fellBack).toBe(false)
  })

  // ── Non-entitled: premium theme → classic fallback ────────────────────────

  it('falls back to a classic theme for a premium theme when allThemes is false', () => {
    const result = resolveMemorialTheme('emeraldSerenity', { allThemes: false }, THEMES)
    expect(result.fellBack).toBe(true)
    expect(THEMES[result.themeKey].category).toBe('classic')
    expect(result.theme.category).toBe('classic')
    // Must NOT use the originally chosen premium theme's heading color
    expect(result.theme.heading).not.toBe(THEMES.emeraldSerenity.heading)
  })

  it('falls back to a classic theme for a specialty theme when features is empty', () => {
    const result = resolveMemorialTheme('militaryHonor', {}, THEMES)
    expect(result.fellBack).toBe(true)
    expect(result.theme.category).toBe('classic')
  })

  it('falls back to a classic theme for a premium theme when features is null-ish', () => {
    const result = resolveMemorialTheme('royalPurple', null, THEMES)
    expect(result.fellBack).toBe(true)
    expect(result.theme.category).toBe('classic')
  })

  it('falls back to a classic theme when features is undefined', () => {
    const result = resolveMemorialTheme('emeraldSerenity', undefined, THEMES)
    expect(result.fellBack).toBe(true)
    expect(result.theme.category).toBe('classic')
  })

  // ── Unknown theme key ──────────────────────────────────────────────────────

  it('falls back to classic when the chosen themeKey does not exist in the map', () => {
    const result = resolveMemorialTheme('nonExistentTheme', { allThemes: false }, THEMES)
    expect(result.fellBack).toBe(true)
    expect(result.theme.category).toBe('classic')
  })

  it('even with allThemes true, an unknown themeKey falls back (no matching theme to serve)', () => {
    // chosen is undefined so we can't serve it regardless of entitlement
    const { fellBack } = resolveMemorialTheme(
      'ghost',
      { allThemes: true },
      THEMES,
    )
    // A missing theme has no category, so isPremiumTheme returns false — it
    // falls through to the "chosen is undefined" path and also falls back.
    // We don't care which specific branch, just that we get a valid theme.
    // Actually, let's verify the theme returned is always usable:
    expect(fellBack).toBe(true)
  })
})

// ─── Integration: uses real themes.js ─────────────────────────────────────────

describe('resolveMemorialTheme — with real themes.js fixture', () => {
  // Spot-check with the full real themes object to ensure the first classic
  // fallback is always 'blackGold' (the first key whose category is 'classic').
  it('falls back to blackGold (first classic) for free memorial with premium theme', async () => {
    const { themes } = await import('../../utils/themes')
    const { themeKey, theme, fellBack } = resolveMemorialTheme(
      'emeraldSerenity',
      {},
      themes,
    )
    expect(fellBack).toBe(true)
    expect(themeKey).toBe('blackGold')
    expect(theme.category).toBe('classic')
    expect(theme.pageBg).toBe('#0A0A0A') // real blackGold value
  })

  it('renders the premium theme intact for an entitled memorial', async () => {
    const { themes } = await import('../../utils/themes')
    const { themeKey, theme, fellBack } = resolveMemorialTheme(
      'kenteRoyal',
      { allThemes: true },
      themes,
    )
    expect(fellBack).toBe(false)
    expect(themeKey).toBe('kenteRoyal')
    expect(theme.pageBg).toBe('#1C0E04')
  })
})
