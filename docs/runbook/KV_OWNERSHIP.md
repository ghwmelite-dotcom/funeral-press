# KV Namespace Ownership

The five KV namespaces below are bound across the seven production workers. Each table records the binding name, namespace ID, owning worker, secondary readers/writers, key shape, TTL, and what data loss means in practice.

All IDs are taken directly from the `*-wrangler.toml` files in `workers/`. If you change an ID, change it everywhere — every binding referenced here must be updated together.

---

## Summary table

| Binding | Namespace ID | Primary owner | Other binders | Loss-of-data impact |
|---------|--------------|---------------|---------------|---------------------|
| `RATE_LIMITS` | `3cf6b47818c04ca8828461650478a6c1` | shared infra | All 6 HTTP workers | Recoverable. Counters reset, kill-switches must be re-applied. |
| `MEMORIAL_PAGES_KV` | `314cc22d0bb6497d85280eccf10e54bb` | `brochure-memorial-api` | `funeralpress-donation-api` (write-through cache) | Partial — D1 `memorials` is source of truth, but no automated rehydration script exists. |
| `BROCHURES_KV` | `25fef518037b4423a7176a0b4a533734` | `brochure-share-api` | (none) | **Unrecoverable.** Shared brochures live only here. |
| `LIVE_SERVICE_KV` | `cea5d511eba548518c396f5fe05b3701` | `brochure-live-service-api` | (none) | **Unrecoverable.** Live-service pages live only here. |
| `OTP_KV` | `a1ac0eaccf854a688954d90859570738` | `funeralpress-auth-api` (provisioned) | `funeralpress-donation-api` (provisioned) | No impact today. Bound but not read/written by any source code as of this writing — phone OTPs are persisted to D1 `phone_otps` instead. |

---

## 1. `RATE_LIMITS` — `3cf6b47818c04ca8828461650478a6c1`

**Bound by:** every HTTP worker — `auth-api`, `donation-api`, `memorial-api`, `share-api`, `live-service-api`, `ai-writer`. (The twitter-bot worker is cron-only and does not bind it.)

**Primary owner:** none — this namespace is shared infrastructure. Treat changes as a cross-cutting concern.

**Key shapes:**

| Key pattern | Writer | Reader | TTL | Purpose |
|-------------|--------|--------|-----|---------|
| `rate:<ip>:<routeGroup>` | `workers/utils/rateLimiter.js` (all workers) | same | 60 s | Per-IP per-route-group request counter. `routeGroup` ∈ `auth\|payments\|upload\|sync\|authenticated\|public`. |
| `kill_switch:donations_paused` | `donation-api` admin endpoint (`workers/donation-api.js:454`) | `donation-api` request handler (`workers/donation-api.js:155`) | none | Global donation kill switch. Value `"1"` pauses; `"0"` or absent allows. |
| `otp:phone:10m:<phone>` | `auth-api` (`auth-api.js:2259`) | same | 600 s | Per-phone OTP send counter (3/10min cap). |
| `otp:phone:24h:<phone>` | `auth-api` | same | 86400 s | Per-phone OTP send counter (10/day cap). |
| `otp:ip:1h:<ip>` | `auth-api` | same | 3600 s | Per-IP OTP send counter (20/hour cap). |
| `otp:ipphone:1h:<ip>:<phone>` | `auth-api` | same | 3600 s | Per-IP-per-phone OTP send counter (5/hour cap). |
| `otp:lockout:<phone>` | `auth-api` (on 5+ wrong attempts) | `auth-api` | 3600 s | Phone-level OTP lockout. Manual key delete unblocks early. |
| `rate:<ip>:ai-writer` | `ai-writer` | `ai-writer` | (verify in code) | Per-IP rate-limit for AI generations. Mock seen at `workers/__tests__/brochure-ai-writer.test.js:161`. |

**Reconstructable?** Yes. Counters re-fill from live traffic within their TTL window. The donation kill-switch and any active OTP lockouts must be **re-applied manually** if you need to preserve them across recreation — record current values before destroying the namespace.

**Recovery procedure:**
1. `wrangler kv namespace create "RATE_LIMITS"` and capture the new ID.
2. Update `id = "<new>"` in every `*-wrangler.toml` that lists `binding = "RATE_LIMITS"` (six files).
3. Redeploy all six workers.
4. Re-set kill switches if needed:
   ```bash
   wrangler kv key put --namespace-id=<new> "kill_switch:donations_paused" "1"
   ```

---

## 2. `MEMORIAL_PAGES_KV` — `314cc22d0bb6497d85280eccf10e54bb`

**Bound by:** `brochure-memorial-api` (owner), `funeralpress-donation-api` (write-through cache for donor wall totals).

**Key shapes:**

| Key pattern | Writer | Reader | TTL | Purpose |
|-------------|--------|--------|-----|---------|
| `<memorial_id>` | `memorial-page-api.js:126` (create), `donation-api.js` (write-through on charge.success / refund.processed / admin updates) | `memorial-page-api.js:168` (public GET), `donation-api.js` (read-modify-write totals) | 365 days from last write | Full memorial JSON blob: name, slug, story, photos, donation totals, settings. |
| `wall:totals:<memorial_id>` | `donation-api.js` (cache writes inside donor wall handlers) | `donation-api.js` (donor wall reads, line ~970, ~1005) | 30 s | Cached aggregate of donor wall — per-memorial totals + recent donors. Invalidated on any donation event. |

