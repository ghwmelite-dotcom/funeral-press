// FuneralPress Twitter Bot Worker
// Bindings: DB (D1), TWITTER_API_KEY, TWITTER_API_SECRET,
//           TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET, TRIGGER_KEY

import * as Sentry from '@sentry/cloudflare'

// ---------------------------------------------------------------------------
// Evergreen tips — posted when the queue is empty
// ---------------------------------------------------------------------------
const EVERGREEN_TIPS = [
  'Planning ahead can ease the burden on your loved ones. Start with a budget \u2192 funeralpress.org/budget-planner #FuneralPlanning #Ghana',
  'Did you know? FuneralPress supports 11+ professional brochure themes for funeral programmes. Explore them \u2192 funeralpress.org/themes #FuneralPlanning #Ghana',
  'Create a beautiful online memorial page to honour your loved one\u2019s memory \u2192 funeralpress.org/memorial #FuneralPlanning #Ghana',
  'Send digital funeral invitations instantly via WhatsApp or SMS \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'Keep track of every funeral expense with the FuneralPress Budget Planner \u2192 funeralpress.org/budget-planner #FuneralPlanning #Ghana',
  'Never miss an important anniversary. Set reminders for memorial dates \u2192 funeralpress.org/reminders #FuneralPlanning #Ghana',
  'Stream the funeral service live so distant family can participate \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'Let mourners leave heartfelt messages in a digital Guest Book \u2192 funeralpress.org/guest-book #FuneralPlanning #Ghana',
  'Say thank you beautifully \u2014 design custom thank-you cards with FuneralPress \u2192 funeralpress.org/themes #FuneralPlanning #Ghana',
  'Browse our Hymn Library for popular funeral hymns and lyrics \u2192 funeralpress.org/hymns #FuneralPlanning #Ghana',
  'Find trusted funeral venues near you with the FuneralPress Venue Directory \u2192 funeralpress.org/venues #FuneralPlanning #Ghana',
  'Write and share a lasting obituary online \u2192 funeralpress.org/obituary #FuneralPlanning #Ghana',
  'Create stunning photo collages to celebrate a life well lived \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'Design eye-catching funeral posters and banners in minutes \u2192 funeralpress.org/themes #FuneralPlanning #Ghana',
  'Generate a QR code that links straight to the memorial page \u2014 perfect for printed programmes \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'Personalise Aseda cloth labels for your thanksgiving gifts \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'FuneralPress is Ghana\u2019s all-in-one platform for dignified funeral planning \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'From brochure design to budget tracking \u2014 FuneralPress handles it all \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'Organising a one-week observation? Design the programme with FuneralPress \u2192 funeralpress.org #FuneralPlanning #Ghana',
  'Join hundreds of families who trust FuneralPress for memorial planning \u2192 funeralpress.org #FuneralPlanning #Ghana',
]

// ---------------------------------------------------------------------------
// OAuth 1.0a helpers (Web Crypto API — no Node.js crypto)
// ---------------------------------------------------------------------------

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

function generateNonce() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSha1(key, data) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function buildOAuthHeader(method, url, env) {
  const oauthParams = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  // Collect all params for the signature base string.
  // For POST with JSON body, only OAuth params go into the signature base
  // (the JSON body is NOT form-encoded, so it is excluded per the OAuth spec).
  const paramPairs = Object.entries(oauthParams)
    .map(([k, v]) => [percentEncode(k), percentEncode(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))

  const paramString = paramPairs.map(([k, v]) => `${k}=${v}`).join('&')

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&')

  const signingKey =
    percentEncode(env.TWITTER_API_SECRET) +
    '&' +
    percentEncode(env.TWITTER_ACCESS_TOKEN_SECRET)

  const signature = await hmacSha1(signingKey, baseString)

  oauthParams.oauth_signature = signature

  const header = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')

  return `OAuth ${header}`
}

// ---------------------------------------------------------------------------
// X API v2 — post a tweet
// ---------------------------------------------------------------------------

const TWITTER_TWEET_URL = 'https://api.twitter.com/2/tweets'

async function postTweet(text, env) {
  const auth = await buildOAuthHeader('POST', TWITTER_TWEET_URL, env)

  const res = await fetch(TWITTER_TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'User-Agent': 'FuneralPress-Bot/1.0',
    },
    body: JSON.stringify({ text }),
  })

  const data = await res.json()

  if (!res.ok) {
    const detail = data?.detail || data?.errors?.[0]?.message || JSON.stringify(data)
    throw new Error(`Twitter API ${res.status}: ${detail}`)
  }

  return data // { data: { id, text } }
}

