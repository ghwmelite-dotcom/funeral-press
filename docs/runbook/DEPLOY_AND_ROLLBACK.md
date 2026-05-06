# Deploy and Rollback Runbook

This runbook is the source of truth for how FuneralPress code reaches production and how to back it out. It is derived from `.github/workflows/deploy.yml`, the seven `workers/*-wrangler.toml` files, and `package.json`. If any of those files change, update this doc.

---

## 1. How a deploy actually happens

Trigger: push to `main` branch on GitHub.

The workflow file is `.github/workflows/deploy.yml` (job name `Deploy FuneralPress`). It runs four sequential jobs and two parallel deploy jobs:

```
push to main
   │
   ▼
[lint]  ──► [test]  ──► [build]  ──► [deploy-frontend]
                                  └──► [deploy-workers]
```

| Job | What it does |
|-----|--------------|
| `lint` | `npm ci` + `npx eslint src/ workers/ --max-warnings 0` |
| `test` | `npm ci` + `npx vitest run` (depends on lint) |
| `build` | `npm ci` + `npm run build` (Vite). Uploads `dist/` artifact. Sentry sourcemaps uploaded if `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` are set. |
| `deploy-frontend` | **Only on push to main.** `wrangler pages deploy dist --project-name=funeral-brochure-app`. Account `ea2eb3a9813660dfca2a60e594858538`. |
| `deploy-workers` | **Only on push to main.** Seven `cloudflare/wrangler-action@v3` steps, each running `deploy --config workers/<name>-wrangler.toml` for: `auth-api`, `memorial`, `live-service`, `share`, `twitter-bot`, `donation-api`, `brochure-ai-writer`. |

**Pull requests run lint + test + build only.** They do not deploy.

**Required GitHub repo secrets:** `CF_API_TOKEN`, `SENTRY_AUTH_TOKEN`.
**Required GitHub repo variables:** `SENTRY_ORG`, `SENTRY_PROJECT`.

---

## 2. Pre-deploy checklist

Run before merging to `main`:

```bash
# From repo root
npm ci
npx eslint src/ workers/ --max-warnings 0
npx vitest run
npm run build
```

If any of those fail locally, CI will fail. Do not push to `main` expecting CI to "find the issue" — the deploy will silently not happen because all four pre-deploy jobs are gates.

For changes to a worker, additionally:

1. Verify `workers/<name>-wrangler.toml` lists all required bindings (D1, KV, R2, AI, routes, crons).
2. Verify any new secret is documented in the toml comments and set via `wrangler secret put` *before* the deploy lands. Missing secrets cause runtime 5xx, not deploy failure.
3. If you added a route, check that the `[[routes]]` `pattern` and `zone_name` are correct. Cloudflare will register the route on deploy.

---

## 3. Manual deploy (per-worker)

Use this when CI is broken, when you need to ship a single worker without redeploying all seven, or when you are testing a config change.

Authentication: log in once with `wrangler login`, or set `CLOUDFLARE_API_TOKEN` in the shell. Account ID `ea2eb3a9813660dfca2a60e594858538` is hardcoded in CI; locally `wrangler` reads it from your config or the `account_id` field in the toml (currently absent — wrangler will pick the only account on the token).

```bash
# Frontend (Pages)
npm run build
npx wrangler pages deploy dist --project-name=funeral-brochure-app

# Each worker independently
npx wrangler deploy --config workers/auth-api-wrangler.toml
npx wrangler deploy --config workers/donation-api-wrangler.toml
npx wrangler deploy --config workers/memorial-wrangler.toml
npx wrangler deploy --config workers/share-wrangler.toml
npx wrangler deploy --config workers/live-service-wrangler.toml
npx wrangler deploy --config workers/twitter-bot-wrangler.toml
npx wrangler deploy --config workers/brochure-ai-writer-wrangler.toml
```

After each deploy, verify:

```bash
curl -i https://<worker-host>/health
```

Health endpoints exist on `donation-api` (verified `/health`). Other workers may not — if 404, the worker still deployed (the route is reachable) but lacks a dedicated health route. Use `wrangler tail --config workers/<name>-wrangler.toml` to stream live logs.

