// 6-digit OTP utilities. Hash with pepper for at-rest protection.

export function generateOtp() {
  // Cryptographically random 6-digit code, zero-padded
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(buf[0] % 1000000).padStart(6, '0')
}

export async function hashOtp(code, pepper) {
  const enc = new TextEncoder()
  const data = enc.encode(code + pepper)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyOtp(code, expectedHash, pepper) {
  const actual = await hashOtp(code, pepper)
  // Constant-time compare
  if (actual.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return diff === 0
}
