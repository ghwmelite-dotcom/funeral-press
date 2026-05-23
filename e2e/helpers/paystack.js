import { createHmac } from 'node:crypto'

// Paystack signs webhooks as HMAC-SHA512(rawBody, secret), hex-encoded, in the
// `x-paystack-signature` header. The worker recomputes this over the exact raw
// request body, so the signed string MUST be byte-identical to what we send.
export function paystackSignature(rawBody, secret) {
  return createHmac('sha512', secret).update(rawBody).digest('hex')
}

// Must match playwright.config.js TEST_PAYSTACK_WEBHOOK_SECRET (passed to the
// donation-api worker via --var).
export const WEBHOOK_SECRET = 'e2e-paystack-webhook-secret-do-not-use-in-prod'

// First IP in the worker's PAYSTACK_WEBHOOK_IPS allowlist.
export const PAYSTACK_WEBHOOK_IP = '52.31.139.75'

export function chargeSuccessBody({ reference, eventId, fees = 50, transactionId = 'txn_e2e_1' }) {
  return JSON.stringify({
    id: eventId,
    event: 'charge.success',
    data: {
      reference,
      fees,
      id: transactionId,
      status: 'success',
    },
  })
}
