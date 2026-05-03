// Termii SMS sender — Ghana primary route.
// Docs: https://developer.termii.com/messaging-api

const TERMII_BASE = 'https://api.ng.termii.com/api/sms/send'

export async function sendTermiiSms({ apiKey, fromSenderId = 'FuneralPress', toE164, message }) {
  if (!apiKey) throw new Error('TERMII_API_KEY missing')

  const body = {
    to: toE164.replace(/^\+/, ''),
    from: fromSenderId,
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: apiKey,
  }

  const res = await fetch(TERMII_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.code !== 'ok') {
    return { ok: false, status: res.status, error: data.message || 'Termii send failed', raw: data }
  }
  return { ok: true, message_id: data.message_id, balance: data.balance }
}

// OTP convenience wrapper — used by /auth/phone/send-otp route.
export async function sendTermiiOtp({ apiKey, fromSenderId, toE164, code }) {
  return sendTermiiSms({
    apiKey, fromSenderId, toE164,
    message: `Your FuneralPress code is ${code}. Expires in 10 minutes. Do not share.`,
  })
}
