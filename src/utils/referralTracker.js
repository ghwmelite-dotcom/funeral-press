const REFERRAL_KEY = 'fp-referral-code'

export function captureReferralCode(code) {
  if (!code) return
  try {
    localStorage.setItem(REFERRAL_KEY, code.toUpperCase().trim())
  } catch { /* ignore */ }
}

export function getStoredReferralCode() {
  try {
    return localStorage.getItem(REFERRAL_KEY)
  } catch {
    return null
  }
}

export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(REFERRAL_KEY)
  } catch { /* ignore */ }
}