---

## 4. Secret management

Secrets are **per-worker**. They are not shared across workers automatically, even if they have the same name (e.g. `JWT_SECRET` is set independently on `auth-api` and `donation-api`).

```bash
# Set or rotate a secret
npx wrangler secret put JWT_SECRET --config workers/auth-api-wrangler.toml
# (paste secret value at the prompt)

# List secrets currently bound (names only, not values)
npx wrangler secret list --config workers/auth-api-wrangler.toml

# Delete a secret
npx wrangler secret delete JWT_SECRET --config workers/auth-api-wrangler.toml
```

**Secrets currently in use** (from wrangler.toml comments and source):

| Secret | Worker(s) | Purpose |
|--------|-----------|---------|
| `JWT_SECRET` | `auth-api`, `donation-api` | HS256 signer/verifier. **Must match across both workers** or donation routes will reject auth-api-issued JWTs. |
| `OTP_PEPPER` | `auth-api`, `donation-api` | 32-byte HMAC pepper for OTP code hashes. Same value on both. |
| `PAYSTACK_SECRET_KEY` | `donation-api` | Paystack API auth. |
| `PAYSTACK_WEBHOOK_SECRET` | `donation-api` | HMAC verifier for incoming `/paystack/webhook`. |
| `RESEND_API_KEY` | `donation-api` (receipts), `auth-api` (dunning) | Resend transactional email API. |
| `SENTRY_DSN` | all workers | Sentry endpoint. |
| `TERMII_API_KEY` | `auth-api`, `donation-api` | Ghana SMS provider. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | `auth-api`, `donation-api` | International SMS provider. |
| `OXR_APP_ID` | `donation-api` | Open Exchange Rates app id for FX. |

### Rotation procedure (per secret)

1. **Generate new value** in the upstream system (Paystack dashboard, Resend dashboard, etc.).
2. **Set on every worker that uses it**, in one shell session, back-to-back:
   ```bash
   npx wrangler secret put PAYSTACK_WEBHOOK_SECRET --config workers/donation-api-wrangler.toml
   ```
3. **Confirm propagation.** `wrangler secret put` redeploys the worker automatically. Hit `/health` (where available) and watch `wrangler tail` to confirm the new secret is in effect.
4. **Revoke the old value upstream.** This is a separate manual step in Paystack/Resend/Twilio/Termii dashboards. Until done, the old secret is still valid.

For `JWT_SECRET` / `OTP_PEPPER`, **set on `auth-api` first, then `donation-api` immediately after**. There will be a few seconds where the two workers disagree and donation routes will reject some valid JWTs — schedule rotations during a low-traffic window.

For `SENTRY_DSN`, the value is the same project-wide. Set once on each of the seven workers.

---

## 5. D1 migrations

Migrations are checked into `workers/migrations/` and `workers/migration-*.sql`. **They are not auto-applied by CI.** Every schema change must be run manually via `wrangler d1 execute`.

```bash
# Production database
npx wrangler d1 execute funeralpress-db \
  --file=workers/migrations/migration-foundation.sql \
  --remote
```

The `--remote` flag is required to hit the production D1; without it, wrangler runs against a local SQLite.

**Migration policy:**

1. Write the migration as a single SQL file under `workers/migrations/`.
2. Make it idempotent where possible: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. SQLite does not support `IF NOT EXISTS` on `ADD COLUMN`; for those, use a guard query first or commit a one-shot script.
3. **Apply to production before merging the code that depends on it** — otherwise the deploy will produce 5xx errors as soon as it lands.
4. Verify:
   ```bash
   npx wrangler d1 execute funeralpress-db --remote \
     --command "SELECT sql FROM sqlite_master WHERE name='<table>';"
   ```

**Existing migrations** (chronological, newest last where determinable from filename):

