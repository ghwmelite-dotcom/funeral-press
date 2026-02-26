const MEMORIAL_API_URL = 'https://brochure-memorial-api.ghwmelite.workers.dev'

export async function publishMemorial(data) {
  const response = await fetch(MEMORIAL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to publish memorial')
  }
  return response.json()
}

export async function getMemorial(id) {
  const response = await fetch(`${MEMORIAL_API_URL}/${id}`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Not found' }))
    throw new Error(err.error || 'Memorial not found')
  }
  return response.json()
}
