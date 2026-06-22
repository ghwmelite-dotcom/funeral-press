import { useState, useCallback } from 'react'

// The worker is served on its custom route; the *.workers.dev preview subdomain
// is disabled (returns Cloudflare error 1042), so pointing here is required for
// sharing to work in production.
const SHARE_API_URL = 'https://share-api.funeralpress.org'

export function useShareBrochure() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const shareBrochure = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(SHARE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Failed to share brochure')
      }
      return response.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadShared = useCallback(async (code) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${SHARE_API_URL}/${code}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Not found' }))
        throw new Error(err.error || 'Shared brochure not found')
      }
      return response.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Note: shares are immutable by design (the server has no update endpoint —
  // an unauthenticated PUT would let anyone overwrite a shared brochure). To
  // change a share, call shareBrochure again for a fresh code.

  return { shareBrochure, loadShared, loading, error }
}
