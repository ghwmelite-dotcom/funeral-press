# Campaign Creatives — Design Spec

**Date:** 2026-05-20
**Author:** FuneralPress team (brainstormed with Claude)
**Status:** Approved — ready for implementation planning

---

## 1. Purpose

Produce a complete, deployable set of **78 beautifully designed campaign creative images** that promote every product on funeralpress.org across every channel that matters and every audience the business serves.

The output is the visual top-of-funnel for FuneralPress: the images that go on Instagram/Facebook/TikTok stories, on YouTube/Google Display/X/landing-page heroes, that funeral homes share with families, and that affiliates use to recruit referrals.

---

## 2. Scope

### 2.1 Matrix

| Axis | Count | Values |
|---|---|---|
| Products | 13 | brochure, poster, invitation, booklet, banner, thankyou, memorial-page, budget-planner, collage, qr-card, wreath-card, donation-receipt, slideshow |
| Formats | 2 | 9:16 (1080×1920) · 16:9 (1920×1080) |
| Audiences | 3 | families · directors · affiliates |
| **Total creatives** | **78** | 13 × 2 × 3 |

### 2.2 In scope

- 13 distinct product motifs (one per product)
- 2 master layout templates (one per format)
- 39 audience-specific copy cells (13 products × 3 audiences)
- A re-runnable Puppeteer renderer that produces all 78 PNGs from source HTML
- Hydrated HTML sources kept alongside PNGs for audit and iteration
- A `campaigns/README.md` documenting how to re-render, swap copy, or add a 14th product

### 2.3 Out of scope (explicitly)

- Animated/video creatives (the existing `docs/mockups/html-to-video.mjs` already covers intro/outro videos; static images first)
- Print bleed/CMYK production files (web-first; print conversion is a later stage)
- Localisation beyond English (current copy uses English with Ghanaian cedi mark; a Twi/Ga variant is a future spec)
- Paid-ad-specific assets (carousels, multi-slide creatives) — those reuse this output as source material
- Landing pages or website integration — this spec only produces image assets

---

## 3. Visual System

### 3.1 Brand language — Solemn Radiance

All 78 creatives inherit the established FuneralPress design philosophy (see `social-media-kit/design-philosophy.md`):

- **Foundation:** obsidian black `#0A0A0F`, midnight `#14131C`, charcoal `#1F1D2A` — radial gradient anchored top-left
- **Light:** aged gold `#C9A84C`, warm amber `#E0B97A`, soft ivory `#F5EAD0` — applied as veins, never decoration
- **Type:** Georgia serif for headlines (or close equivalent), Helvetica/Inter sans for eyebrows, captions, CTAs
- **Light source:** soft radial glow top-centre, suggesting memory illuminating darkness
- **Negative space:** treated as the most valuable element — generous margins, breathing room

### 3.2 Per-product motifs

Each product earns a distinctive visual gesture drawn from its own nature, composed in the same gold-on-obsidian language. The motif occupies the right half (16:9) or middle band (9:16) of the canvas.

| Product | Motif | Rendering hint |
|---|---|---|
| Brochure | Folded paper, vertical fold line, top-right corner crop | Repeating-linear gradient for fold ridges; 1px gold border-left at fold |
| Poster | Tall portrait frame with gold inner border, single ceremonial axis | Centered vertical, gold double-rule frame |
| Invitation | Envelope flap silhouette, wax-seal disc with gold initial | Triangle clip-path for flap; circular gold gradient for seal |
| Booklet | Stacked pages with stitched gold thread spine | Multiple staggered rectangles; gold dashed line for stitching |
| Banner | Hanging cloth with gold tassel, gentle horizontal drape | Subtle gradient on cloth, two tassels at bottom |
| Thank-you Card | Folded card with raised gold script "Thank You" inside frame | Two-panel composition, soft inner shadow |
| Memorial Page | Mobile phone silhouette showing portrait + tribute headline | Rounded-corner frame, dim screen with gold link icon |
| Budget Planner | Ledger grid + oversized cedi mark (₵) | Repeating-linear gradient for rules; 88px serif ₵ at 55% opacity |
| Collage | 3×3 photo grid with one gold-bordered focal frame | Grid of muted rectangles, one highlighted |
| QR Card | Scan reticle (corner brackets) over dot matrix | Four L-shaped corner brackets, radial-gradient dot grid |
| Wreath Card | Circular laurel made of small gold leaves | SVG circle with leaf-shaped paths around perimeter |
| Donation Receipt | Watermarked sheet with gold stamp + perforated edge | Diagonal "Received" watermark, dashed perforation |
| Slideshow | Vertical film strip with sprocket holes and 5 frames | Right-edge film reel with sequential gold-toned frames |

