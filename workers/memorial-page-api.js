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
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

async function handlePost(request, env) {
  try {
    const body = await request.json()

    if (!body.fullName) {
      return new Response(JSON.stringify({ error: "Missing fullName" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // Generate unique ID or use existing
    let id = body.memorialId || generateId()

    // Check for collision
    const existing = await env.MEMORIAL_PAGES_KV.get(id)
    if (existing && !body.memorialId) {
      id = generateId() + id.slice(0, 2)
    }

    // Store with 1-year TTL (365 days in seconds)
    await env.MEMORIAL_PAGES_KV.put(id, JSON.stringify({
      ...body,
      publishedAt: new Date().toISOString(),
    }), { expirationTtl: 365 * 24 * 60 * 60 })

    return new Response(JSON.stringify({ id, url: `https://funeralpress.org/memorial/${id}` }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
}

async function handleGet(id, env) {
  try {
    const data = await env.MEMORIAL_PAGES_KV.get(id)

    if (!data) {
      return new Response(JSON.stringify({ error: "Memorial not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/^\//, '')

    if (request.method === "POST" && (!path || path === '')) {
      return handlePost(request, env)
    }

    if (request.method === "GET" && path) {
      return handleGet(path, env)
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
}
