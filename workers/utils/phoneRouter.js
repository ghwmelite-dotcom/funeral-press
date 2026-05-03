import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Hubtel is a Ghanaian provider with direct MTN/Telecel/AirtelTigo connections —
// better delivery + lower cost on +233 than the previous Termii route.
// Everything else routes to Twilio Verify.
const HUBTEL_COUNTRY_CODES = ['+233']

export function selectProvider(e164) {
  if (!/^\+\d{6,15}$/.test(e164 || '')) {
    throw new Error(`Invalid E.164 phone: ${e164}`)
  }
  if (HUBTEL_COUNTRY_CODES.some(cc => e164.startsWith(cc))) return 'hubtel'
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
