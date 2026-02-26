/**
 * Cloudflare Worker - Brochure Share API
 *
 * POST / - Save brochure, return 6-char share code
 * GET /:code - Load shared brochure
 * PUT /:code - Update shared brochure
 *
 * DEPLOYMENT:
 * 1. Create KV namespace "BROCHURE_SHARES" in Cloudflare Dashboard
 * 2. Create Worker named "brochure-share-api"
 * 3. Bind KV namespace: BROCHURES_KV -> BROCHURE_SHARES
 * 4. Deploy this code
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function handlePost(request, env) {
  try {
    const body = await request.json()

    if (!body.fullName) {
      return new Response(JSON.stringify({ error: "Missing brochure data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // Generate unique 6-char code
    let code = generateCode()
    let attempts = 0
    while (await env.BROCHURES_KV.get(code) && attempts < 5) {
      code = generateCode()
      attempts++
    }

    // Store with 30-day TTL
    await env.BROCHURES_KV.put(code, JSON.stringify({
      ...body,
      sharedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }), { expirationTtl: 30 * 24 * 60 * 60 })

    return new Response(JSON.stringify({
      code,
      url: `https://funeralpress.org/?share=${code}`,
    }), {
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

async function handleGet(code, env) {
  try {
    const data = await env.BROCHURES_KV.get(code)

    if (!data) {
      return new Response(JSON.stringify({ error: "Shared brochure not found or expired" }), {
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

async function handlePut(code, request, env) {
  try {
    const existing = await env.BROCHURES_KV.get(code)
    if (!existing) {
      return new Response(JSON.stringify({ error: "Share code not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    const body = await request.json()

    // Update with fresh TTL
    await env.BROCHURES_KV.put(code, JSON.stringify({
      ...body,
      updatedAt: new Date().toISOString(),
    }), { expirationTtl: 30 * 24 * 60 * 60 })

    return new Response(JSON.stringify({ code, updated: true }), {
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

    if (request.method === "PUT" && path) {
      return handlePut(path, request, env)
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
}
