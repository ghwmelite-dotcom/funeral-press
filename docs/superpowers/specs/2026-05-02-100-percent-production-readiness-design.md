# 100% Production-Readiness Design — FuneralPress

**Date:** 2026-05-02
**Author:** Claude (with user)
**Branch:** `feature/donation-rail` (Phase 0–1), then merge to `main` and continue
**Status:** Approved approach; awaiting spec review before plan generation

---

## Problem

A May 2026 audit (4 parallel agents covering build/test, security, infra, feature completeness) found FuneralPress is **not production-ready** despite the original 3-phase plan and the donation-rail backend being claimed complete. Three categories of work remain:

- **A. Deploy blockers and correctness bugs** — placeholder KV namespace IDs, placeholder Paystack plan codes, missing `[[routes]]` blocks, `donation-api` and `brochure-ai-writer` not in CI, missing IP allowlist on subscription webhook, missing migrations for `guest_books` / `obituary_pages` / `photo_galleries`, `migration-subscriptions.sql` untracked, 8 React 19 `set-state-in-effect` errors in core navigation components, `localhost` in production CORS allowlists, wildcard CORS on AI worker, no worker-side Sentry, stale `compatibility_date`.
- **B. Donation rail UI** — Tasks 34–54 of `docs/superpowers/plans/2026-04-28-memorial-donation-rail-plan-part2.md`. Backend exists end-to-end; no frontend mounts it. Three feature flags (`DONATIONS_ENABLED`, `RECONCILIATION_ENABLED`, `PHONE_AUTH_ENABLED`) all `"false"`.
- **C. Dropped spec items** — every item in `docs/superpowers/specs/2026-04-02-worldclass-platform-enhancements-design.md` that was designed but never implemented: subscription dunning, push notifications, AI photo enhancement, onboarding tour, partner Recharts dashboard, venue enrichment cron, hymn library expansion, dynamic sitemap, funnel analytics tab, micro-interactions polish.

The user has accepted scope = A + B + C (option 3) and ordering = risk-first ladder with shipping after every phase.

## Goal

Reach **100% production-ready** state where:

1. Every existing feature deploys cleanly through CI to `funeralpress.org`.
2. Memorial visitors can complete an end-to-end donation through the live UI.
3. Every item in the two existing design specs is either implemented or formally cut with rationale.
4. Lint passes (0 errors), typecheck passes (or N/A — no TS), all 270+ tests still pass, build succeeds.
5. Worker-side error monitoring + observability exist for every production worker.

## Non-goals

- Re-designing anything already specified in the two existing specs. This spec **points to** the existing specs for design details and only re-specs items where the original design needs revision (see "Design revisions" below).
- Adding scope beyond items in those two specs. New ideas surfaced during implementation get triaged to a follow-up spec, not absorbed here.
- TypeScript migration (out of scope; project is JS).

## Approach: Risk-First Ladder, 4 Phases

Each phase ends with a deploy. Phase 0 is the prerequisite for any deploy; subsequent phases ride feature flags and gradual rollout.

```
Phase 0: Deploy blockers + correctness bugs   →   ~1–2 days
Phase 1: Donation rail UI (B, Tasks 34–54)    →   ~1–2 weeks
Phase 2: Revenue/retention C-items             →   ~1 week
Phase 3: Growth/polish C-items                 →   ~2–3 weeks (batched)
```

### Phase 0 — Unblock production (1–2 days)

**Goal:** Existing built code deploys cleanly through CI to a custom domain. No new features.

**Sub-PR-A — Wrangler config + missing migrations**

- Replace `REPLACE_BEFORE_DEPLOY_*` KV namespace IDs in `workers/donation-api-wrangler.toml:13,22` and `workers/auth-api-wrangler.toml:29`. User creates the namespaces (`wrangler kv namespace create OTP_KV`, `wrangler kv namespace create MEMORIAL_PAGES_KV`); spec wires the IDs.
- Replace `PLN_placeholder_monthly` and `PLN_placeholder_annual` in `workers/auth-api-wrangler.toml:8-9` with real Paystack plan codes (user provides from Paystack dashboard).
- Add `[[routes]]` blocks to all 7 wranglers binding to:
  - `auth-api.funeralpress.org/*` → `funeralpress-auth-api`
  - `donation-api.funeralpress.org/*` → `funeralpress-donation-api`
  - `memorial-api.funeralpress.org/*` → `funeralpress-memorial-api`
  - `live-api.funeralpress.org/*` → `funeralpress-live-service-api`
  - `share-api.funeralpress.org/*` → `funeralpress-share-api`
  - `ai.funeralpress.org/*` → `funeralpress-ai-writer`
  - twitter-bot stays internal (no public route)
