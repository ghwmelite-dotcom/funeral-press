import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FamilyHeadApprovalView } from '../components/family-head/FamilyHeadApprovalView.jsx'

// TODO: backend route GET /memorials/approval-lookup?token=<token> does not
// exist yet on donation-api. The plan calls it /api/approval/lookup but the
// canonical worker path should be /memorials/approval-lookup. A small follow-up
// task should add this read-only endpoint to donation-api.js. It decodes the
// approval JWT, looks up the memorial, and returns the public details needed
// for the approval page (deceased name, dates, donation settings, family head
// name + masked phone). Tests mock fetch.
const APPROVAL_LOOKUP_URL = (token) =>
  `/api/approval/lookup?token=${encodeURIComponent(token)}`

export default function FamilyHeadApprovalPage() {
  const { token } = useParams()
  const [memorial, setMemorial] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(APPROVAL_LOOKUP_URL(token))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Invalid or expired link'))))
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