```
workers/migrations/migration-foundation.sql
workers/migrations/migration-venues.sql
workers/migrations/local-bootstrap-users.sql        # local-only seed; do not run on prod
workers/migrations/migration-donation-rail-momo-cooldown.sql
workers/migrations/migration-donation-rail.sql
workers/migrations/migration-guest-book.sql
workers/migrations/migration-obituary-pages.sql
workers/migrations/migration-photo-gallery.sql
workers/migrations/migration-subscriptions.sql
workers/migrations/migration-dunning.sql
workers/migrations/migration-onboarding.sql
workers/migration-admin-indexes.sql
workers/migration-admin-notifications.sql
workers/migration-institutional-partners.sql
workers/migration-print-orders.sql
workers/migration-purchases.sql
workers/migration-referrals.sql
workers/migration-tweet-queue.sql
```

**Gap:** there is no migration tracking table (`schema_migrations` style). It is the operator's responsibility to know what's been applied. Recommended fix: add a `schema_migrations` table and a CI gate that fails if it is out of sync with the filesystem.

---

## 6. Rollback procedures

Three options, in order of preference.

### 6a. Revert the offending commit on `main` (preferred)

This is the cleanest path because it preserves git history, re-runs CI gates, and produces a forward-only audit trail.

```bash
# Find the bad commit
git log --oneline main -10

# Revert
git revert <sha>
git push origin main
```

This triggers the standard `Deploy FuneralPress` workflow, which redeploys the previous good code to all seven workers and Pages. Total time ~5–8 minutes.

**Use this for: regressions caught within a few hours of the deploy, where re-running the full CI gate is acceptable.**

### 6b. `wrangler rollback` for a single worker

Cloudflare Workers retain prior versions. `wrangler rollback` reverts to the previous version without going through CI. This is faster (~30s) and useful when CI is broken or you need to isolate a single worker.

```bash
# Rollback the last deployment of a specific worker
npx wrangler rollback --config workers/donation-api-wrangler.toml

# To roll back to a specific older version, list versions first:
npx wrangler deployments list --config workers/donation-api-wrangler.toml
npx wrangler rollback <deployment-id> --config workers/donation-api-wrangler.toml
```

Caveats:
- Rollback affects only that worker. The other six and the Pages frontend stay on current code. Schema or API changes that span workers cannot be partially rolled back this way.
- The rolled-back code is no longer in sync with `main`. The next push to `main` will re-deploy whatever is on `main` and overwrite the rollback. **Always pair a `wrangler rollback` with a git revert PR before the next merge.**

**Use this for: emergency mitigation when CI is red and a single worker is causing prod impact.**

### 6c. Cloudflare dashboard rollback

For Pages (frontend):

1. dashboard → Workers & Pages → `funeral-brochure-app` → **Deployments**.
2. Find the last good deployment.
3. Click "..." → **Rollback to this deployment**.

For Workers, the dashboard exposes the same version history under each worker's **Deployments** tab. Click the prior version → **Rollback**.

**Use this for: when you don't have a shell with wrangler set up. Slower, manual, but works from a phone.**

### Rollback decision tree

| Situation | Choose |
|-----------|--------|
| Bad commit identified, CI green | 6a (git revert) |
| One worker erroring, CI broken or unavailable | 6b (`wrangler rollback`) |
| No shell available, need to act now | 6c (dashboard) |
| Schema migration ran badly | none of the above — see § 7 |

---

## 7. Bad migration recovery

D1 migrations cannot be rolled back via `wrangler rollback`. The procedure depends on what the migration did:

1. **Added a column or table.** Usually safe to leave; older code will ignore it. New code that depended on it should be reverted via 6a.
2. **Dropped a column or table.** Data loss. The only path is to restore from a D1 point-in-time backup if available (paid feature, check dashboard → D1 → Backups). Otherwise the data is gone.
3. **Changed a constraint or default.** Write a forward-fix migration that re-applies the previous shape, then run it via `wrangler d1 execute --remote`.

**Always test migrations against a staging copy before running on prod.** There is no staging environment configured in this repo today — **gap**. Recommended fix: provision `funeralpress-db-staging` and add a `[env.staging]` section to each wrangler.toml.

---

## 8. Verifying a deploy is healthy

After any deploy or rollback, run through this checklist:

