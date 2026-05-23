// Wipes and re-seeds the local D1 used by `wrangler dev` for e2e tests.
//
// Lifecycle:
//   1. Wipe .wrangler/e2e/ (the persist-to dir webServer points wrangler at).
//   2. Apply each SQL file in workers/migrations/ alphabetically against the
//      local D1 named `funeralpress-db` (the binding declared in
//      workers/auth-api-wrangler.toml).
//
// Runs as a npm pre-step (`node e2e/seed-local-d1.mjs && playwright test`)
// rather than Playwright globalSetup — globalSetup runs AFTER webServer
// boots, so wrangler would already hold a file lock on the D1 file we want
// to wipe (EPERM on Windows).
//
// No seed users: each test creates its own via the UI. Migration order
// matters and currently the alphabetical filename order is a valid topo
// order. If new migrations break that, rename them, don't fight the loader.

import { spawnSync } from 'node:child_process'
import { rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PERSIST_DIR = join(ROOT, '.wrangler', 'e2e')
const WRANGLER_CONFIG = join(ROOT, 'workers', 'auth-api-wrangler.toml')
const DB_NAME = 'funeralpress-db'

// We do NOT replay the full prod migration set. The migrations in
// workers/migrations/ ALTER tables (designs, orders, print_orders) that
// predate the migration system on prod but don't exist on a fresh local D1.
// Replaying them in any order tripped a wall of "no such table" and
// "duplicate column" errors. Re-engineering migration topology is out of
// scope for the e2e harness.
//
// Instead, e2e/schema-e2e.sql declares just enough schema for the auth
// flow. See its header for the drift-risk tradeoff. schema-donation.sql adds
// the donation-rail tables + fixtures for the webhook integration spec.
const SCHEMA_FILES = [
  'e2e/schema-e2e.sql',
  'e2e/schema-donation.sql',
]

function log(msg) {
  process.stdout.write(`[e2e:seed] ${msg}\n`)
}

function applySchemaFile(filePath) {
  const result = spawnSync(
    'npx',
    [
      'wrangler', 'd1', 'execute', DB_NAME,
      '--local',
      '--config', WRANGLER_CONFIG,
      '--persist-to', PERSIST_DIR,
      '--file', filePath,
    ],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  )
  if (result.status !== 0) {
    const tail = (result.stderr || result.stdout || '').split('\n').slice(-12).join('\n')
    throw new Error(`Schema apply failed: ${filePath}\n${tail}`)
  }
}

async function main() {
  if (process.env.E2E_BASE_URL) {
    log(`E2E_BASE_URL=${process.env.E2E_BASE_URL} — skipping local D1 seed`)
    return
  }

  if (existsSync(PERSIST_DIR)) {
    log(`wiping ${PERSIST_DIR}`)
    rmSync(PERSIST_DIR, { recursive: true, force: true })
  }

  log(`applying ${SCHEMA_FILES.length} schema file(s) to local D1 "${DB_NAME}"`)
  for (const rel of SCHEMA_FILES) {
    const abs = join(ROOT, rel)
    if (!existsSync(abs)) {
      throw new Error(`Missing schema file: ${rel}`)
    }
    log(`  → ${rel}`)
    applySchemaFile(abs)
  }
  log('schema ready')
}

main().catch((err) => {
  process.stderr.write(`[e2e:seed] ${err.message}\n`)
  process.exit(1)
})
