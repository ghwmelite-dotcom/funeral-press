# Automated Growth Flywheel — Design Spec

**Date:** 2026-06-11
**Status:** Approved design, pending implementation plan
**Owner decision context:** Fully automated growth (no founder sales time, no ad budget). B2C only — no B2B/partner outreach in this phase. Dual-market target: Ghana (GHS 50–100k MRR) + diaspora ($5–15k/mo equivalent) within 12 months.

---

## 1. Problem & Strategy

FuneralPress is product-complete and revenue-live (13 products, Paystack/Stripe, subscriptions) but distribution is unexecuted. The platform's strongest growth asset is structural: **every funeral broadcasts FuneralPress artifacts (memorial pages, brochure PDFs, printed QR codes) to 200–800 mourners**, a meaningful share of whom will plan a funeral within a year and a meaningful share of whom are diaspora viewers with 5–10x purchasing power.

The flywheel: **search brings strangers in → the memorial loop turns every funeral into more funerals → multi-currency pricing captures diaspora money.** Three phases, sequenced so conversion surfaces exist before SEO traffic arrives:

| Phase | Weeks | Engine |
|-------|-------|--------|
| A | 1–3 | Conversion layer on every shared artifact + family referral program |
| B | 2–4 | Multi-currency pricing + diaspora landing pages |
| C | 4–12 | Programmatic SEO/AEO at scale |

Rationale for ordering: viral-loop improvements pay back immediately on existing usage and multiply later SEO traffic; SEO-first would pour future traffic into today's leaky funnel.

---

## 2. Phase A — Conversion Layer on Shared Artifacts (Weeks 1–3)

### 2.1 Voice constraint (applies to every surface in this phase)

All conversion copy follows the Solemn Radiance brand voice and the three-audience voice rules. Nothing on a memorial page may read as advertising. Pattern: dignified attribution + invitation, never urgency, never discounts, no exclamation marks on grief surfaces.

### 2.2 Memorial page footer pathway

- Every **public** memorial page gets a footer line: *"This tribute was lovingly created with FuneralPress."* linked to a dedicated landing page at `/honour`.
- The `/honour` landing page meets the visitor in mourning context: headline *"Honour someone you've lost"*, then the memorial/tribute product, then the wider design suite. It does NOT reuse the generic homepage.
- Footer appears on all tiers including paid. This is attribution, not a watermark; the existing "remove branding" entitlement applies to the *memorial content area* (header badge), not the page footer. If a Heritage subscriber objects, footer removal can be added to Heritage later — out of scope now.

### 2.3 Post-condolence prompt

- After a visitor submits a guest book entry, show a soft inline prompt (not a modal): *"Thank you for honouring [first name]. If you ever need to celebrate a life, FuneralPress is here."* with a single quiet link to `/honour`.
- Shown **once per visitor per memorial** (localStorage flag), dismissible, suppressed entirely if the visitor is a logged-in existing user.

### 2.4 QR landing experience

- Printed QR codes continue to link to the memorial page (no change to print pipeline).
- Memorial pages detect first-time visitors arriving via QR (`?src=qr` already appended at QR generation; verify and add if absent) and show a one-time slim ribbon: *"You're viewing a tribute to [name] · Created with FuneralPress"* — tribute first, pathway second. Ribbon dismisses permanently per visitor.

### 2.5 Family referral program

- Reuses existing `referral_codes` / `referral_tracking` tables (built for partners) with a new `type='family'` discriminator.
- Mechanics (give-get):
  - Every registered user gets a shareable code/link from their dashboard.
  - **Referred family receives:** 1 free design unlock (watermark-free export on one design).
  - **Referrer receives:** GHS 20 account credit (or currency-book equivalent once Phase B ships), granted when the referred user completes their **first design export** (not at signup — abuse guard).
  - Cap: max 10 referral credits per referrer per rolling 12 months.
- Share surfaces: dashboard card + post-export success screen (*"Know a family who needs this?"*). NOT on memorial pages.
- Fraud guards: same-device fingerprint + same-payment-instrument checks reuse existing rate-limit/KV infrastructure; flagged pairs go to admin review rather than auto-grant.

### 2.6 Per-surface analytics

- Every pathway is tagged in the existing `analytics_events` table with a `surface` dimension: `memorial_footer`, `post_condolence`, `qr_ribbon`, `referral_dashboard`, `referral_post_export`.
- Funnel events per surface: `impression` → `click` → `signup` → `first_design` → `purchase`.
- **K-factor definition (the loop health metric):** new signups attributed to loop surfaces in period ÷ funerals (memorials + exported designs) created in period. Reported weekly (see §5.3).

---

## 3. Phase B — Multi-Currency + Diaspora Capture (Weeks 2–4)

### 3.1 Geo-detection & price books

- Currency resolved at the edge from `request.cf.country`:
  - `GH` → GHS · `NG` → NGN · `GB` + EU country codes → GBP · all others → USD.
