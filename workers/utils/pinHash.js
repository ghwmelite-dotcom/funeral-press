// PIN hashing for the phone+PIN auth flow.
//
// PBKDF2-SHA256 is used (not Argon2/scrypt) because Web Crypto exposes it
// natively in Cloudflare Workers — no WASM bundle required. The Workers runtime
// caps PBKDF2 at 100 000 iterations (deriveBits throws "iteration counts above
// 100000 are not supported" beyond that), so that is the ceiling here. OWASP
// recommends more, but 100 000 is the maximum the runtime allows; brute-force
// resistance for the 4-digit PIN comes primarily from the 5-attempt lockout in
// handlePhoneLogin, not from iteration count. NOTE: Node's WebCrypto does NOT
// enforce this cap, so a value above it passes the test suite but throws in
// production — see the upper-bound guard in pinHash.test.js.
//
// Output format:    pbkdf2$<iter>$<salt_b64url>$<hash_b64url>
//
// The format is versioned and parses both the iteration count and the salt
// inline so the iteration count can be raised in a future deploy without
// breaking existing hashes — verifyPin re-derives with the count stored in
// the hash, so old hashes still verify even after the global default goes up.

const ALG = 'PBKDF2'
const HASH = 'SHA-256'
const KEY_LEN_BITS = 256
const SALT_BYTES = 16
const DEFAULT_ITERATIONS = 100000 // Cloudflare Workers' PBKDF2 ceiling (see header)

// 4-digit PIN to match MTN MoMo / Vodafone Cash UX in Ghana. Brute-force
// resistance comes from the 5-attempt lockout, not from PIN entropy.
const PIN_REGEX = /^[0-9]{4}$/

export function isValidPinFormat(pin) {
  return typeof pin === 'string' && PIN_REGEX.test(pin)
}

function bytesToB64Url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64UrlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveBits(pin, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    { name: ALG },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: ALG, hash: HASH, salt, iterations },
    key,
    KEY_LEN_BITS
  )
  return new Uint8Array(bits)
}

/**
 * Hash a PIN. Returns a self-describing string of the form
 *   pbkdf2$<iter>$<salt>$<hash>
 * @param {string} pin   raw PIN (must already be format-validated by caller)
 * @param {number} [iterations] override for testing; defaults to current OWASP rec
 */
export async function hashPin(pin, iterations = DEFAULT_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const derived = await deriveBits(pin, salt, iterations)
  return `pbkdf2$${iterations}$${bytesToB64Url(salt)}$${bytesToB64Url(derived)}`
}

/**
 * Verify a PIN against a stored hash. Returns false (never throws) on any
 * malformed input — callers should treat false as "wrong PIN" without
 * leaking the difference between "wrong" and "corrupt hash".
 */
export async function verifyPin(pin, storedHash) {
  if (typeof pin !== 'string' || pin.length === 0) return false
  if (typeof storedHash !== 'string') return false
  const parts = storedHash.split('$')
  if (parts.length !== 4) return false
  if (parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations <= 0) return false
  let salt, expected
  try {
    salt = b64UrlToBytes(parts[2])
    expected = b64UrlToBytes(parts[3])
  } catch {
    return false
  }
  let derived
  try {
    derived = await deriveBits(pin, salt, iterations)
  } catch {
    return false
  }
  if (derived.length !== expected.length) return false
  // Constant-time compare so a wrong-PIN response time doesn't leak position.
  let mismatch = 0
  for (let i = 0; i < derived.length; i++) mismatch |= derived[i] ^ expected[i]
  return mismatch === 0
}