- Add `donation-api` and `brochure-ai-writer` jobs to `.github/workflows/deploy.yml` mirroring the existing `auth-api` job.
- Commit existing untracked `workers/migrations/migration-subscriptions.sql`.
- Author and apply new migrations:
  - `workers/migrations/migration-guest-book.sql` — `guest_books`, `guest_entries` tables matching the columns referenced in `workers/auth-api.js:1496-1533`.
  - `workers/migrations/migration-obituary-pages.sql` — `obituary_pages` table matching `auth-api.js:1557-1585`.
  - `workers/migrations/migration-photo-gallery.sql` — `photo_galleries`, `gallery_photos` tables matching `auth-api.js:1608-1652`.
- Update `workers/schema.sql` to remove the two duplicate `CREATE TABLE` blocks (`orders` defined at lines 51 and 87; `unlocked_designs` defined at lines 67 and 103) and document that the file is reference-only — runtime schema lives in `workers/migrations/`.

**Sub-PR-B — Correctness fixes + CORS lockdown**

- Fix all 8 React 19 `react-hooks/set-state-in-effect` errors. The two highest impact are `src/components/PageTransition.jsx:11` and `src/components/RouteProgressBar.jsx:16` (fire on every navigation). Pattern: move state derivation into `useMemo` or a `useSyncExternalStore`, eliminate the effect, or compute synchronously during render where possible.
- Strip `http://localhost:5173` and `http://localhost:4173` from production CORS allowlists in `workers/auth-api.js:19-20`, `workers/donation-api.js:22-23`, `workers/live-service-api.js:20-21`, `workers/memorial-page-api.js:20-21`, `workers/share-api.js:19-20`. Gate behind a `env.ENVIRONMENT === 'dev'` check; the dev environment can use a separate wrangler env block.
- Replace wildcard `Access-Control-Allow-Origin: *` in `workers/brochure-ai-writer.js:9` with the same allowlist used by other workers.
- Add IP allowlist check to `workers/auth-api.js:1758 handleSubscriptionWebhook` mirroring the pattern in `donation-api.js:166-168` and `auth-api.js:838-846 handlePaymentWebhook`.
- Fix `workers/donation-api.js` empty `catch {}` blocks (lines 251, 288, 290, 313, 325, 1164, 1179) — log the swallowed error to console at minimum.
- Remove dead imports: `workers/auth-api.js:7 normalisePhone`, `src/stores/familyHeadStore.js:7 get`.

**Sub-PR-C — Observability + runtime hygiene**

- Bump `compatibility_date` in every `*-wrangler.toml` to `2026-04-01` (latest stable as of writing).
- Add `[observability] enabled = true` block to every wrangler.toml.
- Add `@sentry/cloudflare` to all 7 workers. Pattern: import `Sentry.init({ dsn: env.SENTRY_DSN, environment: env.ENVIRONMENT })` in each fetch handler, wrap with `Sentry.withScope`. Document required `SENTRY_DSN` secret per worker in `README.md`.
- Add health endpoints to workers that lack them: `share-api`, `memorial-page-api`, `live-service-api`, `brochure-ai-writer`. Each returns `{ status: 'ok', service: '<name>', commit: env.COMMIT_SHA }`.
- Resolve the `purchaseStore.js` mixed static/dynamic import advisory by either fully static-importing it or removing the static usage.

**Phase 0 exit criteria:**
- `npm run lint` exits 0.
- `npm test` exits 0 (270+ tests pass).
- `npm run build` exits 0 with no advisories.
- `wrangler deploy --dry-run` succeeds for every worker.
- All 6 production subdomains resolve to a worker after manual smoke deploy.

### Phase 1 — Donation rail UI (1–2 weeks)

