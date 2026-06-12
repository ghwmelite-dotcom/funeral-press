// Telegram admin alerts. The message builder is pure (testable); sendTelegram
// is fire-and-forget — a Telegram outage must never break the calling flow
// (payment webhooks call notifyAdmin). Silently no-ops until the owner sets
// TELEGRAM_BOT_TOKEN (secret) and TELEGRAM_CHAT_ID (var).

// Event types that ping Telegram (in-app + email legs are configured
// separately in notifyAdmin). Extend by adding a type string.
export const TELEGRAM_EVENTS = new Set(['blog_draft', 'payment'])

export function telegramMessage(title, detail = {}) {
  const lines = [`🔔 ${title}`]
  const entries = Object.entries(detail).filter(([, v]) => v !== '' && v != null)
  if (entries.length) {
    lines.push('')
    for (const [k, v] of entries) lines.push(`${k}: ${v}`)
  }
  lines.push('')
  lines.push('https://funeralpress.org/admin')
  return lines.join('\n')
}

export async function sendTelegram(env, title, detail) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: telegramMessage(title, detail),
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      console.error('[telegram] send failed', res.status, (await res.text()).slice(0, 200))
    }
  } catch (e) {
    console.error('[telegram] send failed', e.message)
  }
}
