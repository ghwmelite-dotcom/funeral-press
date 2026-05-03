import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSubaccount,
  initialiseTransaction,
  refundTransaction,
  verifyWebhookSignature,
  PAYSTACK_WEBHOOK_IPS,
} from '../utils/paystack.js'

describe('Paystack client', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('createSubaccount POSTs to /subaccount and returns subaccount_code', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { subaccount_code: 'ACCT_xyz' } }),
    })
    const res = await createSubaccount({
      secretKey: 'sk_test',
      businessName: 'Akua Mensah Memorial',
      momoNumber: '+233244111222',
      provider: 'mtn',
      accountName: 'Akosua Mensah',
    })
    expect(res.ok).toBe(true)
    expect(res.subaccount_code).toBe('ACCT_xyz')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/subaccount',
      expect.objectContaining({ method: 'POST' })
    )
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(callBody.bank_code).toBe('MTN')
    expect(callBody.account_number).toBe('0244111222')
    expect(callBody.settlement_schedule).toBe('T+2')
  })

  it('createSubaccount returns ok:false on failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ status: false, message: 'invalid' }),
    })
    const res = await createSubaccount({
      secretKey: 'sk_test',
      businessName: 'X',
      momoNumber: '+233244111222',
      provider: 'mtn',
      accountName: 'X',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('invalid')
  })

  it('initialiseTransaction includes split metadata', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: true,
        data: { authorization_url: 'https://checkout.paystack.com/x', access_code: 'ac_y' },
      }),
    })
    const res = await initialiseTransaction({
      secretKey: 'sk_test',
      reference: 'FP_abc',
      amountPesewas: 50000,
      email: 'donor@example.com',
      subaccount: 'ACCT_xyz',
      tipPesewas: 2500,
      metadata: { donation_id: 'don_1' },
    })
    expect(res.ok).toBe(true)
    expect(res.authorization_url).toContain('paystack')
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(callBody.subaccount).toBe('ACCT_xyz')
    expect(callBody.bearer).toBe('subaccount')
    expect(callBody.transaction_charge).toBe(2500)
    expect(callBody.amount).toBe(50000)
    expect(callBody.currency).toBe('GHS')
  })

  it('refundTransaction calls /refund', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { id: 1 } }),
    })
    const res = await refundTransaction({ secretKey: 'sk_test', transactionRef: 'FP_xyz' })
    expect(res.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/refund',
      expect.objectContaining({ method: 'POST' })
    )
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(callBody.transaction).toBe('FP_xyz')
  })

  it('verifyWebhookSignature returns true for valid HMAC-SHA512', async () => {
    const secret = 'whsec_test'
    const body = '{"event":"charge.success","data":{}}'
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

    const result = await verifyWebhookSignature(body, expected, secret)
    expect(result).toBe(true)
  })

  it('verifyWebhookSignature returns false for wrong signature', async () => {
    const result = await verifyWebhookSignature('{"a":1}', 'a'.repeat(128), 'wrong-secret')
    expect(result).toBe(false)
  })

  it('verifyWebhookSignature returns false for missing signature', async () => {
    const result = await verifyWebhookSignature('{"a":1}', null, 'secret')
    expect(result).toBe(false)
  })

  it('PAYSTACK_WEBHOOK_IPS is the documented allowlist', () => {
    expect(PAYSTACK_WEBHOOK_IPS).toContain('52.31.139.75')
    expect(PAYSTACK_WEBHOOK_IPS).toContain('52.49.173.169')
    expect(PAYSTACK_WEBHOOK_IPS).toContain('52.214.14.220')
  })
})