**Goal:** A memorial visitor can complete a donation end-to-end. Family head can self-declare or accept invite. Admin can pause/refund. Three feature flags flipped to `"true"` at the end of the phase.

Implementation is already specified in `docs/superpowers/plans/2026-04-28-memorial-donation-rail-plan-part2.md` Tasks 34–54. This spec adds **no new design** for Phase 1 — the plan task list is the source of truth. The implementation plan generated from this spec will reference each task by number rather than re-stating it.

**Phase 1 exit criteria:**
- All Tasks 34–54 done per checklist in `…plan-part2.md`.
- Playwright e2e suite covers: anonymous donation, donor with phone-OTP profile claim, family-head invite/approve flow, admin pause/refund.
- Three feature flags flipped to `"true"` in production wrangler vars.
- Manual smoke test on a real memorial page completes a GHS 5 donation through Paystack live mode.
- Donation receipt email arrives via Resend.

### Phase 2 — Revenue/retention C-items (1 week)

**Goal:** Every revenue-affecting item from the 2026-04-02 spec is live.

**Items (no design changes — see existing spec sections):**
- Subscription dunning emails (Day 1, 3, 7) — see `2026-04-02 spec § 2A "Dunning Flow"`. Triggered by Paystack `charge.failed` webhook (already handled). New: scheduled sender that queries `subscriptions WHERE status = 'past_due' AND last_dunning_sent_at < ?` daily.
- Onboarding tour — see `2026-04-02 spec § 3A "Onboarding Flow"`. New `src/components/Onboarding.jsx`, `localStorage` flag `fp-onboarded`, also persist `onboarded_at` on user record.
- Funnel analytics tab — see `2026-04-02 spec § 3B "Funnel Tab"`. New route `GET /admin/analytics/funnel?days=30` aggregating `analytics_events`. New `src/pages/admin/FunnelTab.jsx` with funnel visualization.

**Phase 2 exit criteria:**
- A subscription that hits `charge.failed` receives email at Day 1, 3, 7, and downgrades to free at Day 7 (verified by integration test using fake clock).
- A new user signing up sees the 4-step onboarding tour, can skip, and the dismissed state persists across sessions.
- Admin funnel tab renders a Visit → Signup → Design → Paid funnel from real `analytics_events` data.

### Phase 3 — Growth/polish C-items (2–3 weeks, batched)

**Goal:** Everything else from the 2026-04-02 spec, in three small batches.

**Batch 3.1 — User-facing engagement (1 week):**
- Push notifications — see `2026-04-02 spec § 2B "Push Notifications"`. **Decision:** roll our own using `web-push` library inside a worker (avoids OneSignal dependency). VAPID keys generated once via `npx web-push generate-vapid-keys`, stored as worker secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. iOS users only get push if PWA is installed to home screen — accept this limitation, document in user-facing FAQ.
- Micro-interactions — see `2026-04-02 spec § 3A "Micro-interactions"`. canvas-confetti on payment success, page transition animation, save checkmark pulse, toast notifications.

**Batch 3.2 — Admin/partner tooling (1 week):**
- Partner Recharts dashboard — see `2026-04-02 spec § 3B "Partner Dashboard Enhancement"`. Mirror admin OverviewTab, scope to partner ID, add referral leaderboard.
- Dynamic sitemap Vite plugin — replace `public/sitemap.xml` (60 lines) with build-time generation that walks all routes in `src/App.jsx` plus all 16 region pages plus all 4 product landing pages plus all published memorial pages.

**Batch 3.3 — Data enrichment (1 week):**
- Hymn library expansion — see `2026-04-02 spec § 3D "Hymn Library Expansion"`. New `migration-hymns.sql` (move from static `src/utils/hymnCatalog.js` to D1 table), one-off enrichment script (`scripts/seed-hymns.mjs`) that ingests public-domain hymns from `hymnary.org` open data, admin approval queue at `/admin/hymns`.
- Venue enrichment cron — see `2026-04-02 spec § 3D "Venue Directory Enrichment"`. New `funeralpress-data-pipeline` worker with weekly cron, Google Maps Places API integration, admin verify queue. Worker no-ops if `GOOGLE_PLACES_API_KEY` secret is unset.
- AI photo enhancement — see "Design revisions" below; this item needs a small re-design before implementation.

