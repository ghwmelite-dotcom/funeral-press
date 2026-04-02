const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://funeralpress-images.*.r2.dev",
    "connect-src 'self' https://funeralpress-auth-api.ghwmelite.workers.dev https://api.paystack.co",
    "frame-src https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * Wrap a Response with security headers.
 * Clones the response and appends all security headers.
 * @param {Response} response - original response
 * @returns {Response} - new response with security headers added
 */
export function withSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
