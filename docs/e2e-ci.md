# E2E (Playwright) — CI Status & Future Paths

**Status:** Local-only. No GitHub Actions workflow.

## Why no CI?

FuneralPress is on the Cloudflare **Free** plan. Its edge auto-rejects GitHub
Actions runner IPs with HTTP 403 via IP-reputation classification.
`docs/runbook/DEPLOY_AND_ROLLBACK.md` § 10.3 documents this in detail — Bot Fight
Mode toggling, WAF Custom Rules, and custom User-Agents were all tested and none
of them clear the edge.

This means:

- A GHA job that runs `playwright test` against `funeralpress.org` will 403.
- A GHA job that runs `playwright test` against a `*.pages.dev` preview URL will
  also 403 — Pages previews sit behind the same edge.

We accept this constraint and keep e2e tests **local-only** for now. The
existing UptimeRobot synthetic monitoring continues to catch outage-class
regressions in production.

## Running locally

```bash
# Install browser binaries (first time only)
npm run test:e2e:install

# Default — auto-boots the local stack:
#   1. globalSetup wipes .wrangler/e2e/ and applies every migration in
#      workers/migrations/ to a fresh local D1
#   2. webServer boots `wrangler dev` for auth-api on :8787 (ENVIRONMENT=dev
#      enables localhost CORS, test JWT_SECRET injected via --var)
#   3. webServer boots `vite dev` on :5173 with VITE_AUTH_API_URL pointing
#      at the local worker
#   4. Tests run; both servers shut down when Playwright exits
npm run test:e2e

# Run against any other URL (staging, preview, prod for read-only smoke).
# globalSetup + webServer are skipped when E2E_BASE_URL is set.
E2E_BASE_URL=https://funeral-brochure-app-pr-42.pages.dev npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# After a failure: open the HTML report
npx playwright show-report
```

The local stack covers **only `auth-api`** — that's all the auth spec needs.
If you add specs that touch donations, memorial pages, or other workers, add
them to the `webServer` array in `playwright.config.js` and extend
`e2e/seed-local-d1.mjs` to seed any additional fixtures they need.

### Schema for the local D1

We do **not** replay the production migration set in `workers/migrations/`.
Those migrations have implicit ordering dependencies on tables that predate
the migration system on prod (e.g., `migration-foundation.sql` ALTERs
`designs`, `orders`, `print_orders` without creating them). Replaying them
on a fresh D1 hits a wall of "no such table" + "duplicate column" errors,
and re-engineering the migration topology is outside this harness's scope.

Instead, `e2e/schema-e2e.sql` is a hand-written minimal schema covering
just the tables the auth flow uses. **Drift risk:** if `workers/auth-api.js`
starts using a new column on `users` / `auth_email_tokens` / `refresh_tokens`,
the e2e spec will fail loudly. Mirror the change in `schema-e2e.sql`. When
e2e coverage expands to other flows (donations, memorials), add the
relevant tables there too — or split into multiple e2e schema files.

## Future paths if CI becomes important

In rough order of cost-to-implement:

1. **Self-hosted GHA runner** (~$5/mo VPS). The runner's outbound IP gets
   reputation-classified just like any other VPS — typically fine for CF
   edge. Adds maintenance for the runner host (security updates, the runner
   binary).

2. **Run Playwright against `wrangler dev` inside the same GHA job.** No edge
   in the loop. Requires orchestrating ~7 worker processes + vite + a seeded
   miniflare D1 inside the runner. Estimated 1-2 days of harness work.

3. **Browser-cloud service** (Browserstack, Sauce Labs, LambdaTest). Their
   browser farms run from IPs that clear the edge. Free tiers are tight but
   exist. Adds a paid dependency.

4. **Upgrade Cloudflare plan** (Pro is $25/mo). Pro exposes Super Bot Fight
   Mode controls and slightly different IP-reputation handling — speculative
   fix, not guaranteed to work.

## Test-data hygiene

Each spec generates a fresh GH-format phone number from `Date.now() % 10⁷`
plus the MTN prefix `24`. With a 115-day rollover and typical run cadence,
collisions are negligible. Test accounts accumulate in the `users` table —
the daily cleanup cron (`docs/runbook/...`) currently does not sweep them.
If volume becomes a concern, options are:

- Add an `is_test` column and a sweep step in the cron
- Use a deterministic test phone prefix (e.g., `+23399`) that the cron knows
  to delete; requires loosening libphonenumber validation in `PhoneInput`
  for test mode only — not recommended.

## Related

- `playwright.config.js` — config, baseURL via `E2E_BASE_URL` env
- `e2e/helpers/auth.js` — phone/email/name factories + UI helpers
- `e2e/auth.spec.js` — first spec (signup, login, reset-pin)
- `docs/runbook/DEPLOY_AND_ROLLBACK.md` § 10.3 — CF edge IP-block details
