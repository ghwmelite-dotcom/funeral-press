# Ghanaian Visual Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved "Adinkra Radiance, Ceremonially Framed" identity (spec: `docs/superpowers/specs/2026-06-12-ghanaian-identity-design.md`) to all public surfaces in both themes.

**Architecture:** A new `src/styles/ceremonial.css` adds the ceremonial token layer following the existing `tokens.css` convention (**dark is the default theme**; light overrides via `[data-theme="light"]` — note this is the reverse of the spec table's column order). A four-component ceremonial kit (`src/components/ceremonial/`) renders bands, marks, dividers, and the hero effect field, reusing the keyframes that already exist in `src/index.css` (aurora-drift, twinkle, shimmer-sweep, shimmer — all already covered by the `prefers-reduced-motion` block there). Pages then apply the kit via a documented per-page-type recipe, with full code given for one exemplar of each page type. An owner sign-off gate on the still-running visual companion validates the Adinkra renditions before the application sweep.

**Tech Stack:** React 19, CSS custom properties (HSL-triplet house style not required for the ceremonial layer — these are fixed hex values per the approved mockups), Tailwind arbitrary values, Vitest + Testing Library.

---

## Constraints carried from the spec (enforce in every task)

- Gold never carries body text (labels/accents/≥24px display only). Bands and aurora are `aria-hidden`; Adinkra marks carry `aria-label` with name + meaning.
- CSS-only animation; max two blur layers per page; ≤6 twinkles; everything silenced by the existing reduced-motion block (new animation classes must be ADDED to that block if they don't reuse existing `.animate-*` classes).
- Excluded surfaces (memorials, guest books, obituaries, editors, MyDesigns, partner/admin, donations) must be pixel-unchanged.
- Components read tokens, never raw hex (the hexes live once, in `ceremonial.css`).

### Page-type recipe (referenced by Tasks 6–8)

| Page type | Treatment |
|---|---|
| Hero page (Landing, Honour) | `AuroraField` behind hero, `AdinkraMark variant="watermark"` right side, kente `KenteBand size="page"` under the header zone, `shimmer-text` on the headline's second line (dark only — light uses plain ink), gold-gradient primary CTA |
| Content/landing page (product ×4, Region, Diaspora) | `KenteBand size="page"` at top of page content, `CeremonialDivider` between major sections (max 2/page), ceremonial canvas/ink classes on wrapper |
| Library/list page (HymnLibrary, BlogIndex) | `KenteBand size="page"` at top, `KenteBand size="card"` atop each card/entry tile, `CeremonialDivider` before footer area |
| Detail page (HymnPage, BlogPost) | `CeremonialDivider` under the H1 block with the page-type's symbol (Sankofa for hymns/blog), `KenteBand size="card"` on related-item cards |
| Dialog (Checkout, Upgrade) | `KenteBand size="card"` as the dialog's top edge, gold-gradient confirm CTA via tokens |

Symbol assignments (spec §4): Adinkrahene = Landing/Region/Diaspora/dividers default; Gye Nyame = Honour + memorial-product landing page; Sankofa = Hymns/Blog/anniversary content.

---

### Task 1: Ceremonial token layer

**Files:**
- Create: `src/styles/ceremonial.css`
- Modify: `src/index.css` (import + reduced-motion additions)

- [ ] **Step 1: Create `src/styles/ceremonial.css`** (dark default, matching `tokens.css`'s `:root, [data-theme="dark"]` / `[data-theme="light"]` convention):

```css
/* =============================================================================
   Ceremonial layer — "Adinkra Radiance, Ceremonially Framed"
   Spec: docs/superpowers/specs/2026-06-12-ghanaian-identity-design.md
   Fixed hex values locked via owner-approved mockups. Components read these
   tokens only — never raw hex. Dark is the default theme (house convention).
   ============================================================================= */
:root,
[data-theme="dark"] {
  --ceremonial-canvas: #08080C;
  --ceremonial-surface: #0e0e13;
  --ceremonial-ink: #f0e6d2;
  --ceremonial-ink-strong: #f5edda;
  --ceremonial-ink-muted: #9b8e74;
  --ceremonial-gold: #E8C766;
  --ceremonial-gold-soft: #C9A24B;
  --ceremonial-border: #26211a;
  --kente-gold: #E8C766;
  --kente-burgundy: #a13a45;
  --kente-green: #2d7a47;
  --kente-void: #000000;
  --ceremonial-cta-bg: linear-gradient(135deg, #F6E2A0, #C9A24B);
  --ceremonial-cta-text: #1a1408;
  --ceremonial-aurora-gold: rgba(232, 199, 102, 0.20);
  --ceremonial-aurora-accent: rgba(161, 58, 69, 0.13);
  --ceremonial-watermark-opacity: 0.09;
}

[data-theme="light"] {
  --ceremonial-canvas: #faf6ee;
  --ceremonial-surface: #fffdf8;
  --ceremonial-ink: #241f17;
  --ceremonial-ink-strong: #241f17;
  --ceremonial-ink-muted: #6e6354;
  --ceremonial-gold: #9a7b1c;
  --ceremonial-gold-soft: #c8b572;
  --ceremonial-border: #eee3cc;
  --kente-gold: #b8860b;
  --kente-burgundy: #7a2c35;
  --kente-green: #1e5631;
  --kente-void: #241f17;
  --ceremonial-cta-bg: #241f17;
  --ceremonial-cta-text: #f3e9c9;
  /* Light mode aurora = "gold mist": lower opacity, no accent blob */
  --ceremonial-aurora-gold: rgba(154, 123, 28, 0.10);
  --ceremonial-aurora-accent: rgba(154, 123, 28, 0.05);
  --ceremonial-watermark-opacity: 0.07;
}

/* Kente weave — one gradient definition, both sizes consume it */
:root {
  --kente-weave: repeating-linear-gradient(
    90deg,
    var(--kente-gold) 0 26px, var(--kente-void) 26px 32px,
    var(--kente-burgundy) 32px 58px, var(--kente-void) 58px 64px,
    var(--kente-green) 64px 90px, var(--kente-void) 90px 96px
  );
}

/* Shimmer headline treatment (dark theme; light renders plain ink) */
.shimmer-text {
  background: linear-gradient(110deg, #C9A24B 0%, #E8C766 28%, #FFF4D6 50%, #E8C766 72%, #C9A24B 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 6s linear infinite;
}
[data-theme="light"] .shimmer-text {
  background: none;
  color: var(--ceremonial-ink);
  animation: none;
}

/* Ceremonial page wrapper conveniences */
.ceremonial-canvas { background-color: var(--ceremonial-canvas); color: var(--ceremonial-ink); }
.ceremonial-surface { background-color: var(--ceremonial-surface); border-color: var(--ceremonial-border); }
```

- [ ] **Step 2: Import it.** In `src/index.css`, find how `src/styles/tokens.css` is imported (grep `tokens.css`) and add the ceremonial import immediately after it, same syntax. Then add `.shimmer-text` to the existing `prefers-reduced-motion` block (the other animation classes the kit uses — `.animate-aurora-drift`, `.animate-twinkle`, `.animate-shimmer-sweep` — are already silenced there):

```css
@media (prefers-reduced-motion: reduce) {
  /* append to the existing selector list: */
  .shimmer-text { animation: none !important; }
}
```

(If the existing block is a single selector list, append `.shimmer-text` to it rather than adding a second block.)

- [ ] **Step 3:** `npm run lint` clean, `npm run build` green (CSS parse check), `npx vitest run` no regressions.
- [ ] **Step 4: Commit**

```bash
git add src/styles/ceremonial.css src/index.css
git commit -m "feat(identity): ceremonial token layer for both themes"
```

---

### Task 2: AdinkraMark (TDD)

**Files:**
- Create: `src/components/ceremonial/AdinkraMark.jsx`
- Test: `src/components/ceremonial/__tests__/AdinkraMark.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// src/components/ceremonial/__tests__/AdinkraMark.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdinkraMark, { ADINKRA_SYMBOLS } from '../AdinkraMark.jsx'

describe('AdinkraMark', () => {
  it('declares the three spec symbols with meanings', () => {
    expect(Object.keys(ADINKRA_SYMBOLS)).toEqual(['adinkrahene', 'gyenyame', 'sankofa'])
    for (const s of Object.values(ADINKRA_SYMBOLS)) {
      expect(s.name.length).toBeGreaterThan(3)
      expect(s.meaning.length).toBeGreaterThan(10)
    }
  })

  it('renders an accessible mark with name and meaning', () => {
    render(<AdinkraMark symbol="adinkrahene" />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toMatch(/Adinkrahene/i)
    expect(img.getAttribute('aria-label')).toMatch(/greatness/i)
  })

  it('watermark variant is decorative (hidden) and larger', () => {
    const { container } = render(<AdinkraMark symbol="sankofa" variant="watermark" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('throws nothing and renders null for unknown symbols', () => {
    const { container } = render(<AdinkraMark symbol="nope" />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** (`npx vitest run src/components/ceremonial/__tests__/AdinkraMark.test.jsx`)
- [ ] **Step 3: Implement**

```jsx
// src/components/ceremonial/AdinkraMark.jsx
// Adinkra symbols rendered as inline SVG, always with their meaning attached
// (spec §4: symbols are used with meaning, never as wallpaper). Marks are
// labeled; watermarks are decorative backdrop and therefore aria-hidden.
// Renditions are geometric simplifications of the canonical forms — validated
// by the owner at the Task 5 visual gate.

export const ADINKRA_SYMBOLS = {
  adinkrahene: {
    name: 'Adinkrahene',
    meaning: 'greatness, leadership, and charisma — the chief of the Adinkra symbols',
    render: (stroke) => (
      <>
        <circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeWidth="6" />
        <circle cx="50" cy="50" r="31" fill="none" stroke={stroke} strokeWidth="6" />
        <circle cx="50" cy="50" r="16" fill="none" stroke={stroke} strokeWidth="6" />
        <circle cx="50" cy="50" r="5" fill={stroke} />
      </>
    ),
  },
  gyenyame: {
    name: 'Gye Nyame',
    meaning: 'except for God — the supremacy and omnipotence of God',
    render: (stroke) => (
      <>
        {/* central sweeping column with terminal curls */}
        <path
          d="M38 12 C58 12 64 24 56 34 C50 41 42 44 42 52 C42 60 50 63 56 70 C64 80 58 88 38 88"
          fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round"
        />
        {/* knobbed protrusions, four per side */}
        <circle cx="68" cy="22" r="6" fill={stroke} />
        <circle cx="74" cy="40" r="6" fill={stroke} />
        <circle cx="74" cy="60" r="6" fill={stroke} />
        <circle cx="68" cy="78" r="6" fill={stroke} />
        <circle cx="22" cy="26" r="6" fill={stroke} />
        <circle cx="17" cy="44" r="6" fill={stroke} />
        <circle cx="17" cy="62" r="6" fill={stroke} />
        <circle cx="22" cy="80" r="6" fill={stroke} />
      </>
    ),
  },
  sankofa: {
    name: 'Sankofa',
    meaning: 'go back and retrieve it — learning from the past, remembrance',
    render: (stroke) => (
      <>
        {/* stylized heart form with inward-turning crowns */}
        <path
          d="M50 90 C26 70 12 52 14 36 C16 24 26 18 36 22 C44 25 48 33 50 40 C52 33 56 25 64 22 C74 18 84 24 86 36 C88 52 74 70 50 90 Z"
          fill="none" stroke={stroke} strokeWidth="7" strokeLinejoin="round"
        />
        <path d="M36 22 C32 14 38 8 45 11" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <path d="M64 22 C68 14 62 8 55 11" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
  },
}

const SIZES = { mark: 20, watermark: 280 }

export default function AdinkraMark({ symbol, variant = 'mark', className = '', style = {} }) {
  const def = ADINKRA_SYMBOLS[symbol]
  if (!def) return null

  const size = SIZES[variant] || SIZES.mark
  const decorative = variant === 'watermark'

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={decorative ? { opacity: 'var(--ceremonial-watermark-opacity)', ...style } : style}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : `${def.name} — ${def.meaning}`}
    >
      {def.render('var(--ceremonial-gold)')}
      {!decorative && <title>{`${def.name}: ${def.meaning}`}</title>}
    </svg>
  )
}
```

- [ ] **Step 4: Run — expect PASS (4 tests).**
- [ ] **Step 5: Commit**

```bash
git add src/components/ceremonial/AdinkraMark.jsx src/components/ceremonial/__tests__/AdinkraMark.test.jsx
git commit -m "feat(identity): AdinkraMark with labeled meanings and watermark variant"
```

---

### Task 3: KenteBand + CeremonialDivider (TDD)

**Files:**
- Create: `src/components/ceremonial/KenteBand.jsx`, `src/components/ceremonial/CeremonialDivider.jsx`, `src/components/ceremonial/index.js`
- Test: `src/components/ceremonial/__tests__/bandsAndDividers.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// src/components/ceremonial/__tests__/bandsAndDividers.test.jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import KenteBand from '../KenteBand.jsx'
import CeremonialDivider from '../CeremonialDivider.jsx'

describe('KenteBand', () => {
  it('is decorative and sized by variant', () => {
    const { container, rerender } = render(<KenteBand size="page" />)
    const band = container.firstChild
    expect(band.getAttribute('aria-hidden')).toBe('true')
    expect(band.style.height).toBe('6px')
    rerender(<KenteBand size="card" />)
    expect(container.firstChild.style.height).toBe('4px')
    rerender(<KenteBand size="ribbon" />)
    expect(container.firstChild.style.width).toBe('140px')
  })
})

describe('CeremonialDivider', () => {
  it('renders hairlines around a labeled Adinkra mark', () => {
    const { container, getByRole } = render(<CeremonialDivider symbol="sankofa" />)
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/Sankofa/i)
    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2)
  })
  it('defaults to adinkrahene', () => {
    const { getByRole } = render(<CeremonialDivider />)
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/Adinkrahene/i)
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement**

```jsx
// src/components/ceremonial/KenteBand.jsx
// The woven kente strip — purely decorative ceremonial framing (spec §2.2/§3).
const SIZES = {
  page: { height: '6px', width: '100%' },
  card: { height: '4px', width: '100%' },
  ribbon: { height: '5px', width: '140px', borderRadius: '2px' },
}

export default function KenteBand({ size = 'page', className = '', style = {} }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ ...SIZES[size] || SIZES.page, background: 'var(--kente-weave)', ...style }}
    />
  )
}
```

```jsx
// src/components/ceremonial/CeremonialDivider.jsx
// Gold hairlines flanking an Adinkra mark — section punctuation (max 2/page).
import AdinkraMark from './AdinkraMark.jsx'

export default function CeremonialDivider({ symbol = 'adinkrahene', className = '' }) {
  return (
    <div className={`flex items-center gap-3.5 my-8 ${className}`}>
      <div aria-hidden="true" className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--ceremonial-gold-soft))' }} />
      <AdinkraMark symbol={symbol} variant="mark" style={{ opacity: 0.8 }} />
      <div aria-hidden="true" className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--ceremonial-gold-soft), transparent)' }} />
    </div>
  )
}
```

```javascript
// src/components/ceremonial/index.js
export { default as KenteBand } from './KenteBand.jsx'
export { default as AdinkraMark, ADINKRA_SYMBOLS } from './AdinkraMark.jsx'
export { default as CeremonialDivider } from './CeremonialDivider.jsx'
export { default as AuroraField } from './AuroraField.jsx'
```

(The barrel references `AuroraField` from Task 4 — create the barrel in Task 4's commit if the linter rejects the missing file now; otherwise create it here and add the export in Task 4. State which you did.)

- [ ] **Step 4: Run — expect PASS (3 tests).**
- [ ] **Step 5: Commit**

```bash
git add src/components/ceremonial/
git commit -m "feat(identity): KenteBand and CeremonialDivider"
```

---

### Task 4: AuroraField (TDD)

**Files:**
- Create: `src/components/ceremonial/AuroraField.jsx`
- Test: `src/components/ceremonial/__tests__/AuroraField.test.jsx`

- [ ] **Step 1: Failing test**

```jsx
// src/components/ceremonial/__tests__/AuroraField.test.jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AuroraField from '../AuroraField.jsx'

describe('AuroraField', () => {
  it('renders exactly two aurora blobs, one sweep, and at most six twinkles', () => {
    const { container } = render(<AuroraField twinkles={9} />)
    expect(container.querySelectorAll('[data-aurora]').length).toBe(2)
    expect(container.querySelectorAll('[data-sweep]').length).toBe(1)
    expect(container.querySelectorAll('[data-twinkle]').length).toBe(6) // capped
  })
  it('is entirely decorative', () => {
    const { container } = render(<AuroraField />)
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
  })
  it('omits twinkles when mist mode is forced', () => {
    const { container } = render(<AuroraField mist />)
    expect(container.querySelectorAll('[data-twinkle]').length).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** (reuses the existing `.animate-aurora-drift`, `.animate-shimmer-sweep`, `.animate-twinkle` classes from `src/index.css` — already reduced-motion-silenced):

```jsx
// src/components/ceremonial/AuroraField.jsx
// The hero's living-light layer (spec §5 budget: 2 blur layers, ≤6 twinkles,
// CSS-only). Colors come from tokens, so light mode automatically renders the
// softened "gold mist" (and callers pass `mist` to drop twinkles there too —
// the page reads the theme store and sets it).
const TWINKLE_POSITIONS = [
  { top: '22%', left: '14%', s: 3, d: '0s' },
  { top: '64%', left: '38%', s: 2, d: '1.2s' },
  { top: '30%', left: '70%', s: 3, d: '2.1s' },
  { top: '75%', left: '82%', s: 2, d: '0.6s' },
  { top: '48%', left: '8%', s: 2, d: '2.8s' },
  { top: '14%', left: '52%', s: 2, d: '1.7s' },
]

export default function AuroraField({ twinkles = 4, mist = false }) {
  const count = mist ? 0 : Math.min(twinkles, 6)
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        data-aurora
        className="absolute rounded-full animate-aurora-drift"
        style={{ width: 480, height: 480, top: -180, right: -120, background: 'radial-gradient(circle, var(--ceremonial-aurora-gold), transparent 60%)', filter: 'blur(80px)' }}
      />
      <div
        data-aurora
        className="absolute rounded-full animate-aurora-drift"
        style={{ width: 380, height: 380, bottom: -180, left: -140, background: 'radial-gradient(circle, var(--ceremonial-aurora-accent), transparent 60%)', filter: 'blur(80px)', animationDelay: '5s' }}
      />
      <div className="absolute inset-0 overflow-hidden">
        <div
          data-sweep
          className="absolute inset-y-0 w-1/3 animate-shimmer-sweep"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.045), transparent)' }}
        />
      </div>
      {TWINKLE_POSITIONS.slice(0, count).map((p, i) => (
        <span
          key={i}
          data-twinkle
          className="absolute rounded-full animate-twinkle"
          style={{ top: p.top, left: p.left, width: p.s, height: p.s, background: 'var(--ceremonial-gold)', boxShadow: '0 0 8px 1px var(--ceremonial-aurora-gold)', animationDelay: p.d }}
        />
      ))}
    </div>
  )
}
```

Add the `AuroraField` export to `src/components/ceremonial/index.js` if Task 3 deferred it.

- [ ] **Step 4: Run — expect PASS (3 tests).** Full suite green.
- [ ] **Step 5: Commit**

```bash
git add src/components/ceremonial/
git commit -m "feat(identity): AuroraField hero effect layer within the spec performance budget"
```

---

### Task 5: OWNER GATE — kit preview on the visual companion (controller step)

**This task is executed by the CONTROLLER, not a subagent.** The visual-companion server from the brainstorm may still be running (session `.superpowers/brainstorm/85832-1781294576/`; restart via the brainstorming skill's `scripts/start-server.sh` if it idle-stopped). Push a screen rendering: all three `AdinkraMark` symbols at mark + watermark sizes, `KenteBand` in all three sizes, `CeremonialDivider`, and `AuroraField` — each on BOTH theme canvases (hardcode the two token sets inline for the preview). Ask the owner specifically: **"Do the Gye Nyame and Sankofa renditions read as authentic?"**

- If approved → proceed to Task 6.
- If Gye Nyame is rejected → recorded fallback: swap its two usages (Honour page, memorial product page) to `adinkrahene` and remove `gyenyame` from `ADINKRA_SYMBOLS` (update Task 2's test symbol list accordingly); proceed.
- If Sankofa is rejected → same pattern: fall back to `adinkrahene` for hymns/blog and remove the symbol.

No commit (preview only) unless a fallback edit is made (commit message: `fix(identity): adinkra rendition fallback per owner review`).

---

### Task 6: Apply — chrome, LandingPage hero, HonourPage

**Files:**
- Modify: `src/components/layout/SiteHeader.jsx`, `src/pages/LandingPage.jsx`, `src/pages/HonourPage.jsx`

- [ ] **Step 1: SiteHeader kente band.** SiteHeader already renders only on public routes (it gates on `SHOW_PREFIXES` + `isHome`), so the band is inherently public-scoped. Read the component; render `<KenteBand size="page" />` as the LAST child of the header element (sitting on its bottom edge), EXCEPT while `transparent` is true on the homepage hero overlay (`{!transparent && <KenteBand size="page" />}`) so the hero stays clean until scroll.
- [ ] **Step 2: LandingPage hero — tokenize and ceremonialize.** This hero currently hardcodes dark hex values (`#08080C`, gold rgba blobs, `#E8C766`-family gradients) and is therefore dark in BOTH themes. Changes (read lines ~485–650 fully first):
  1. Replace the hero section's background hex with `var(--ceremonial-canvas)` and its text hexes with the matching ceremonial tokens (`#f5edda`-family → `var(--ceremonial-ink-strong)`, muted grays → `var(--ceremonial-ink-muted)`, gold accents → `var(--ceremonial-gold)`); the bottom fade gradient's target color also becomes `var(--ceremonial-canvas)`.
  2. Replace the hero's existing inline aurora/twinkle/sweep stack with `<AuroraField twinkles={4} mist={theme === 'light'} />` (the page already has `useThemeStore` access — verify; add if absent).
  3. Add `<AdinkraMark symbol="adinkrahene" variant="watermark" className="absolute right-[-40px] top-1/2 -translate-y-1/2" />` inside the hero's relative container.
  4. Keep the existing `animate-shimmer` headline treatment in dark; it already matches `.shimmer-text` (leave the existing markup if equivalent — do NOT double-apply).
  5. The primary CTA's gradient/colors move to `var(--ceremonial-cta-bg)` / `var(--ceremonial-cta-text)`.
- [ ] **Step 3: HonourPage** (hero-page recipe with Gye Nyame): wrapper gets `ceremonial-canvas`; add `<AuroraField mist={theme === 'light'} twinkles={3} />` + `<AdinkraMark symbol="gyenyame" variant="watermark" ... />` to the hero block; `<KenteBand size="page" />` directly under the hero; the pathway cards get `<KenteBand size="card" />` top edges (cards become `overflow-hidden`); the existing heart icon + hairline motif stays.
- [ ] **Step 4:** `npx vitest run` (HonourPage tests must still pass — headline/link assertions unchanged), `npm run lint`, `npm run build`. Visually check both themes via `npm run dev` screenshots if feasible; otherwise note for the controller gate.
- [ ] **Step 5: Commit**

```bash
git add src/components/layout/SiteHeader.jsx src/pages/LandingPage.jsx src/pages/HonourPage.jsx
git commit -m "feat(identity): ceremonial chrome, tokenized landing hero, honour page treatment"
```

---

### Task 7: Apply — content, library, and detail pages

**Files:**
- Modify: `src/pages/landing/BrochureDesignerPage.jsx`, `PosterMakerPage.jsx`, `MemorialCreatorPage.jsx`, `ProgrammeBookletPage.jsx`, `src/pages/RegionPage.jsx`, `src/pages/landing/DiasporaPage.jsx`, `src/pages/HymnLibraryPage.jsx`, `src/pages/HymnPage.jsx`, `src/pages/blog/BlogIndexPage.jsx`, `src/pages/blog/BlogPostPage.jsx`

Apply the page-type recipe (table at the top of this plan). Exemplar code for each type — replicate the pattern, adapted to each file's actual structure (READ each file first):

- [ ] **Step 1: Content-page exemplar (`BrochureDesignerPage.jsx`):**

```jsx
import { KenteBand, CeremonialDivider } from '../../components/ceremonial'
// top of the page's outermost wrapper (first child):
<KenteBand size="page" />
// between hero→features and features→pricing (exactly two dividers):
<CeremonialDivider />
```

Symbol: default `adinkrahene` everywhere EXCEPT `MemorialCreatorPage.jsx`, which uses `<CeremonialDivider symbol="gyenyame" />`. Apply identically to the other three product pages, `RegionPage.jsx`, and `DiasporaPage.jsx` (DiasporaPage already imports from `components/`; its pricing strip card additionally gets a `<KenteBand size="card" />` top edge).

- [ ] **Step 2: Library exemplar (`HymnLibraryPage.jsx`):** `<KenteBand size="page" />` at top; each hymn card gets `<KenteBand size="card" />` as its first child (card wrapper becomes `overflow-hidden rounded-*` preserved); `<CeremonialDivider symbol="sankofa" />` before the page's bottom section. Same pattern for `BlogIndexPage.jsx` (post cards).
- [ ] **Step 3: Detail exemplar (`HymnPage.jsx`):** replace the existing breadcrumb-to-content transition with `<CeremonialDivider symbol="sankofa" />` under the H1 header block; related-hymn cards get `<KenteBand size="card" />` (the card links become `overflow-hidden`). Same for `BlogPostPage.jsx` (divider under the title block, sankofa).
- [ ] **Step 4:** Existing page tests must pass unmodified (HymnPage tests assert headings/links/CTA — untouched by decoration). `npx vitest run`, `npm run lint`, `npm run build` all green.
- [ ] **Step 5: Commit**

```bash
git add src/pages
git commit -m "feat(identity): ceremonial treatment across product, regional, diaspora, hymn, and blog pages"
```

---

### Task 8: Apply — dialogs + final verification

**Files:**
- Modify: `src/components/editor/CheckoutDialog.jsx`, `src/components/memorial/UpgradeDialog.jsx`

- [ ] **Step 1: Dialogs.** Both dialogs: `<KenteBand size="card" />` as the first child inside the DialogContent (the content container gets `overflow-hidden` if not already); the primary confirm/CTA buttons switch their background/color to `var(--ceremonial-cta-bg)` / `var(--ceremonial-cta-text)` via inline style or arbitrary-value classes (replace the current `bg-primary` on those CTAs only — read each dialog and change ONLY the primary purchase CTA, not secondary buttons). Existing dialog tests must pass unmodified.
- [ ] **Step 2: Excluded-surface check.** `git diff --stat` must show NO changes under: `src/pages/MemorialPage.jsx`, `GuestBookPage.jsx`, `ObituaryPage.jsx`, any `*Editor*`, `MyDesignsPage.jsx`, `PartnerDashboardPage.jsx`, `AdminDashboardPage.jsx`, donation/candle components. (CheckoutDialog/UpgradeDialog are in scope by spec §6.)
- [ ] **Step 3: Full verification.** `npm run lint`, `npx vitest run` (all green), `npm run build` (green; prerender output intact). Performance: start `npm run preview` and run `npx lighthouse http://localhost:4173/ --only-categories=performance --chrome-flags="--headless" --quiet` — record the performance score in your report (the controller compares it against the live production homepage's score; the structural guarantee is the spec budget: no new JS loops, two blur layers, CSS-only). If lighthouse cannot run in this environment, say so explicitly — do not skip silently. Verify the reduced-motion block covers `.shimmer-text`.
- [ ] **Step 4: Commit**

```bash
git add src/components/editor/CheckoutDialog.jsx src/components/memorial/UpgradeDialog.jsx
git commit -m "feat(identity): ceremonial dialog edges and gold ceremony CTAs"
```

---

## Coverage map (spec § → Task)

| Spec requirement | Task |
|---|---|
| §2 tokens, dark-default flip | 1 |
| §3 kit components (≤80 lines, tested, token-only) | 2, 3, 4 |
| §4 motif meanings + placement rules + faithfulness gate | 2, 5 |
| §5 effects budget + reduced-motion | 1, 4, 8 |
| §6 surfaces + exclusions | 6, 7, 8 (exclusion check 8.2) |
| §7 accessibility | enforced per-task (aria rules in 2–4; CTA contrast via tokens) |
| §8 success criteria | 8 (verification) + Task 5 (owner gate) |

Out of scope: editors/dashboards/admin/memorial surfaces (later phase, same kit), Lighthouse CI automation.
