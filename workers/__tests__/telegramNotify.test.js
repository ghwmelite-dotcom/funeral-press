import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TELEGRAM_EVENTS, telegramMessage, sendTelegram } from '../telegramNotify.js'

describe('TELEGRAM_EVENTS', () => {
  it('alerts on blog drafts and payments', () => {
    expect(TELEGRAM_EVENTS.has('blog_draft')).toBe(true)
    expect(TELEGRAM_EVENTS.has('payment')).toBe(true)
    expect(TELEGRAM_EVENTS.has('signup')).toBe(false)
  })
})

describe('telegramMessage', () => {
  it('formats title, detail lines, and the admin link', () => {
    const msg = telegramMessage('Blog draft ready for review: Funeral Costs in Ghana', {
      slug: 'funeral-costs-in-ghana',
      topic: 'How much does a funeral cost in Ghana',
    })
    expect(msg).toContain('🔔 Blog draft ready for review: Funeral Costs in Ghana')
    expect(msg).toContain('slug: funeral-costs-in-ghana')
    expect(msg).toContain('https://funeralpress.org/admin')
  })

  it('skips empty detail values and tolerates no detail', () => {
    const msg = telegramMessage('Payment completed: GHS 35.00', { email: '', reference: null })
    expect(msg).not.toContain('email:')
    expect(msg).not.toContain('reference:')
    expect(msg).toContain('https://funeralpress.org/admin')
  })
})

describe('sendTelegram', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true }))))
  afterEach(() => vi.unstubAllGlobals())

  it('no-ops when the bot token or chat id is missing', async () => {
    await sendTelegram({}, 'T', {})
    await sendTelegram({ TELEGRAM_BOT_TOKEN: 'x' }, 'T', {})
    await sendTelegram({ TELEGRAM_CHAT_ID: '1' }, 'T', {})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts to the bot sendMessage endpoint with the chat id', async () => {
    await sendTelegram({ TELEGRAM_BOT_TOKEN: 'tok123', TELEGRAM_CHAT_ID: '42' }, 'Hello', { a: 1 })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('https://api.telegram.org/bottok123/sendMessage')
    const body = JSON.parse(opts.body)
    expect(body.chat_id).toBe('42')
    expect(body.text).toContain('Hello')
    expect(body.text).toContain('a: 1')
  })

  it('never throws on transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await expect(
      sendTelegram({ TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: '1' }, 'T', {})
    ).resolves.toBeUndefined()
  })
})
