/**
 * Cloudflare Worker - Brochure AI Writer
 *
 * Handles 3 writing modes: tribute, biography, acknowledgements
 * Uses Cloudflare Workers AI (no API key needed)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
}

function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders })
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

async function handlePost(request, env) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (!type || !['tribute', 'biography', 'acknowledgements'].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid type. Use: tribute, biography, or acknowledgements" }), {
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

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return handleOptions()
    if (request.method === "POST") return handlePost(request, env)
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
}
