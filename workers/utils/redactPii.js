/**
 * Redact personally identifiable information from objects before they're
 * persisted to audit_log / donation_audit. Audit logs are operationally useful
 * — we want to know "user X took action Y" — but they should not contain raw
 * email addresses, phone numbers, or full names that would expand the breach
 * blast radius if the table were exfiltrated.
 *
 * Redaction rules:
 *  - Strings matching an email shape:        u**@e**.com  (keep first + first
 *                                                          char of domain)
 *  - Strings matching a phone shape:         +###******1234 (keep last 4)
 *  - Field names that imply names:           "Akua Mensah" → "A. M."
 *
 * The function recursively walks objects and arrays. Keys are case-insensitive.
 * Non-PII values (numbers, booleans, IDs, references) pass through unchanged
 * so the audit log stays useful.
 */

const PHONE_SHAPE = /^\+?[0-9][0-9 \-()]{6,}[0-9]$/
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const NAME_KEYS = new Set(['name', 'fullname', 'full_name', 'displayname', 'display_name', 'firstname', 'first_name', 'lastname', 'last_name'])
const EMAIL_KEYS = new Set(['email', 'user_email', 'donor_email', 'recipient_email', 'contact_email'])
const PHONE_KEYS = new Set(['phone', 'phone_number', 'phonenumber', 'msisdn', 'mobile', 'tel', 'actor_phone', 'donor_phone', 'recipient_phone'])

export function redactEmail(value) {
  if (typeof value !== 'string' || !EMAIL_SHAPE.test(value)) return value
  const [local, domain] = value.split('@')
  const dotIdx = domain.lastIndexOf('.')
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : ''
  const domainHead = dotIdx >= 0 ? domain.slice(0, dotIdx) : domain
  return `${local[0]}***@${domainHead[0]}***${tld}`
}

export function redactPhone(value) {
  if (typeof value !== 'string') return value
  const digits = value.replace(/[^\d+]/g, '')
  if (!PHONE_SHAPE.test(value) && !/^\+?\d{7,}$/.test(digits)) return value
  if (digits.length < 4) return '****'
  const last4 = digits.slice(-4)
  // Preserve the leading + if present, mask everything else.
  const prefix = digits.startsWith('+') ? '+' : ''
  return `${prefix}${'*'.repeat(Math.max(0, digits.length - 4 - prefix.length))}${last4}`
}

export function redactName(value) {
  if (typeof value !== 'string') return value
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return value
  return parts.map((p) => `${p[0].toUpperCase()}.`).join(' ')
}

/**
 * Recursively redact PII in any plain object/array. Returns a new value;
 * never mutates the input. Strings that LOOK like an email or phone are
 * redacted regardless of key name (defensive); known-PII keys force redaction
 * even if the value doesn't match a shape (e.g. partial phone strings).
 */
export function redactPii(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => redactPii(v))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const lk = k.toLowerCase()
      if (typeof v === 'string') {
        if (NAME_KEYS.has(lk)) { out[k] = redactName(v); continue }
        if (EMAIL_KEYS.has(lk) || EMAIL_SHAPE.test(v)) { out[k] = redactEmail(v); continue }
        if (PHONE_KEYS.has(lk) || PHONE_SHAPE.test(v)) { out[k] = redactPhone(v); continue }
      }
      out[k] = redactPii(v)
    }
    return out
  }
  if (typeof value === 'string') {
    if (EMAIL_SHAPE.test(value)) return redactEmail(value)
    if (PHONE_SHAPE.test(value)) return redactPhone(value)
  }
  return value
}