**Phase 3 exit criteria:**
- All Batch items done per their respective implementation plans.
- Lighthouse mobile score ≥ 90 on home, memorial, design editor pages.
- Push notification subscription rate measurable in `analytics_events`.
- Sitemap auto-includes all routes (verified by build artifact diff).
- Admin can verify a venue from the queue and it appears on the public region page.

## Design revisions

These items in the 2026-04-02 spec have technical issues that became apparent during this audit. Re-designing inline rather than spawning a separate brainstorm round.

### AI Photo Enhancement (revised)

**Original spec problem:** says "Workers AI for brightness/contrast/sharpening". Workers AI is inference-only — it cannot transform pixel data. The spec's `@cf/meta/llama-3.2-11b-vision-instruct` model is a vision-language model, not an image processor.

**Revised approach (two pieces, deployed together):**

1. **Image enhancement** — use **Cloudflare Images** (paid product, $5/month + $1 per 100k delivered images). Built-in transformations: brightness, contrast, sharpen, blur, gamma, format conversion. Frontend "Enhance" button uploads to R2 (existing), then displays via Cloudflare Images URL with `?brightness=1.1&contrast=1.05&sharpen=1` query params for an "auto-enhanced" preview. User can adjust sliders before saving.
2. **AI suggested crop** — keep `@cf/meta/llama-3.2-11b-vision-instruct` for face detection. New route `POST /ai/suggest-crop` returns `{ x, y, width, height }` for portrait-friendly crop. Frontend displays suggestion as a movable overlay; user accepts or repositions.

**Cut if Cloudflare Images is undesirable:** ship only the AI suggested crop. Skip the slider enhancement. (User can override in spec review.)

### Push Notifications (refined)

**Original spec is sound** but does not specify the send infrastructure. Refinement:

- Use `web-push` npm library inside a dedicated worker `funeralpress-notifications` (or inline in `auth-api`, decided at plan time based on bundle size).
- Send is asynchronous and retry-safe via Cloudflare Queues. Push trigger code calls `env.NOTIFICATIONS_QUEUE.send({ userId, title, body, url })`; queue consumer iterates `push_subscriptions` for that user and calls `webpush.sendNotification`.
- 410-Gone responses prune dead subscriptions from D1.

## Spec structure & cross-references

This spec is the **umbrella** for the 100%-production-ready effort. It references but does not duplicate:

- `docs/superpowers/specs/2026-04-02-worldclass-platform-enhancements-design.md` — design details for Phase 2 + Phase 3 items.
- `docs/superpowers/specs/2026-04-28-memorial-donation-rail-and-phone-auth-design.md` — design details for Phase 1.
- `docs/superpowers/plans/2026-04-28-memorial-donation-rail-plan.md` and `…-plan-part2.md` — task-level checklist for Phase 1.

Each phase generates its own implementation plan via the writing-plans skill, named:
- `docs/superpowers/plans/2026-05-02-phase0-unblock-production.md`
- `docs/superpowers/plans/2026-05-02-phase1-donation-rail-ui.md` (may simply reference the existing plan-part2)
- `docs/superpowers/plans/2026-05-02-phase2-revenue-retention.md`
- `docs/superpowers/plans/2026-05-02-phase3-growth-polish.md`

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Paystack live plan codes not yet created | High | Phase 0 blocked | User creates plans in Paystack dashboard before Phase 0 starts |
| `wrangler kv namespace create` requires Cloudflare account auth | Medium | Phase 0 sub-PR-A blocked | User runs the create commands with the working wrangler path; spec wires returned IDs |
| DNS for new subdomains (`donation-api.funeralpress.org` etc.) not pointed to Cloudflare | High | Phase 0 routes don't resolve | User adds CNAME records in Cloudflare DNS before route binding |
| React effect fix in `PageTransition.jsx` regresses page-transition animation | Medium | Visible UX regression | Manual smoke test on every public route post-fix; add a regression test if a clean fix exists |
| Donation rail UI Tasks 34–54 reveal backend edge cases | Medium | Phase 1 timeline slips | Each task remains its own commit; revealed bugs become their own micro-tasks rather than blocking the rail |
| Cloudflare Images incurs per-image cost | Low | Operating cost rises with usage | Cap image size at 4 MB pre-upload; cache delivered URLs in browser; user can opt out at spec-review time |
| Google Maps Places API key not yet provisioned | Low | Venue cron no-ops | Worker logs warning and exits cleanly if key missing; admin manual entry remains the fallback |
| iOS push notification adoption low | High | Push feature value reduced | Document iOS-PWA-install requirement; lean on email for cross-platform notifications |
| `compatibility_date` bump exposes runtime behavior change | Low | Worker request handling subtly differs | Bump in sub-PR-C, run full test suite, smoke-test each worker before merging |