- Manual currency switcher on the pricing page (persisted per session). Rationale: diaspora users sometimes pay on behalf of family in Ghana and may legitimately want GHS/momo.
- Existing subscriptions and stored credits remain in their original currency forever; currency is fixed at first purchase.

### 3.2 Pricing (value-based, not FX-converted)

| Tier | GHS (existing) | NGN | GBP | USD |
|------|---------------|-----|-----|-----|
| Single design unlock | 35 | 4,500 | £9 | $12 |
| Bundle (3 designs) | 75 | 9,500 | £19 | $25 |
| Pro Monthly | 85/mo | 11,000/mo | £12/mo | $15/mo |
| Pro Annual | 850/yr | 110,000/yr | £119/yr | $149/yr |
| Memorial Premium | 120/yr | 15,000/yr | £29/yr | $39/yr |
| Memorial Heritage | 280/yr | 36,000/yr | £49/yr | $59/yr |
| Memorial Forever Tribute (one-time) | 150 | 19,000 | £35 | $45 |

- GHS prices unchanged. NGN set near GHS purchasing-power parity. GBP/USD set on value (a family funding a GHS 80,000 funeral from London is price-insensitive at £49).
- Exact NGN figures may be tuned ±15% at implementation against Paystack NGN norms; GBP/USD figures are fixed by this spec.

### 3.3 Payment rails

- **Paystack:** GHS (mobile money for Ghana is non-negotiable). *Correction (2026-06-11, found at Phase B planning):* Paystack currencies are per-business-country — a Ghana Paystack account cannot charge NGN. The NGN price book ships dormant until a Paystack Nigeria account exists; `NG` visitors see USD meanwhile.
- **Stripe:** GBP + USD, one-time and subscriptions. *Correction (2026-06-11):* Stripe was NOT already integrated (earlier briefing was wrong); Phase B builds it (Checkout Sessions via REST, no SDK). Stripe Billing handles dunning for GBP/USD; existing Paystack dunning flow unchanged for GHS.
- *Correction (2026-06-12):* **Stripe does not onboard Ghana-registered merchants**, so the Stripe rail is unusable without a UK/US entity. The diaspora rail is **Paystack USD** (supported for Ghana businesses, requires account activation by Paystack). GBP is dormant pending a UK entity; UK/EU visitors pay in USD. The Stripe integration remains in the codebase, dormant behind 503 guards, for a future entity.
- Webhook handling: Stripe webhooks get the same idempotency + signature-verification treatment as the existing Paystack webhooks (HMAC pattern already established in `workers/auth-api.js`).
- The credit-resolution waterfall is currency-agnostic (credits are counted in units, not money); only purchase/renewal flows touch currency.

### 3.4 Diaspora landing pages (5)

Pure messaging — every feature referenced already exists. Each page: 1,200+ words, FAQ schema, currency auto-set to GBP/USD, testimonial slots, product screenshots.

1. `/diaspora/plan-a-funeral-in-ghana-from-abroad` — hub page (budget planner sharing, remote design collaboration, print fulfillment delivered in Ghana)
2. `/diaspora/watch-a-funeral-from-abroad` — livestream + memorial guest book
3. `/diaspora/funeral-order-of-service-template` — brochure/programme designer for UK-format searches ("order of service" is the UK term)
4. `/diaspora/send-condolences-to-ghana` — guest book + wreath cards + contribution to budget planner
5. `/diaspora/nigeria` — Nigerian diaspora variant of the hub page

---

## 4. Phase C — Programmatic SEO/AEO Engine (Weeks 4–12)

### 4.1 Pre-flight: AI crawler access (DO THIS FIRST)

- The Cloudflare bot configuration that blocked RSS feeds with error 1010 (fixed via a Configuration Rule on feed paths) may be blocking AI/search crawlers zone-wide.
- Verify fetchability as `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Bingbot` user agents; fix with Configuration Rules as done for feeds. **All AEO work is wasted if this fails.**
- Add `robots.txt` explicit allows for the above + `llms.txt` describing the platform.

### 4.2 Ship the already-spec'd assets

- 16 regional pages (`/funeral-services/:region`) per the 2026-04-02 worldclass-enhancements spec §3C (data stub `src/data/regions.js` exists).
- 4 product landing pages (Brochure Designer, Poster Maker, Memorial Creator, Programme Booklet), 1,500+ words each.
- Dynamic sitemap generator (Vite build plugin, already planned) — extended to include all Phase C page types below, with sitemap index + per-type sitemaps.

### 4.3 Hymn pages (the goldmine)

> *Correction (2026-06-12, found at Phase C planning):* the hymn library contains **25 hymns, not 11,000** — the larger figure came from the early marketing briefing. Phase C builds the full programmatic infrastructure below (works at any scale); growing the dataset is a separate public-domain hymnal import initiative (see the older Phase-3D plan). The batching/crawl-budget guidance applies when that dataset lands.