### 3.3 Five-zone composition (both formats)

| Zone | 9:16 placement | 16:9 placement | Purpose |
|---|---|---|---|
| Eyebrow | Top 6%, centred | Top-left 8% | "FuneralPress · {Product}" — 9px uppercase gold tracking |
| Hook | 18–42% | Left-half upper third | The headline — swappable per audience |
| Motif Field | 46–68% (middle band) | Right 40% (full height) | Product-specific visual gesture |
| Sub-line | 75–82% | Left-half lower third | Names one specific feature |
| CTA + URL | Bottom 6–14% | Bottom-left 30% | Gold pill, action verb, `funeralpress.org` |

### 3.4 Quality bar

- AA contrast: gold `#C9A84C` on obsidian `#0A0A0F` = 7.2:1 — passes AAA for normal text
- Hook readable at 320px viewport width (smallest expected render)
- CTA pill ≥ 44px tall (touch-target compliance, even though static)
- Motif never crowds the copy zone — 5% safe margin between zones
- All PNGs rendered at exact target dimensions (1080×1920, 1920×1080), no scaling artefacts

---

## 4. Architecture

### 4.1 Directory layout

```
campaigns/
├── data/
│   ├── products.json        # 13 products: { slug, name, eyebrow, motif, default_sub }
│   ├── audiences.json       # 3 audiences: { slug, tone, cta_verb_set }
│   └── copy.json            # 39 cells: { [product_slug]: { [audience_slug]: { hook, sub, cta } } }
├── templates/
│   ├── 9-16.html            # Master vertical template with {{slot}} placeholders
│   ├── 16-9.html            # Master wide template with {{slot}} placeholders
│   └── motifs/              # 13 self-contained motif HTML/CSS fragments
│       ├── brochure.html
│       ├── poster.html
│       ├── invitation.html
│       ├── booklet.html
│       ├── banner.html
│       ├── thankyou.html
│       ├── memorial-page.html
│       ├── budget-planner.html
│       ├── collage.html
│       ├── qr-card.html
│       ├── wreath-card.html
│       ├── donation-receipt.html
│       └── slideshow.html
├── render.mjs               # Puppeteer renderer — loops 78 combos, writes PNG + HTML
├── README.md                # How to re-render, swap copy, add a product
└── output/
    ├── 9-16/{product}-{audience}.png    # 39 vertical PNGs
    ├── 16-9/{product}-{audience}.png    # 39 wide PNGs
    └── _html/{format}/{product}-{audience}.html   # 78 hydrated HTML sources
```

### 4.2 Data contracts

**`products.json`** — array of 13 objects:

```json
{
  "slug": "brochure",
  "name": "Brochure",
  "eyebrow": "FuneralPress · Brochures",
  "motif": "brochure",
  "default_sub": "11 elegant templates. AI helps write the tribute. Print-ready in minutes."
}
```

**`audiences.json`** — array of 3 objects:

```json
{
  "slug": "families",
  "tone": "empathy-first",
  "cta_verb_set": ["Begin Gently", "Honour Them", "Start Free", "Design Now"]
}
```

**`copy.json`** — object keyed by product, then audience:

```json
{
  "brochure": {
    "families":   { "hook": "...", "sub": "...", "cta": "..." },
    "directors":  { "hook": "...", "sub": "...", "cta": "..." },
    "affiliates": { "hook": "...", "sub": "...", "cta": "..." }
  },
  ...
}
```

### 4.3 Template slot interface

Both `9-16.html` and `16-9.html` expose the same five slots:

- `{{EYEBROW}}` → from `products.json` (one product per render)
- `{{HOOK}}` → from `copy.json[product][audience].hook`
- `{{MOTIF}}` → inlined contents of `templates/motifs/{motif}.html`
- `{{SUB}}` → from `copy.json[product][audience].sub`
- `{{CTA}}` → from `copy.json[product][audience].cta`

This isolation means: each motif file knows nothing about copy; each copy cell knows nothing about visual styling; templates know nothing about specific products. Three independent units that compose at render time.

### 4.4 Renderer (`render.mjs`)

Reuses the Puppeteer pattern already in `docs/mockups/html-to-video.mjs`. Pseudocode:

