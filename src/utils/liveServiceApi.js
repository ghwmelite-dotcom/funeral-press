const LIVE_SERVICE_API_URL = 'https://brochure-live-service-api.ghwmelite.workers.dev'

export async function publishLiveService(data) {
  const response = await fetch(LIVE_SERVICE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to publish live service')
  }
  return response.json()
}

export async function getLiveService(id) {
  const response = await fetch(`${LIVE_SERVICE_API_URL}/${id}`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Not found' }))
    throw new Error(err.error || 'Live service not found')
  }
  return response.json()
}
