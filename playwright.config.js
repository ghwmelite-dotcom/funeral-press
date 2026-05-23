import { defineConfig, devices } from '@playwright/test'

// E2E_BASE_URL lets you point the suite at any deployment (staging, a Pages
// preview URL you copy/paste). When unset, we boot a local stack via the
// webServer block below: wrangler dev (auth-api) on :8787 + vite dev on
// :5173, with vite configured to call the local worker.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173'
const useLocalStack = !process.env.E2E_BASE_URL

const LOCAL_WORKER_URL = 'http://localhost:8787'
const LOCAL_DONATION_API_URL = 'http://localhost:8788'
const LOCAL_FRONTEND_URL = 'http://localhost:5173'
const TEST_JWT_SECRET = 'e2e-test-jwt-secret-do-not-use-in-prod'
const TEST_PAYSTACK_WEBHOOK_SECRET = 'e2e-paystack-webhook-secret-do-not-use-in-prod'

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.(js|mjs|ts)/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',

  // NOTE: Local D1 seeding happens in `e2e/seed-local-d1.mjs`, run as a
  // pre-step from the `test:e2e` npm script — NOT via Playwright globalSetup,
  // because globalSetup fires after webServer boots, by which time wrangler
  // holds a file lock on the D1 we want to wipe (EPERM on Windows).

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  // Auto-boot wrangler + vite only when running the local stack.
  webServer: useLocalStack
    ? [
        {
          // Local auth-api worker against a wiped local D1. ENVIRONMENT=dev
          // flips the CORS allowlist to include http://localhost:5173.
          command: [
            'npx wrangler dev',
            '--config workers/auth-api-wrangler.toml',
            '--port 8787',
            '--ip 127.0.0.1',
            '--persist-to .wrangler/e2e',
            '--var JWT_SECRET:' + TEST_JWT_SECRET,
            '--var ENVIRONMENT:dev',
            '--var CORS_ORIGIN:' + LOCAL_FRONTEND_URL,
          ].join(' '),
          url: LOCAL_WORKER_URL + '/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          // Local donation-api worker. Shares the same --persist-to D1 as
          // auth-api so seeded memorials/donations are visible. The test
          // PAYSTACK_WEBHOOK_SECRET lets the spec forge valid HMAC-SHA512
          // webhook signatures.
          command: [
            'npx wrangler dev',
            '--config workers/donation-api-wrangler.toml',
            '--port 8788',
            '--ip 127.0.0.1',
            '--persist-to .wrangler/e2e',
            '--var PAYSTACK_WEBHOOK_SECRET:' + TEST_PAYSTACK_WEBHOOK_SECRET,
            '--var JWT_SECRET:' + TEST_JWT_SECRET,
            '--var ENVIRONMENT:dev',
            // Read endpoints (wall/totals/charge) are gated behind this flag;
            // the toml defaults it to "false". The webhook path is exempt.
            '--var DONATIONS_ENABLED:true',
          ].join(' '),
          url: LOCAL_DONATION_API_URL + '/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          // Vite dev server pointed at the local worker. VITE_API_URL is read
          // from import.meta.env in src/utils/* — overrides the prod default
          // baked into .env / .env.production.
          command: 'npx vite dev --port 5173 --strictPort',
          url: LOCAL_FRONTEND_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
          env: {
            // phonePinApi/apiClient/authStore read VITE_AUTH_API_URL; a few
            // partner/notification helpers read VITE_API_URL. Point both at
            // the local auth-api worker (which serves all of them).
            VITE_AUTH_API_URL: LOCAL_WORKER_URL,
            VITE_API_URL: LOCAL_WORKER_URL,
          },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ]
    : undefined,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
})
