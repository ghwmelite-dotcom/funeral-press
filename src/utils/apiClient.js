import { useAuthStore } from '../stores/authStore'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

export async function apiFetch(path, options = {}) {
  const { auth = true, ...rest } = options

  // Absolute URLs (e.g. donation-api on a different worker) bypass API_BASE.
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`

  const headers = { ...rest.headers }
  if (!(rest.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let token = null
  if (auth) {
    token = await useAuthStore.getState().getToken()
    if (!token) throw new Error('Not authenticated')
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(url, { ...rest, headers })

  // Retry once on 401 (token may have just expired) — only for authed calls
  if (auth && res.status === 401) {
    const newToken = await useAuthStore.getState().getToken()
    if (newToken && newToken !== token) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, { ...rest, headers })
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function apiUploadImage(designId, fieldPath, blob) {
  const formData = new FormData()
  formData.append('file', blob)
  formData.append('designId', designId)
  formData.append('fieldPath', fieldPath)

  const token = await useAuthStore.getState().getToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE}/images/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) throw new Error('Image upload failed')
  const data = await res.json()
  return `${API_BASE}${data.url}`
}
