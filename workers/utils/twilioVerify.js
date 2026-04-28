// Twilio Programmable SMS for international OTP delivery.
// We send our own OTP code (not Twilio Verify) so audit/lockout logic is uniform with Termii path.

export async function sendTwilioSms({ accountSid, authToken, fromNumber, toE164, message }) {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio config missing (accountSid, authToken, fromNumber)')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams({
    To: toE164,
    From: fromNumber,
    Body: message,
  })

  const auth = btoa(`${accountSid}:${authToken}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: params.toString(),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return { ok: false, status: res.status, error: data.message || 'Twilio send failed', raw: data }
  }
  return { ok: true, sid: data.sid, status: data.status }
}

// OTP convenience wrapper.
export async function sendTwilioOtp({ accountSid, authToken, fromNumber, toE164, code }) {
  return sendTwilioSms({
    accountSid, authToken, fromNumber, toE164,
    message: `Your FuneralPress code is ${code}. Expires in 10 minutes. Do not share.`,
  })
}
