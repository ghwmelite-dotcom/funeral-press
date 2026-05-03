/**
 * Cloudflare Worker - Brochure AI Writer
 *
 * Handles 3 writing modes: tribute, biography, acknowledgements
 * Uses Cloudflare Workers AI (no API key needed)
 */

import * as Sentry from '@sentry/cloudflare'

const ALLOWED_ORIGINS = [
  'https://funeralpress.org',
  'https://www.funeralpress.org',
  'https://funeral-brochure-app.pages.dev',
]

function corsHeadersFor(origin, env) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    (origin && origin.endsWith('.funeral-brochure-app.pages.dev'))
  if (env?.ENVIRONMENT === 'dev' && origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://funeralpress.org',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function handleOptions(request, env) {
  const origin = request.headers.get('Origin')
  return new Response(null, { status: 204, headers: corsHeadersFor(origin, env) })
}

function buildPrompt(type, data) {
  const { relationship, memories, tone, name, deceasedName } = data

  if (type === 'tribute') {
    return `You are helping someone write a heartfelt tribute for a funeral brochure. Write a dignified, warm tribute paragraph.

Details:
- Deceased: ${deceasedName || 'the deceased'}
- Tribute by: ${relationship || 'a loved one'}
- Key memories/qualities: ${memories || 'loving, kind, faithful'}
- Desired tone: ${tone || 'warm and respectful'}
${name ? `- Writer's name: ${name}` : ''}

Write 2-4 paragraphs (200-300 words) for a tribute section. Be warm, dignified, culturally respectful. Include touches of faith if appropriate. Do not use quotation marks around the text. Write directly.`
  }

  if (type === 'biography') {
    return `You are helping someone write a biography for a funeral brochure. Write a dignified life story.

Details:
- Name: ${deceasedName || 'the deceased'}
- Key life details: ${memories || 'a life well lived'}
- Tone: ${tone || 'dignified and warm'}

Write 3-5 paragraphs (300-500 words) covering birth, education, career, family, faith, and legacy. Be warm and respectful. Write directly without quotation marks.`
  }

  if (type === 'acknowledgements') {
    return `You are helping someone write acknowledgements for a funeral brochure. Write a heartfelt thank you message.

Details:
- Family name: ${name || 'The Family'}
- Deceased: ${deceasedName || 'the deceased'}
- Tone: ${tone || 'grateful and warm'}

Write 1-2 paragraphs (100-200 words) thanking everyone who supported the family. Include thanks to clergy, medical staff, friends, family, and well-wishers. Be warm and genuine. Write directly.`
  }

  return 'Write a heartfelt message for a funeral brochure.'
}

function buildWizardPrompt(data) {
  const { name, age, dob, dateOfPassing, placeOfPassing, occupation, hobbies, traits, achievements, survivedBy, specialRelationships, familyMotto, denomination, churchName, favoriteHymns, culturalCustoms, tone, specialInstructions } = data

  return `You are an expert funeral content writer specializing in Ghanaian funeral traditions. Write THREE pieces of content for a funeral programme.

DECEASED INFORMATION:
- Full Name: ${name || 'the deceased'}
- Age: ${age || 'unknown'}
- Date of Birth: ${dob || 'unknown'}
- Date of Passing: ${dateOfPassing || 'unknown'}
- Place of Passing: ${placeOfPassing || 'unknown'}

LIFE & PERSONALITY:
- Occupation: ${occupation || 'unknown'}
- Hobbies: ${hobbies || 'none specified'}
- Personality Traits: ${traits || 'none specified'}
- Key Achievements: ${achievements || 'none specified'}

FAMILY:
- Survived By: ${survivedBy || 'family members'}
- Special Relationships: ${specialRelationships || 'none specified'}
- Family Motto: ${familyMotto || 'none'}

FAITH & CULTURE:
- Denomination: ${denomination || 'Christian'}
- Church: ${churchName || 'not specified'}
- Favorite Hymns: ${favoriteHymns || 'none specified'}
- Cultural Customs: ${culturalCustoms || 'Ghanaian traditions'}

TONE: ${tone || 'warm'}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ''}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{"obituary":"[~300 words obituary]","eulogy":"[~500 words eulogy]","programme_intro":"[~150 words programme introduction]"}

Write with warmth, dignity, and cultural sensitivity. Include references to faith and Ghanaian customs where appropriate.`
}

async function handlePost(request, env) {
  const corsHeaders = corsHeadersFor(request.headers.get('Origin'), env)
  try {
    const body = await request.json()

    // New wizard mode
    if (body.mode === 'wizard') {
      const prompt = buildWizardPrompt(body)

      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: "You are a compassionate funeral content writer. You MUST respond with valid JSON only. No markdown, no code blocks, no extra text. Just the JSON object with obituary, eulogy, and programme_intro fields."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
      })

      if (!result || !result.response) {
        return new Response(JSON.stringify({ error: "AI service returned no response" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        })
      }

      // Parse the JSON response
      let parsed
      try {
        // Strip any markdown code block wrappers the model might add
        const cleaned = result.response.trim().replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        // If JSON parse fails, return the raw text as obituary
        parsed = {
          obituary: result.response.trim(),
          eulogy: '',
          programme_intro: '',
        }
      }

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // Legacy single-type mode (existing behavior)
    const { type, ...data } = body

    if (!type || !['tribute', 'biography', 'acknowledgements'].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid type. Use: tribute, biography, acknowledgements, or mode: 'wizard'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    const prompt = buildPrompt(type, data)

    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a compassionate and eloquent writer who specializes in writing funeral brochure content. You write with warmth, dignity, and cultural sensitivity. You never wrap your output in quotation marks."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1024,
    })

    if (!result || !result.response) {
      return new Response(JSON.stringify({ error: "AI service returned no response" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    return new Response(JSON.stringify({ text: result.response.trim() }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
}

const handler = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return handleOptions(request, env)

    const url = new URL(request.url)

    // Health check (no auth, no rate limit)
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'ai-writer',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeadersFor(request.headers.get('Origin'), env),
          },
        }
      )
    }

    if (request.method === "POST") return handlePost(request, env)
    const corsHeaders = corsHeadersFor(request.headers.get('Origin'), env)
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
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
