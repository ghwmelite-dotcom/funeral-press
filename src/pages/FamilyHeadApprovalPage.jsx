import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FamilyHeadApprovalView } from '../components/family-head/FamilyHeadApprovalView.jsx'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'
const APPROVAL_LOOKUP_URL = (token) =>
  `${DONATION_API}/memorials/approval-lookup?token=${encodeURIComponent(token)}`

export default function FamilyHeadApprovalPage() {
  const { token } = useParams()
  const [memorial, setMemorial] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(APPROVAL_LOOKUP_URL(token))
      .then(async (r) => {
        if (!r.ok) throw new Error('Invalid or expired link')
        // Guard against SPA fallback returning HTML when backend route is missing
        const ct = r.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('Invalid or expired link')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setMemorial(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (error) {
    return <main className="p-8 text-center text-destructive">{error}</main>
  }
  if (!memorial) {
    return <main className="p-8 text-center text-muted-foreground">Loading…</main>
  }
  return <FamilyHeadApprovalView memorial={memorial} token={token} />
}
