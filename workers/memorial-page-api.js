/**
 * Cloudflare Worker - Memorial Page API
 *
 * POST / - Save memorial data, returns unique ID
 * GET /:id - Retrieve memorial data
 *
 * DEPLOYMENT:
 * 1. Create KV namespace "MEMORIAL_PAGES" in Cloudflare Dashboard
 * 2. Create Worker named "brochure-memorial-api"
 * 3. Bind KV namespace: MEMORIAL_PAGES_KV -> MEMORIAL_PAGES
 * 4. Deploy this code
 * 5. Bind D1 database: DB -> funeralpress-db (for tweet queue + notifications)
 * 6. Set secret: RESEND_API_KEY (for admin email notifications)
 */

import * as Sentry from '@sentry/cloudflare'
import { checkRateLimit } from './utils/rateLimiter.js'

const PROD_ORIGINS = [
  'https://funeral-brochure-app.pages.dev',
  'https://funeralpress.org',
  'https://www.funeralpress.org',
]
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

function allowedOrigins(env) {
  return env?.ENVIRONMENT === 'dev' ? [...PROD_ORIGINS, ...DEV_ORIGINS] : PROD_ORIGINS
}

function getCorsOrigin(request) {
  const origin = request.headers.get('Origin') || ''
  const env = request.__env
  if (allowedOrigins(env).includes(origin) || origin.endsWith('.funeral-brochure-app.pages.dev')) {
    return origin
  }
  return PROD_ORIGINS[0]
}

function makeCorsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": request ? getCorsOrigin(request) : PROD_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

const ADMIN_EMAIL = 'oh84dev@funeralpress.org'

async function notifyAdmin(env, type, title, detail = {}) {
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO admin_notifications (type, title, detail) VALUES (?, ?, ?)`
      ).bind(type, title, JSON.stringify(detail)).run()
    } catch (e) {
      console.error('Notification insert failed:', e.message)
    }
  }
  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FuneralPress <notifications@funeralpress.org>',
          to: [ADMIN_EMAIL],
          subject: `[FuneralPress] ${title}`,
          text: `${title}\n\nDetails:\n${Object.entries(detail).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n\nTime: ${new Date().toISOString()}\n\nView dashboard: https://funeralpress.org/admin`,
        }),
      })
    } catch (e) {
      console.error('Resend email failed:', e.message)
    }
  }
}

async function handlePost(request, env) {
  try {
    const body = await request.json()

    if (!body.fullName) {
      return new Response(JSON.stringify({ error: "Missing fullName" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
      })
    }

    // Generate unique ID or use existing
    let id = body.memorialId || generateId()

    // Check for collision
    const existing = await env.MEMORIAL_PAGES_KV.get(id)
    if (existing && !body.memorialId) {
      id = generateId() + id.slice(0, 2)
    }

    // Generate slug from fullName for human-readable donation URLs (/m/:slug/donate).
    // Format: lowercase, hyphenated, ASCII-only, max 60 chars, suffix with last 6
    // chars of memorial id to guarantee uniqueness.
    const slug =
      body.slug ||
      `${(body.fullName || 'memorial')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50)}-${id.slice(-6)}`

    // Store without TTL — memorial pages are marketed as permanent and must
    // never silently expire. Cloudflare KV with no expirationTtl persists
    // until manually deleted. If KV bloat becomes a real problem in the
    // future (years out, given memorial volume), add a soft-delete flow then.
    await env.MEMORIAL_PAGES_KV.put(id, JSON.stringify({
      ...body,
      slug,
      publishedAt: new Date().toISOString(),
    }))

    // Queue anonymized tweet for X auto-poster
    if (env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO tweet_queue (source, content, url, priority) VALUES (?, ?, ?, ?)`
        ).bind(
          'memorial',
          'A new memorial page has been created on FuneralPress. Honor their memory and leave a tribute \u2192',
          `https://funeralpress.org/memorial/${id}`,
          3
        ).run()
      } catch (e) {
        console.error('Tweet queue insert failed:', e.message)
      }
    }

    // Notify admin
    notifyAdmin(env, 'memorial_created', `Memorial page created: ${body.fullName}`, {
      name: body.fullName,
      url: `https://funeralpress.org/memorial/${id}`,
    })

    return new Response(JSON.stringify({ id, url: `https://funeralpress.org/memorial/${id}` }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
    })
  }
}

async function handleGet(id, env, request) {
  try {
    const data = await env.MEMORIAL_PAGES_KV.get(id)

    if (!data) {
      return new Response(JSON.stringify({ error: "Memorial not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
      })
    }

    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
    })
  }
}

const handler = {
  async fetch(request, env) {
    // Stash env on request so CORS helpers can gate localhost behind ENVIRONMENT=dev
    request.__env = env
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: makeCorsHeaders(request) })
    }

    const url = new URL(request.url)

    // Health check (no auth, no rate limit)
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'memorial-api',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...makeCorsHeaders(request) },
        }
      )
    }

    const path = url.pathname.replace(/^\//, '')

    if (env.RATE_LIMITS) {
      const isWrite = request.method === 'POST'
      const limited = await checkRateLimit(
        request,
        env.RATE_LIMITS,
        isWrite ? 'memorial:write' : 'memorial:read',
        isWrite ? 10 : 120
      )
      if (limited) {
        const body = await limited.text()
        return new Response(body, {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...makeCorsHeaders(request) },
        })
      }
    }

    if (request.method === "POST" && (!path || path === '')) {
      return handlePost(request, env)
    }

    if (request.method === "GET" && path) {
      return handleGet(path, env, request)
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...makeCorsHeaders(request) }
    })
  }
}

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT || 'production',
    tracesSampleRate: 0.1,
  }),
  handler
)