**Important:** `donation-api` *both* writes through the full memorial blob and invalidates `wall:totals:<id>` keys after every donation success, refund, and admin tweak. If you see stale donor wall numbers, the invalidate path is the first place to look (`donation-api.js:272, 319, 1416`).

**Reconstructable?** Partially.
- The full memorial blob is **also stored in D1 `memorials`**, so the data exists. There is no automated rebuild script — recovery requires reading every row of `memorials` and writing the joined record back via `wrangler kv bulk put`.
- `wall:totals:*` keys are pure cache. They reconstruct on first read.

**Recovery procedure:**
1. Recreate namespace; update both `memorial-wrangler.toml` and `donation-api-wrangler.toml`.
2. Redeploy both workers.
3. Optional: write a one-off script that reads D1 `memorials`, hydrates each entry into KV. **No such script is checked in — gap.**

---

## 3. `BROCHURES_KV` — `25fef518037b4423a7176a0b4a533734`

**Bound by:** `brochure-share-api` only.

**Key shapes:**

| Key pattern | Writer | Reader | TTL | Purpose |
|-------------|--------|--------|-----|---------|
| `<6-char code>` | `share-api.js:76` (create), `share-api.js:133` (update — refreshes TTL) | `share-api.js:99` (public GET) | 30 days from last write | Full brochure JSON: design, photos, family info. |

The 6-char code is the canonical share token in URLs like `https://funeralpress.org/?share=ABC123`. Codes refresh their TTL on every PUT, so actively-edited brochures live indefinitely; abandoned ones expire after 30 days.

**Reconstructable?** **No.** Shared brochures are not mirrored to D1 or R2. Deletion of this namespace = permanent loss of every shared brochure that hasn't been re-uploaded by the user.

**Recovery procedure:** none. If the namespace is deleted, the only mitigation is to ask Cloudflare support whether the namespace can be undeleted (undocumented retention window). Notify users that share links will return 404 and ask them to re-share from their local copy.

**Mitigation gap:** there is no backup. Recommended fix: nightly R2 export of all keys.

---

## 4. `LIVE_SERVICE_KV` — `cea5d511eba548518c396f5fe05b3701`

**Bound by:** `brochure-live-service-api` only.

**Key shapes:**

| Key pattern | Writer | Reader | TTL | Purpose |
|-------------|--------|--------|-----|---------|
| `<live_service_id>` | `live-service-api.js:111` (create) | `live-service-api.js:152` (public GET) | 365 days | Full live-service event JSON: name, dates, venue, livestream URL. |

**Reconstructable?** **No.** Same single-point-of-failure pattern as `BROCHURES_KV`. There is no D1 mirror.

**Recovery procedure:** none beyond Cloudflare support. Same recommended backup gap.

---

## 5. `OTP_KV` — `a1ac0eaccf854a688954d90859570738`

**Bound by:** `funeralpress-auth-api` and `funeralpress-donation-api`.

**Key shapes:** *no source code reads or writes this namespace today.*

A grep across `workers/` finds zero `env.OTP_KV.*` calls in production source — only test mocks. Phone OTPs are persisted to the D1 `phone_otps` table (`workers/auth-api.js:2228–2240`), and OTP rate-limit counters live in `RATE_LIMITS` under `otp:*` prefixes.

`OTP_KV` is provisioned for future use (e.g. moving OTP storage out of D1 to reduce write load). The bindings are inert.

**Reconstructable?** Yes — recreating it as an empty namespace has no functional impact.

**Recovery procedure:**
1. `wrangler kv namespace create "OTP_KV"`.
2. Update `auth-api-wrangler.toml` line 32 and `donation-api-wrangler.toml` line 24.
3. Redeploy both workers.

---

## 6. Operational guidance

1. **Never delete a namespace from the dashboard without confirming via grep that its data is recoverable.** Run:
   ```bash
   # Replace the binding name as needed
   grep -rn "MEMORIAL_PAGES_KV" workers/
   ```
   to see every code path that depends on it.

2. **Coordinate ID changes.** If you create a new namespace ID for `RATE_LIMITS`, you must update all six wrangler files in the same commit. A partial rollout will silently 5xx half the platform — Cloudflare returns an error when a binding's ID does not exist.

3. **Audit growth quarterly.** `wrangler kv key list --namespace-id=<id>` to estimate key count. Cloudflare KV has 1 GB free-tier limits per account; the donor-wall cache and brochure store are the most likely growth sources.

4. **No automated KV backup — accepted risk (decision 2026-05-06).** No nightly export exists. Decision: don't build one yet. Reasoning:
   - `BROCHURES_KV` entries already have a 30-day TTL, so the worst-case data loss is 30 days of share codes. Users regenerate.
   - `LIVE_SERVICE_KV` entries are short-lived event pages with similar bounded value.
   - `RATE_LIMITS` and `MEMORIAL_PAGES_KV` are recoverable (counters refill, D1 is source of truth).
   - The realistic threat is **accidental deletion** (rogue `wrangler kv:key delete`, compromised CI token), not regional failure (KV is multi-region replicated).
   - Mitigation lives in `DEPLOY_AND_ROLLBACK.md` § "Cloudflare API token scoping" — the CI token excludes `Workers KV Storage: Edit` so a compromised pipeline cannot bulk-delete.
   - Revisit if (a) data semantics change so loss matters, or (b) we hit a real incident.

5. **When rotating bindings, write-through caches need warming.** After recreating `MEMORIAL_PAGES_KV`, donor walls will show empty totals until a donation event triggers a write-through. A manual warming pass (replay D1 → KV) is recommended for high-traffic memorials.
