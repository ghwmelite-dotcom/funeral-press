// Rate limiting configuration per route group
export const RATE_LIMITS = {
  auth: 10,        // /auth/* — 10 req/min
  payments: 5,     // /payments/* — 5 req/min
  upload: 20,      // /images/upload — 20 req/min
  sync: 30,        // /designs/sync — 30 req/min
  authenticated: 60, // other authenticated routes — 60 req/min
  public: 120,     // other public routes — 120 req/min
}

/**
 * Check rate limit for a request.
 * @param {Request} request - incoming request
 * @param {KVNamespace} kv - RATE_LIMITS KV namespace
 * @param {string} routeGroup - one of the keys in RATE_LIMITS
 * @param {number} limit - max requests per window
 * @returns {Response|null} - 429 Response if over limit, null if allowed
 */
export async function checkRateLimit(request, kv, routeGroup, limit) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const key = `rate:${ip}:${routeGroup}`
  const current = parseInt(await kv.get(key)) || 0

  if (current >= limit) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    })
  }

  await kv.put(key, String(current + 1), { expirationTtl: 60 })
  return null
}

/**
 * Determine the route group for a given path.
 * @param {string} path - URL pathname
 * @param {boolean} isAuthenticated - whether the request has a valid JWT
 * @returns {[string, number]} - [routeGroup, limit]
 */
export function getRouteGroup(path, isAuthenticated) {
  if (path.startsWith('/auth/')) return ['auth', RATE_LIMITS.auth]
  if (path.startsWith('/payments/')) return ['payments', RATE_LIMITS.payments]
  if (path === '/images/upload') return ['upload', RATE_LIMITS.upload]
  if (path === '/designs/sync') return ['sync', RATE_LIMITS.sync]
  if (isAuthenticated) return ['authenticated', RATE_LIMITS.authenticated]
  return ['public', RATE_LIMITS.public]
}
