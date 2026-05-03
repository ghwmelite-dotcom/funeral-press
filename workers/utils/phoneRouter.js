import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Termii covers Ghana well. Everything else routes to Twilio Verify in v1.
const TERMII_COUNTRY_CODES = ['+233']

export function selectProvider(e164) {
  if (!/^\+\d{6,15}$/.test(e164 || '')) {
    throw new Error(`Invalid E.164 phone: ${e164}`)
  }
  if (TERMII_COUNTRY_CODES.some(cc => e164.startsWith(cc))) return 'termii'
  return 'twilio'
}

export function normalisePhone(input, defaultCountry = 'GH') {
  if (!input) return null
  try {
    const parsed = parsePhoneNumberFromString(input, defaultCountry)
    if (!parsed || !parsed.isValid()) return null
    return parsed.number
  } catch {
    return null
  }
}
