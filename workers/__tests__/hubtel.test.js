import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendHubtelSms, sendHubtelOtp } from '../utils/hubtel.js'

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('sendHubtelSms', () => {
  it('throws if clientId missing', async () => {
    await expect(
      sendHubtelSms({ clientId: '', clientSecret: 'x', toE164: '+233241234567', message: 'hi' })
    ).rejects.toThrow(/HUBTEL_CLIENT_ID/)
  })

  it('throws if clientSecret missing', async () => {
    await expect(
      sendHubtelSms({ clientId: 'x', clientSecret: '', toE164: '+233241234567', message: 'hi' })
    ).rejects.toThrow(/HUBTEL_CLIENT_SECRET/)
  })

  it('strips leading + from destination', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'msg-123' }),
    })

    await sendHubtelSms({
      clientId: 'cid', clientSecret: 'sec',
      toE164: '+233241234567', message: 'test',
    })

    const call = global.fetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.To).toBe('233241234567') // no leading +
  })

  it('uses default sender FuneralPress when none provided', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'msg-1' }),
    })

    await sendHubtelSms({
      clientId: 'cid', clientSecret: 'sec',
      toE164: '+233241234567', message: 'test',
    })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.From).toBe('FuneralPress')
  })

  it('uses custom sender when provided', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'msg-1' }),
    })

    await sendHubtelSms({
      clientId: 'cid', clientSecret: 'sec', fromSenderId: 'FunPress',
      toE164: '+233241234567', message: 'test',
    })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.From).toBe('FunPress')
  })

  it('sends Basic Auth header derived from clientId:clientSecret', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'msg-1' }),
    })

    await sendHubtelSms({
      clientId: 'cid', clientSecret: 'sec',
      toE164: '+233241234567', message: 'test',
    })

    const headers = global.fetch.mock.calls[0][1].headers
    const expected = `Basic ${btoa('cid:sec')}`
    expect(headers['Authorization']).toBe(expected)
  })

  it('returns ok:true with message_id on success (Status=0)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'msg-123', Rate: 0.03 }),
    })

    const result = await sendHubtelSms({
      clientId: 'cid', clientSecret: 'sec',
      toE164: '+233241234567', message: 'test',
    })

    expect(result.ok).toBe(true)
    expect(result.message_id).toBe('msg-123')
    expect(result.rate).toBe(0.03)
  })

  it('returns ok:false with error on HTTP failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ Message: 'Unauthorized' }),
    })

    const result = await sendHubtelSms({
      clientId: 'bad', clientSecret: 'bad',
      toE164: '+233241234567', message: 'test',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
    expect(result.error).toContain('Unauthorized')
  })

  it('returns ok:false when Status is non-zero even on HTTP 200', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 5, Message: 'Insufficient balance' }),
    })

    const result = await sendHubtelSms({
      clientId: 'cid', clientSecret: 'sec',
      toE164: '+233241234567', message: 'test',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Insufficient balance')
  })
})

describe('sendHubtelOtp', () => {
  it('formats the OTP message correctly', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'msg-1' }),
    })

    await sendHubtelOtp({
      clientId: 'cid', clientSecret: 'sec',
      toE164: '+233241234567', code: '123456',
    })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.Content).toContain('123456')
    expect(body.Content).toContain('FuneralPress')
    expect(body.Content).toContain('10 minutes')
    expect(body.Content).toContain('Do not share')
  })
})
