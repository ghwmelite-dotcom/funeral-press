import { apiFetch } from './apiClient'

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

// ─── Memorial Premium (one-time "Forever Tribute" unlock) ──────────────────
// Premium endpoints live on auth-api. Status is public; init/verify need auth.

export async function getMemorialPremium(id) {
  try {
    return await apiFetch(`/memorial-premium/${id}`, { auth: false })
  } catch {
    return { premium: false, tier: null }
  }
}

export async function initMemorialPremium(memorialId) {
  return apiFetch('/memorial-premium/initialize', {
    method: 'POST',
    body: JSON.stringify({ memorialId }),
  })
}

export async function verifyMemorialPremium(reference) {
  return apiFetch('/memorial-premium/verify', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  })
}

// ─── AI Tribute Video (premium-gated, Shotstack-rendered) ──────────────────

export async function createTributeVideo(memorialId, payload) {
  return apiFetch(`/memorial-premium/${memorialId}/tribute-video`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getTributeVideoStatus(videoId) {
  return apiFetch(`/tribute-video/${videoId}/status`, { auth: false })
}

// ─── Candle / Flower / Tribute wall (public-facing paid tributes) ───────────

export async function getTributes(memorialId) {
  return apiFetch(`/memorial/${memorialId}/tributes`, { auth: false })
}

export async function initTribute(memorialId, { type, authorName, email, message }) {
  return apiFetch(`/memorial/${memorialId}/tributes`, {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ type, authorName, email, message }),
  })
}

export async function verifyTribute(reference) {
  return apiFetch(`/tribute/${reference}/verify`, { auth: false })
}
