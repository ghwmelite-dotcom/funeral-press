const AI_WRITER_URL = 'https://brochure-ai-writer.ghwmelite.workers.dev'

export async function generateAIText(type, data) {
  const response = await fetch(AI_WRITER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...data }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'AI service unavailable')
  }

  const result = await response.json()
  return result.text
}
