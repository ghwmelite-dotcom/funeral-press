import { describe, it, expect } from 'vitest'
import { redactPii, redactEmail, redactPhone, redactName } from '../utils/redactPii.js'

describe('redactEmail', () => {
  it('masks local + first char of domain, keeps TLD', () => {
    expect(redactEmail('akua@example.com')).toBe('a***@e***.com')
    expect(redactEmail('test.user@gmail.co.uk')).toBe('t***@g***.uk')
  })
  it('returns input unchanged when not an email', () => {
    expect(redactEmail('not-an-email')).toBe('not-an-email')
    expect(redactEmail('')).toBe('')
    expect(redactEmail(null)).toBe(null)
  })
})

describe('redactPhone', () => {
  it('keeps last 4 digits of a Ghana mobile', () => {
    expect(redactPhone('+233244123456')).toMatch(/^\+\*+3456$/)
  })
  it('keeps last 4 digits of a US E.164 number', () => {
    expect(redactPhone('+15555550123')).toMatch(/^\+\*+0123$/)
  })
  it('handles formatted phones with spaces and dashes', () => {
    expect(redactPhone('+1 555-555-0123')).toMatch(/^\+\*+0123$/)
  })
  it('returns input unchanged when not a phone', () => {
    expect(redactPhone('hello')).toBe('hello')
    expect(redactPhone('')).toBe('')
  })
})

describe('redactName', () => {
  it('reduces full name to initials', () => {
    expect(redactName('Akua Mensah')).toBe('A. M.')
    expect(redactName('Kofi Yaw Asante')).toBe('K. Y. A.')
  })
  it('handles single-word names', () => {
    expect(redactName('Esi')).toBe('E.')
  })
  it('uppercases lowercase initials', () => {
    expect(redactName('akua mensah')).toBe('A. M.')
  })
  it('returns input unchanged when blank or non-string', () => {
    expect(redactName('')).toBe('')
    expect(redactName('   ')).toBe('   ')
  })
})

describe('redactPii (recursive object walk)', () => {
  it('redacts known PII keys regardless of value shape', () => {
    const out = redactPii({
      action: 'donation.created',
      email: 'donor@example.com',
      phone: '+233244123456',
      name: 'Akua Mensah',
      amount: 5000,
      reference: 'FP_abc123',
    })
    expect(out.action).toBe('donation.created')
    expect(out.email).toBe('d***@e***.com')
    expect(out.phone).toMatch(/^\+\*+3456$/)
    expect(out.name).toBe('A. M.')
    expect(out.amount).toBe(5000)
    expect(out.reference).toBe('FP_abc123')
  })

  it('redacts email/phone shapes even under non-PII keys (defensive)', () => {
    const out = redactPii({
      note: 'Customer Akua at donor@example.com — call +233244123456',
      buried: { someField: 'foo@bar.com' },
    })
    // Free-form strings are NOT redacted (only known keys + exact shape match).
    // The 'note' field is free text; we expect it unchanged.
    expect(out.note).toContain('donor@example.com')
    // Nested object under a non-PII key — string IS exact email shape, so redacted.
    expect(out.buried.someField).toBe('f***@b***.com')
  })

  it('walks arrays recursively', () => {
    const out = redactPii({
      donors: [
        { email: 'a@x.com', amount: 100 },
        { email: 'b@y.com', amount: 200 },
      ],
    })
    expect(out.donors[0].email).toBe('a***@x***.com')
    expect(out.donors[1].email).toBe('b***@y***.com')
    expect(out.donors[0].amount).toBe(100)
  })

  it('passes through null, undefined, primitives', () => {
    expect(redactPii(null)).toBe(null)
    expect(redactPii(undefined)).toBe(undefined)
    expect(redactPii(42)).toBe(42)
    expect(redactPii(true)).toBe(true)
    expect(redactPii('plain string')).toBe('plain string')
  })

  it('does not mutate input', () => {
    const input = { email: 'x@y.com' }
    const out = redactPii(input)
    expect(input.email).toBe('x@y.com')
    expect(out.email).toBe('x***@y***.com')
  })

  it('handles deeply nested PII', () => {
    const out = redactPii({
      level1: { level2: { level3: { email: 'deep@nest.com', name: 'Yaw Boateng' } } },
    })
    expect(out.level1.level2.level3.email).toBe('d***@n***.com')
    expect(out.level1.level2.level3.name).toBe('Y. B.')
  })

  it('handles common alias keys (msisdn, mobile, donor_email)', () => {
    const out = redactPii({
      msisdn: '+233244123456',
      mobile: '+15555550123',
      donor_email: 'donor@example.com',
      actor_phone: '+233200999000',
    })
    expect(out.msisdn).toMatch(/^\+\*+3456$/)
    expect(out.mobile).toMatch(/^\+\*+0123$/)
    expect(out.donor_email).toBe('d***@e***.com')
    expect(out.actor_phone).toMatch(/^\+\*+9000$/)
  })
})