1. **Sentry** — open the workers project, filter to last 15 minutes, look for new error fingerprints.
2. **Health checks** — `curl -i https://donation-api.funeralpress.org/health` returns 200.
3. **Critical user flows:**
   - Sign in (frontend → `auth-api/auth/google`)
   - Create a memorial (`memorial-api`)
   - Initiate a test donation (`donation-api/donation/init`) — only if `DONATIONS_ENABLED=true`.
4. **Cron triggers** — dashboard → Workers & Pages → `funeralpress-auth-api` / `funeralpress-donation-api` / `funeralpress-twitter-bot` → Triggers tab. Confirm the next-scheduled time is in the future.
5. **Pages cache** — open https://funeralpress.org in an incognito window. Stale Pages caches sometimes serve old JS for ~60s after deploy.

---

## 9. Cloudflare API token scoping (CI token used by `deploy.yml`)

The `CLOUDFLARE_API_TOKEN` repo secret authenticates every `wrangler-action` step. Scope it deliberately so a compromised pipeline cannot do disproportionate damage. Recommended template (Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom token):

| Permission group | Permission | Why |
|------------------|------------|-----|
| Account | Workers Scripts: **Edit** | Required — deploys worker code |
| Account | Workers KV Storage: **Read** | Required for read paths during deploy validation |
| Account | Workers R2 Storage: **Edit** | Required for `funeralpress-images` writes from auth-api |
| Account | D1: **Edit** | Required for `wrangler d1 execute` migrations |
| Account | Workers Routes: **Edit** | Required for the `[[routes]]` blocks in each `*-wrangler.toml` |
| Zone | Cache Purge | Optional — only if you add a post-deploy cache purge |

**Explicitly omit:**

- ❌ `Workers KV Storage: Edit` — prevents `wrangler kv:key delete` and `wrangler kv:namespace delete` from CI. Manual deletes from a developer's local creds still work.
- ❌ `User: Memberships: Read` — wrangler-action needs `accountId` set explicitly anyway (see `deploy.yml` per-step `accountId` input). Including this scope is unnecessary and was the cause of the original CI failure (issue from 2026-05-03).
- ❌ Zone permissions beyond Cache Purge unless DNS automation is added.

**TTL and rotation:**

1. Set the token's expiry to **180 days** maximum. The token is in 1Password / your password manager; rotation is a 5-minute task (regenerate, paste new value into the GitHub repo secret).
2. Rotate immediately if any of: a contributor leaves the project, a laptop with `~/.wrangler/config/default.toml` is lost, or `gh secret list` shows access from an unfamiliar IP.
3. **Revoke the old token in Cloudflare immediately after rotating** — adding the new secret in GitHub does not invalidate the old one server-side.

**Why this matters more than KV backups.** The realistic threat to `BROCHURES_KV` and `LIVE_SERVICE_KV` is accidental deletion (rogue script, compromised CI). A scoped token without `KV: Edit` is cheaper to maintain than a backup pipeline and addresses the actual risk surface. See `KV_OWNERSHIP.md` § 6.4 for the risk-acceptance reasoning.

---

## 10. Known gaps

1. **No staging environment.** All deploys go straight to production. Recommended: `[env.staging]` blocks + a `staging-db` D1 instance + branch-based deploys for `staging` branch.
2. **No migration tracking.** Operator is responsible for knowing applied state. Recommended: `schema_migrations` table + CI assertion.
3. **No automated post-deploy smoke tests.** Health checks and synthetic user-flow probes should run after `deploy-workers` succeeds. Recommended: `playwright` smoke job appended to `deploy.yml`.
4. **No deploy notification.** Slack/Discord webhook to announce deploys would shorten "is this related to a deploy?" investigations.
5. ~~`wrangler.toml` at the workers root duplicates brochure-ai-writer config~~ — **fixed** in commit `bf634d7` (2026-05-06).
6. **Account ID is hardcoded in `deploy.yml`** (`ea2eb3a9813660dfca2a60e594858538`). Acceptable, but means anyone running deploys locally must use the same account; document this.
