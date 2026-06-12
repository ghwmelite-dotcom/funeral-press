// workers/blogDraft.js
// AI blog draft generation rules (spec §4.6). Pure functions — the cron glue
// in auth-api.js owns DB and AI bindings. Nothing here auto-publishes.

const ALLOWED_BLOCK_TYPES = ['paragraph', 'heading', 'list', 'cta']

export function draftPrompt(topic) {
  return [
    `Write a blog post for FuneralPress (funeralpress.org), a funeral design and memorial platform for Ghana and the diaspora, on this topic: "${topic}".`,
    'Voice: warm, practical, dignified. UK spelling. No exclamation marks. Assume the reader is planning or attending a Ghanaian funeral.',
    'Length: 900-1300 words across the content blocks.',
    'Respond with ONLY a JSON object (no markdown, no code fences) of this exact shape:',
    '{"title": string (50-70 chars, no clickbait), "description": string (140-160 chars), "keywords": string[] (4-7 search phrases), "content": [{"type": "paragraph", "text": string} | {"type": "heading", "text": string} | {"type": "list", "items": string[]} | {"type": "cta", "text": string, "link": "/budget-planner" | "/funeral-brochure-designer" | "/memorial-page-creator" | "/hymns"}]}',
    'Structure: opening paragraph answering the query directly in 40-60 words (featured-snippet style), then 4-6 heading sections with paragraphs/lists, ending with one cta block.',
  ].join('\n')
}

export function parseDraft(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let draft
  try {
    draft = JSON.parse(cleaned)
  } catch {
    throw new Error('Draft is not valid JSON')
  }
  if (!draft.title || typeof draft.title !== 'string') throw new Error('Draft missing title')
  if (!draft.description || draft.description.length < 50) throw new Error('Draft missing/short description')
  if (!Array.isArray(draft.keywords)) throw new Error('Draft keywords must be an array')
  if (!Array.isArray(draft.content) || draft.content.length < 3) throw new Error('Draft content too short')
  for (const block of draft.content) {
    if (!ALLOWED_BLOCK_TYPES.includes(block.type)) throw new Error(`Bad block type: ${block.type}`)
    if (block.type === 'list' && !Array.isArray(block.items)) throw new Error('List block missing items')
    if (block.type !== 'list' && typeof block.text !== 'string') throw new Error(`Block missing text: ${block.type}`)
  }
  return draft
}

export function draftSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
