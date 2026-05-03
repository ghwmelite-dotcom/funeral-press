const BASE = 'https://api.paystack.co'

async function paystackFetch(path, secretKey, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return {
    ok: res.ok && data.status === true,
    status: res.status,
    data: data.data,
    message: data.message,
    raw: data,
  }
}

export async function resolveAccount({ secretKey, momoNumber, providerCode }) {
  const params = new URLSearchParams({
    account_number: momoNumber.replace(/^\+233/, '0'),
    bank_code: providerCode,
  })
  return paystackFetch(`/bank/resolve?${params}`, secretKey)
}

export async function createSubaccount({ secretKey, businessName, momoNumber, provider, accountName }) {
  const BANK_CODE = { mtn: 'MTN', vodafone: 'VOD', airteltigo: 'ATL' }[provider]
  const result = await paystackFetch('/subaccount', secretKey, {
    method: 'POST',
    body: JSON.stringify({
      business_name: businessName,
      bank_code: BANK_CODE,
      account_number: momoNumber.replace(/^\+233/, '0'),
      percentage_charge: 0,
      primary_contact_name: accountName,
      settlement_schedule: 'T+2',
    }),
  })
  if (!result.ok) return { ok: false, error: result.message }
  return { ok: true, subaccount_code: result.data.subaccount_code }
}

export async function initialiseTransaction({
  secretKey,
  reference,
  amountPesewas,
  email,
  subaccount,
  bearer = 'subaccount',
  tipPesewas = 0,
  metadata = {},
}) {
  const result = await paystackFetch('/transaction/initialize', secretKey, {
    method: 'POST',
    body: JSON.stringify({
      reference,
      amount: amountPesewas,
      email,
      subaccount,
      bearer,
      transaction_charge: tipPesewas,
      currency: 'GHS',
      metadata,
    }),
  })
  if (!result.ok) return { ok: false, error: result.message }
  return {
    ok: true,
    authorization_url: result.data.authorization_url,
    access_code: result.data.access_code,
  }
}

export async function refundTransaction({ secretKey, transactionRef }) {
  return paystackFetch('/refund', secretKey, {
    method: 'POST',
    body: JSON.stringify({ transaction: transactionRef }),
  })
}

export async function listTransactions({ secretKey, fromTimestamp, toTimestamp, perPage = 100, page = 1 }) {
  const params = new URLSearchParams({
    perPage: String(perPage),
    page: String(page),
    from: new Date(fromTimestamp).toISOString(),
    to: new Date(toTimestamp).toISOString(),
  })
  return paystackFetch(`/transaction?${params}`, secretKey)
}

export async function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  if (expected.length !== signatureHeader.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i)
  }
  return diff === 0
}

export const PAYSTACK_WEBHOOK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