// ---------------------------------------------------------------------------
// Core logic — process the tweet queue
// ---------------------------------------------------------------------------

async function processTweetQueue(env) {
  const db = env.DB

  // 1. Grab next pending tweet
  const row = await db
    .prepare(
      `SELECT * FROM tweet_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1`,
    )
    .first()

  let target = row

  // 2. If queue is empty, insert a random evergreen tip (avoiding recent duplicates)
  if (!target) {
    const recentTips = await db
      .prepare(`SELECT content FROM tweet_queue WHERE source = 'evergreen' AND status = 'posted' ORDER BY posted_at DESC LIMIT 5`)
      .all()
    const recentSet = new Set((recentTips.results || []).map((r) => r.content))
    const available = EVERGREEN_TIPS.filter((t) => !recentSet.has(t))
    const pool = available.length > 0 ? available : EVERGREEN_TIPS
    const tip = pool[Math.floor(Math.random() * pool.length)]
    const insert = await db
      .prepare(
        `INSERT INTO tweet_queue (source, content, priority, status) VALUES (?, ?, 0, 'pending')`,
      )
      .bind('evergreen', tip)
      .run()

    target = {
      id: insert.meta?.last_row_id,
      source: 'evergreen',
      content: tip,
      status: 'pending',
    }
  }

  // 3. Attempt to post
  try {
    const tweetText = target.url ? `${target.content} ${target.url}` : target.content
    if (tweetText.length > 280) {
      throw new Error(`Tweet exceeds 280 chars (${tweetText.length})`)
    }
    const result = await postTweet(tweetText, env)
    const tweetId = result?.data?.id || null

    await db
      .prepare(
        `UPDATE tweet_queue SET status = 'posted', tweet_id = ?, posted_at = datetime('now') WHERE id = ?`,
      )
      .bind(tweetId, target.id)
      .run()

    return { ok: true, tweetId, content: target.content }
  } catch (err) {
    await db
      .prepare(`UPDATE tweet_queue SET status = 'failed', error = ? WHERE id = ?`)
      .bind(err.message, target.id)
      .run()

    return { ok: false, error: err.message, content: target.content }
  }
}

// ---------------------------------------------------------------------------
// HTTP handlers (health + manual trigger)
// ---------------------------------------------------------------------------

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function handleHealth(env) {
  const pending = await env.DB
    .prepare(`SELECT COUNT(*) AS count FROM tweet_queue WHERE status = 'pending'`)
    .first()
  const posted = await env.DB
    .prepare(`SELECT COUNT(*) AS count FROM tweet_queue WHERE status = 'posted'`)
    .first()
  const failed = await env.DB
    .prepare(`SELECT COUNT(*) AS count FROM tweet_queue WHERE status = 'failed'`)
    .first()

  return json({
    status: 'ok',
    queue: {
      pending: pending?.count ?? 0,
      posted: posted?.count ?? 0,
      failed: failed?.count ?? 0,
    },
  })
}

async function handleTrigger(request, env) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')

  if (!key || key !== env.TRIGGER_KEY) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const result = await processTweetQueue(env)
  return json(result)
}

// ---------------------------------------------------------------------------
// Worker exports
// ---------------------------------------------------------------------------

const handler = {
  // HTTP handler
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return handleHealth(env)
    }
    if (url.pathname === '/trigger') {
      return handleTrigger(request, env)
    }

    return json({ error: 'Not found' }, 404)
  },

  // Cron Trigger handler (every 12 hours)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processTweetQueue(env))
  },
}

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT || 'production',
    tracesSampleRate: 0.1,
  }),
  handler
)