- One indexable page per hymn at `/hymns/:slug`: full lyrics, tradition/denomination, occasions, language, 5 related hymns, and a CTA *"Add this hymn to a funeral programme"* deep-linking into the brochure designer.
- **Copyright gate:** only hymns verified public-domain get full lyrics pages; others get title/first-line/metadata pages with lyrics behind the in-app library. Implementation plan must include a PD-flagging pass over the 11,000-hymn dataset (rule of thumb: author death +70 years; unknown-provenance hymns default to metadata-only).
- Anti-thin-content: pages with <80 words of lyrics get merged occasion/tradition context; `noindex` any page that still falls below a quality floor.
- Schema: `CreativeWork`/`MusicComposition` + breadcrumbs. Internal linking: hymn → related hymns, hymn → product pages, regional pages → popular hymns by tradition.
- Rollout in batches (e.g., 500/week) to watch crawl budget and Search Console health rather than dumping 11k URLs at once.

### 4.4 Opt-in public obituaries (indexable UGC)

- At obituary publish, an explicit checkbox (default **off**): *"Allow this announcement to be found on search engines (Google)."* Revocable any time from the dashboard; revocation sets `noindex` and requests removal via sitemap drop.
- Funeral announcements in Ghana are traditionally public — many families want discoverability. Each opted-in obituary is unique, locally-relevant content with `Person` + `Event` schema (funeral date/venue) and links to the memorial page.
- Non-opted obituaries and all memorials default to `noindex` (current privacy posture unchanged).

### 4.5 AEO layer

- FAQ/HowTo/speakable/QAPage schema on regional, product, and diaspora pages (per existing Phase 3C spec).
- Answer-formatted content blocks (40–60 word direct answers under question headings) targeting: "how to plan a funeral in Ghana", "how much does a funeral cost in Ghana", "what is a one-week observance", "funeral order of service Ghana", etc.
- Goal: citations in ChatGPT/Perplexity/Gemini/Google AI Overviews. Measured via referral traffic from AI surfaces + manual spot checks monthly.

### 4.6 Automated blog cadence

- A cron Worker drafts 1 post/week via Workers AI from a topic queue (seeded with 50 topics at implementation: planning guides, cost breakdowns, cultural explainers, hymn roundups).
- Drafts land in the admin dashboard as `status='draft'`; owner approves/edits/rejects with one click (the single human touchpoint, ~10 min/week). Nothing auto-publishes.
- Published posts flow into the existing RSS/Atom/JSON feeds and sitemap automatically.

---

## 5. Economics & Measurement

### 5.1 Targets (12 months)

- Ghana: GHS 50–100k MRR.
- Diaspora: $5–15k/mo equivalent — at Phase B pricing this is ~150–400 active GBP/USD subscribers, or fewer with one-time purchases mixed in.

### 5.2 North-star metrics

1. **Loop:** memorial-surface conversion rate (impression→signup per §2.6) and K-factor.
2. **SEO:** organic sessions/week; indexed pages; AI-surface referrals.
3. **Money:** MRR by currency book; one-time revenue by currency; referral-attributed revenue.

### 5.3 Automated weekly growth report

- A cron Worker emails the owner (Resend, already integrated) every Monday: the §5.2 metrics, week-over-week deltas, top-converting surface, top organic landing pages. No dashboard-checking required — the engine reports to you.

---

## 6. Out of Scope (this initiative)

- B2B/partner/institutional outreach and self-serve partner onboarding (explicitly deferred by owner decision).
- Paid acquisition of any kind.
- Memorial custom domains and multi-language (already deferred to existing Phase 3 plans).
- New design products.
- Currency support beyond GHS/NGN/GBP/USD.

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Conversion surfaces feel exploitative on grief pages | Voice constraint §2.1; single-impression frequency caps; dismissible everywhere; copy review against brand voice rules before ship |
| SEO takes 3–6 months to mature | Sequencing puts revenue-positive Phases A/B first; hymn batches start indexing early in Phase C |
| AI/search crawlers blocked by Cloudflare bot config | Pre-flight check §4.1 before any content work |
| Hymn lyrics copyright | PD-flagging gate §4.3; metadata-only pages for unverified hymns |
| Referral abuse | Grant-on-first-export, caps, device/payment fingerprint checks §2.5 |
| Stripe GBP/USD chargebacks/disputes | Stripe Radar defaults; clear receipts via existing Resend templates |
| 11k thin pages harm site quality | Quality floor + `noindex` fallback + batched rollout §4.3 |

## 8. Success Criteria

- Phase A live with all five surfaces instrumented; K-factor measurable within 2 weeks of ship.
- Phase B: a visitor in London sees GBP prices and completes a Stripe subscription end-to-end; Ghana flows unchanged.
- Phase C: ≥1,000 hymn pages + 16 regional + 4 product + 5 diaspora pages indexed within 8 weeks of Phase C start; AI crawlers verified unblocked.
- Weekly growth report arriving every Monday without manual action.
