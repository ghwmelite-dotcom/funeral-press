// Hubtel SMS sender — Ghana primary route.
// Hubtel is a Ghanaian provider with direct gateway connections to MTN, Telecel
// (formerly Vodafone), and AirtelTigo — better delivery and lower cost on +233
// numbers than aggregators like Termii.
//
// Docs: https://developers.hubtel.com/docs/messaging-api
// Endpoint used: legacy v1 (POST JSON with Basic Auth), simplest reliable shape.

const HUBTEL_BASE = 'https://smsc.hubtel.com/v1/messages/send'

function basicAuth(clientId, clientSecret) {
  const raw = `${clientId}:${clientSecret}`
  // btoa is available in Cloudflare Workers (V8 isolate) without a polyfill
  return `Basic ${btoa(raw)}`
}

export async function sendHubtelSms({ clientId, clientSecret, fromSenderId = 'FuneralPress', toE164, message }) {
  if (!clientId || !clientSecret) throw new Error('HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET missing')

  // Hubtel expects the destination WITHOUT a leading +
  const to = toE164.replace(/^\+/, '')

  const body = {
    From: fromSenderId,
    To: to,
    Content: message,
    RegisteredDelivery: true,
  }

  const res = await fetch(HUBTEL_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': basicAuth(clientId, clientSecret),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  // Hubtel returns Status: 0 on success (their convention) plus MessageId.
  // Some endpoints return { status: 'success' } — accept both for robustness.
  const success = res.ok && (data.Status === 0 || data.status === 'success' || data.Status === '0')

  if (!success) {
    return {
      ok: false,
      status: res.status,
      error: data.Message || data.message || `Hubtel send failed (Status=${data.Status ?? data.status ?? 'unknown'})`,
      raw: data,
    }
  }

  return {
    ok: true,
    message_id: data.MessageId || data.messageId || null,
    rate: data.Rate ?? null,
  }
}

// OTP convenience wrapper — used by /auth/phone/send-otp route.
export async function sendHubtelOtp({ clientId, clientSecret, fromSenderId, toE164, code }) {
  return sendHubtelSms({
    clientId, clientSecret, fromSenderId, toE164,
    message: `Your FuneralPress code is ${code}. Expires in 10 minutes. Do not share.`,
  })
}