```
for format in [9-16, 16-9]:
  for product in products.json:
    for audience in audiences.json:
      html = templates/{format}.html
      html = substitute({{EYEBROW}}, products[product].eyebrow)
      html = substitute({{MOTIF}}, motifs/{product.motif}.html)
      html = substitute({{HOOK}}, copy[product.slug][audience.slug].hook)
      html = substitute({{SUB}}, copy[product.slug][audience.slug].sub)
      html = substitute({{CTA}}, copy[product.slug][audience.slug].cta)
      write output/_html/{format}/{product.slug}-{audience.slug}.html
      puppeteer.screenshot(html, format dimensions) → output/{format}/{product.slug}-{audience.slug}.png
```

Headless Puppeteer, viewport set to exact target dimensions, full-page screenshot, PNG output. Deterministic — same inputs produce identical PNGs every run.

CLI:

```
node render.mjs                                 # render all 78
node render.mjs --product=brochure              # render 6 (brochure × 3 audiences × 2 formats)
node render.mjs --audience=families             # render 26
node render.mjs --product=brochure --format=16-9 --audience=families   # render 1
```

---

## 5. Copy

### 5.1 Voice rules (apply to all 39 cells)

- **Hook ≤ 12 words.** One image, one verb. Stops the scroll.
- **Sub-line names ONE specific feature.** "11 templates" or "AI tribute writer" or "Track every cedi" — never vague.
- **CTA verb matches audience:**
  - Families → gentle: *Begin Gently · Honour Them · Start Free · Design Now*
  - Directors → professional: *See Partner Plans · Request a Demo · Get Bulk Pricing · Talk to Us*
  - Affiliates → invitational: *Join the Programme · Start Earning · Learn More · Apply Now*
- **URL always `funeralpress.org`** — never "fp.org", never "FuneralPress.com", never abbreviated.
- **No clichés:** no "in these difficult times", no "sorry for your loss", no false urgency, no specific earnings amounts.
- **For affiliate copy:** always frame earning as a byproduct of helping families — never the primary pitch.

### 5.2 Sample cell — Brochure × all audiences

| Audience | Hook | Sub | CTA |
|---|---|---|---|
| Families | When words are hard to find, the page can still be beautiful. | 11 elegant templates. AI helps write the tribute. Print-ready in minutes. | Begin Gently |
| Directors | Offer every family a brochure they'll keep forever. | White-label templates. Bulk pricing. One workflow for 15+ memorial products. | See Partner Plans |
| Affiliates | Every brochure printed is a family helped — and a commission earned. | Generous recurring commissions. Free to join. Meaningful work. | Join the Programme |

### 5.3 Full copy bank

The implementation plan will populate all 39 cells. Each cell is generated by following `ad-generation-prompt.md` for that product × audience pair, then refined to meet voice rules above.

---

## 6. Validation & Delivery

### 6.1 Validation gate

Before rendering all 78, render **one sample cell** — Brochure × Families × 16:9 — and review:

1. Brand fidelity (palette, type, glow, negative space)
2. Motif legibility (recognisable, not decorative noise)
3. Copy hierarchy (eyebrow → hook → sub → CTA reads in that order)
4. Quality bar items in §3.4 all pass

Only after this passes do we proceed to the remaining 77.

### 6.2 Deliverables

- 78 PNG files at exact target dimensions, organised under `campaigns/output/{format}/`
- 78 hydrated HTML files under `campaigns/output/_html/{format}/` for audit and iteration
- 13 motif fragments under `campaigns/templates/motifs/`
- 2 master templates under `campaigns/templates/`
- 3 data files (`products.json`, `audiences.json`, `copy.json`)
- 1 renderer (`campaigns/render.mjs`)
- 1 `campaigns/README.md` documenting:
  - How to re-render all or a subset
  - How to edit copy without re-rendering visuals
  - How to add a 14th product (steps + checklist)
  - How to add a 4th audience (steps + checklist)

### 6.3 File naming

`{format}/{product-slug}-{audience-slug}.png` — examples:
- `9-16/brochure-families.png`
- `16-9/qr-card-affiliates.png`
- `9-16/budget-planner-directors.png`

Product slugs are kebab-case versions of the product list in §2.1.

---

## 7. Open questions

None at spec time. All decisions ratified in brainstorming:
- Format → 9:16 + 16:9 ✓
- Audience → all 3 ✓
- Approach → Full Matrix (78) ✓
- Visual motif principle → per-product, distinct ✓
- Composition → 5-zone shared grid ✓
- Architecture → data + templates + motifs + renderer ✓
- Copy voice → rules in §5.1 ✓
