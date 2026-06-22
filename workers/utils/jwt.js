// Workers-compatible JWT (HS256) — no Node libs.

// Fail closed on a missing secret. If JWT_SECRET is ever unset/empty on a
// redeploy, `secret` arrives as undefined and TextEncoder coerces it to the
// literal string "undefined" — a known, forgeable HMAC key (incl. admin
// tokens, since authz trusts the JWT `sub`). Reject rather than key off that.
// (Minimum-length/strength policy belongs in deploy/CI, not the crypto path.)
function hasSecret(secret) {
  return typeof secret === 'string' && secret.length > 0
}

export async function signJWT(payload, secret) {
  if (!hasSecret(secret)) {
    throw new Error('JWT_SECRET is missing — refusing to sign a token')
  }
  const header = { alg: 'HS256', typ: 'JWT' }
  const enc = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = `${headerB64}.${payloadB64}`
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sigB64}`
}

export async function verifyJWT(token, secret) {
  try {
    // Reject every token rather than verify against a missing key.
    if (!hasSecret(secret)) return null
    const parts = (token || '').split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, sigB64] = parts
    if (!headerB64 || !payloadB64 || !sigB64) return null
    const enc = new TextEncoder()
    const data = `${headerB64}.${payloadB64}`
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data))
    if (!valid) return null
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
