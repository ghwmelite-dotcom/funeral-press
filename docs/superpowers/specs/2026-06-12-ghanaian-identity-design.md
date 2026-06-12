# Ghanaian Visual Identity — Design Spec

**Date:** 2026-06-12
**Status:** Approved (direction locked via visual companion mockups; owner approved light + dark renditions)
**Name:** "Adinkra Radiance, Ceremonially Framed"

---

## 1. The locked direction

Approved through three mockup rounds (`.superpowers/brainstorm/85832-1781294576/content/`):

- **Light mode:** warm ivory canvas, charcoal ink, restrained gold, quiet Adinkra watermarks — "dignity through restraint."
- **Dark mode:** **true mourning black** (`#08080C`, the current hero's canvas — NOT warm brown), carrying the existing hero's living-light effects (gold aurora drift, shimmer sweep, twinkles, gradient-shimmer headlines) with the ceremonial layer added.
- **Both modes:** kente bands at structural moments only — under the nav, atop cards, in footers — the "ceremonial frame" dosage (~90% calm, 10% cloth). Identical structure across modes; only tokens flip.
- Memorial pages, guest books, and editors keep their current quieter/independent treatments — this identity drives the platform shell.

## 2. Design tokens (additive; no existing token changes)

New primitives in the existing 3-layer token CSS, exposed as semantic `--ceremonial-*` variables that flip under `[data-theme="dark"]`:

| Semantic token | Light | Dark |
|---|---|---|
| `--ceremonial-canvas` | `#faf6ee` | `#08080C` |
| `--ceremonial-surface` | `#fffdf8` | `#0e0e13` |
| `--ceremonial-ink` | `#241f17` | `#f0e6d2` |
| `--ceremonial-ink-muted` | `#6e6354` | `#9b8e74` |
| `--ceremonial-gold` | `#9a7b1c` | `#E8C766` |
| `--ceremonial-gold-soft` | `#c8b572` | `#C9A24B` |
| `--ceremonial-border` | `#eee3cc` | `#26211a` |
| `--kente-gold` | `#b8860b` | `#E8C766` |
| `--kente-burgundy` | `#7a2c35` | `#a13a45` |
| `--kente-green` | `#1e5631` | `#2d7a47` |
| `--kente-void` | `#241f17` | `#000000` |

Primary CTA: charcoal-on-gold-gradient in dark (`linear-gradient(135deg, #F6E2A0, #C9A24B)` with ink text — matches the current hero CTA); ink-on-ivory inverse in light (charcoal button, cream text).

## 3. Ceremonial kit — `src/components/ceremonial/`

Small, individually tested components, each ≤80 lines, all reading tokens (never raw hex):

1. **`KenteBand`** — the woven strip as a repeating-linear-gradient; `size="page" | "card" | "ribbon"` (6px / 4px / 5px×140px). `aria-hidden` (decorative).
2. **`AdinkraMark`** — clean inline SVG per symbol; `symbol="adinkrahene" | "gyenyame" | "sankofa"`, `variant="mark" | "watermark"`; `aria-label` carries the symbol's name + meaning.
3. **`CeremonialDivider`** — gold gradient hairlines flanking a centered `AdinkraMark`.
4. **`AuroraField`** — the hero effect stack (two aurora blobs, one shimmer sweep, ≤6 twinkles) as an absolutely-positioned background layer; light mode renders the softened "gold mist" variant (lower opacity, no twinkles); entirely CSS-animated.
5. **`shimmer-text`** utility class — the gradient-shimmer headline treatment (existing keyframes generalized into the token CSS).

## 4. Motif system — symbols used with meaning, never as wallpaper

| Symbol | Meaning | Where it appears |
|---|---|---|
| **Adinkrahene** (concentric circles) | Greatness, leadership, charisma | Hero watermarks, section dividers — the platform's "crest" |
| **Gye Nyame** | The supremacy of God | Memorial-adjacent public surfaces: `/honour`, obituary-related landing content, memorial product page |
| **Sankofa** (bird looking back / stylized heart form) | "Go back and retrieve" — remembrance, learning from the past | Hymn library + hymn pages, blog, anniversaries content |

Rules: meanings exposed via `aria-label` and `title` tooltips; SVG paths drawn faithfully to canonical forms (no invented or distorted symbols); maximum one watermark-scale symbol per viewport; symbols never used as repeating background fill.

## 5. Effects budget (hard constraints)

- CSS-only animation: `transform` + `opacity`; **zero new JS animation loops**.
- Max **two** blur-filtered aurora layers per page; twinkles ≤6 per hero.
- Everything disabled under `prefers-reduced-motion: reduce` (single media-query block in the token CSS).
- Gate: Lighthouse performance score on the homepage must not drop more than 2 points vs pre-change baseline; record before/after in the PR.

## 6. Application surfaces (this phase)

LandingPage, the 4 product landing pages, 16 regional pages (RegionPage), 5 diaspora pages (DiasporaPage), HymnLibraryPage + HymnPage, BlogIndexPage + BlogPostPage, HonourPage, CheckoutDialog + UpgradeDialog (they overlay public pages). Plus the site-wide chrome those pages share (SiteHeader/nav, footer) **where shared chrome changes don't visibly alter excluded pages** — if the header is shared with editors, the ceremonial treatment applies via a wrapper class scoped to public routes.

**Explicitly untouched:** memorial pages, guest book pages, obituary pages, all 8 editors, MyDesignsPage, partner dashboard, admin dashboard, donation/candle flows. These follow in a later phase using the same kit.

## 7. Accessibility (non-negotiable)

- Gold (`--ceremonial-gold`) never carries body text: labels, accents, and ≥24px display text only; light-mode gold on ivory is reserved for non-text accents unless paired at large size (contrast `#9a7b1c` on `#faf6ee` ≈ 4.6:1 — acceptable at any size, but the rule keeps margins safe).
- Body pairs hold AA 4.5:1: `#241f17` on `#faf6ee` (~13:1), `#f0e6d2` on `#08080C` (~15:1), muted pairs ≥4.6:1.
- Kente bands and aurora layers are `aria-hidden`; Adinkra marks are labeled (they carry meaning).
- Focus states, touch targets (44px), and keyboard navigation unchanged from current standards.

## 8. Success criteria

1. Both themes render the locked direction on every §6 surface; structure identical across modes (tokens flip, layout doesn't).
2. Excluded surfaces are pixel-unchanged (spot-check editors + memorial page before/after).
3. Lighthouse gate (§5) holds; `prefers-reduced-motion` verified.
4. All ceremonial components covered by render tests; full suite + lint + build green.
5. The kit is reusable as-is for the future editors/dashboards phase.