## Test strategy

- **Phase 0:** existing 270 tests stay green; add tests for new migrations (table existence, column types) and for the IP allowlist on subscription webhook.
- **Phase 1:** Tasks 34–54 each include their unit tests per existing plan; add Playwright e2e suite for the four flows listed above.
- **Phase 2:** integration tests using fake clock for dunning sequence; component tests for onboarding tour state transitions; data-driven test for funnel aggregation correctness.
- **Phase 3:** push notification e2e using a stubbed VAPID server; visual regression for micro-interactions (Lighthouse + manual); cron simulation for venue and dunning workers.

## Files changed/created summary (high-level)

**Phase 0:**
- `workers/auth-api-wrangler.toml`, `workers/donation-api-wrangler.toml`, all 5 other wranglers (routes, observability, compatibility_date)
- `workers/migrations/` — `migration-subscriptions.sql` (commit existing), `migration-guest-book.sql`, `migration-obituary-pages.sql`, `migration-photo-gallery.sql` (new)
- `workers/schema.sql` — dedupe
- `workers/auth-api.js`, `workers/donation-api.js`, `workers/live-service-api.js`, `workers/memorial-page-api.js`, `workers/share-api.js`, `workers/brochure-ai-writer.js` — CORS, IP allowlist, Sentry init, health endpoints
- 8 React component files for `set-state-in-effect` fixes
- `.github/workflows/deploy.yml` — add donation-api + ai-writer jobs

**Phase 1:** see `…plan-part2.md` Tasks 34–54.

**Phase 2:**
- `src/components/Onboarding.jsx`, `src/pages/admin/FunnelTab.jsx`
- `workers/auth-api.js` — dunning sender + scheduled task
- `workers/migrations/migration-onboarding.sql` — `onboarded_at` column on users
- `workers/migrations/migration-dunning.sql` — `last_dunning_sent_at`, `dunning_stage` columns on subscriptions

**Phase 3:**
- `workers/migrations/migration-push.sql`, `migration-hymns.sql`, `migration-venues-enrichment.sql`
- `workers/funeralpress-notifications.js` (new worker) — push send queue consumer
- `workers/funeralpress-data-pipeline.js` (new worker) — venue enrichment cron
- `src/components/PushPermission.jsx`, `src/utils/pushManager.js`
- `src/pages/partner/PartnerDashboardPage.jsx` (Recharts redesign)
- `vite.config.js` — dynamic sitemap plugin
- `scripts/seed-hymns.mjs`
- `src/utils/microInteractions.js` — confetti, transitions, toast helpers
- `workers/ai-image-enhance.js` (or extension to `brochure-ai-writer`) — `/ai/suggest-crop` route
- `src/components/PhotoEnhanceDialog.jsx`

## Open questions for spec review

1. **Cloudflare Images** — accept the $5/month + per-image fee, or cut the enhancement slider and ship only AI-suggested-crop?
2. **Worker subdomains** — confirm hostnames in the routes block (`auth-api.funeralpress.org` etc.) match the DNS scheme you want, or change to a single `api.funeralpress.org/<service>` pattern.
3. **Phase 0 sub-PR vs single PR** — proposed three sub-PRs; if you'd rather one big PR for review speed, say so.
4. **Phase 1 simplification** — shall I skip writing a new plan for Phase 1 and just hand off directly to the existing `…plan-part2.md` Tasks 34–54?
5. **Notifications worker split** — is a dedicated `funeralpress-notifications` worker overkill vs. inlining in `auth-api`? Default: dedicated.
