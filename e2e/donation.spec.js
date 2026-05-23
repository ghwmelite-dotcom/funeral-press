import { expect, test } from '@playwright/test'
import {
  PAYSTACK_WEBHOOK_IP,
  WEBHOOK_SECRET,
  chargeSuccessBody,
  paystackSignature,
} from './helpers/paystack.js'

// API-level integration tests for the Paystack webhook → D1 → donor-wall seam.
// This is the part of the donation flow that's hermetically testable: we own
// PAYSTACK_WEBHOOK_SECRET locally, so we can forge valid signatures. The
// charge → Paystack-hosted-checkout path is inherently external and out of
// scope (see docs/e2e-ci.md). Fixtures are seeded by e2e/schema-donation.sql;
// each mutating test uses its own memorial to stay parallel-safe.

const DONATION_API = process.env.E2E_DONATION_API_URL || 'http://localhost:8788'

async function postWebhook(request, { body, signature, ip = PAYSTACK_WEBHOOK_IP }) {
  return request.post(`${DONATION_API}/paystack/webhook`, {
    headers: {
      'CF-Connecting-IP': ip,
      'x-paystack-signature': signature,
      'content-type': 'application/json',
    },
    // Pass the pre-serialized string so the bytes match what we signed.
    data: body,
  })
}

test.describe('Paystack donation webhook', () => {
  test('charge.success promotes a pending donation, updates totals + wall', async ({ request }) => {
    const body = chargeSuccessBody({ reference: 'FP_e2e_happy', eventId: 'evt_e2e_happy', fees: 75 })
    const res = await postWebhook(request, { body, signature: paystackSignature(body, WEBHOOK_SECRET) })
    expect(res.status()).toBe(200)

    // Totals reflect the donation's amount_pesewas (5000), not net-of-fees.
    const totals = await request.get(`${DONATION_API}/memorials/mem_e2e_happy/donation/totals`)
    expect(totals.status()).toBe(200)
    const totalsBody = await totals.json()
    expect(totalsBody.total_raised_pesewas).toBe(5000)
    expect(totalsBody.total_donor_count).toBe(1)

    // The succeeded donation appears on the public wall (wall_mode 'full' shows amount).
    const wall = await request.get(`${DONATION_API}/memorials/mem_e2e_happy/donation/wall`)
    expect(wall.status()).toBe(200)
    const wallBody = await wall.json()
    const ama = wallBody.donations.find((d) => d.display_name === 'Ama E2E')
    expect(ama).toBeTruthy()
    expect(ama.amount_pesewas).toBe(5000)
  })

  test('rejects a webhook with an invalid signature (401)', async ({ request }) => {
    const body = chargeSuccessBody({ reference: 'FP_e2e_happy', eventId: 'evt_bad_sig' })
    const res = await postWebhook(request, { body, signature: 'deadbeef'.repeat(16) })
    expect(res.status()).toBe(401)
  })

  test('rejects a webhook from a non-allowlisted IP (401)', async ({ request }) => {
    const body = chargeSuccessBody({ reference: 'FP_e2e_happy', eventId: 'evt_bad_ip' })
    const res = await postWebhook(request, {
      body,
      signature: paystackSignature(body, WEBHOOK_SECRET),
      ip: '203.0.113.7',
    })
    expect(res.status()).toBe(401)
  })

  test('is idempotent — replaying the same event does not double-count', async ({ request }) => {
    const body = chargeSuccessBody({ reference: 'FP_e2e_idem', eventId: 'evt_e2e_idem', fees: 30 })
    const signature = paystackSignature(body, WEBHOOK_SECRET)

    const first = await postWebhook(request, { body, signature })
    expect(first.status()).toBe(200)

    const second = await postWebhook(request, { body, signature })
    expect(second.status()).toBe(200)

    const totals = await request.get(`${DONATION_API}/memorials/mem_e2e_idem/donation/totals`)
    const totalsBody = await totals.json()
    // Amount counted exactly once despite two deliveries.
    expect(totalsBody.total_raised_pesewas).toBe(3000)
    expect(totalsBody.total_donor_count).toBe(1)
  })
})
