import { useEffect, useState } from 'react'
import { useDonationStore } from '../../stores/donationStore.js'
import { ProgressBar } from './ProgressBar.jsx'
import { DonateButton } from './DonateButton.jsx'
import { DonorWall } from './DonorWall.jsx'
import { ShareDonationDialog } from './ShareDonationDialog.jsx'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'

export function DonatePanel({ memorial }) {
  const walls = useDonationStore((s) => s.walls)
  const loadWall = useDonationStore((s) => s.loadWall)
  const wall = walls[memorial.id]

  // When DonatePanel is embedded on MemorialPage, the memorial object comes
  // from memorial-page-api in camelCase and lacks a `donation` field. Self-fetch
  // donation status so the panel works whether the parent provides `donation`
  // or not.
  const [fetchedStatus, setFetchedStatus] = useState(null)

  useEffect(() => {
    if (memorial.donation) return
    if (!memorial.id) return
    let cancelled = false
    fetch(`${DONATION_API}/memorials/${encodeURIComponent(memorial.id)}/donation-status`)
      .then(async (r) => {
        if (!r.ok) return null
        const ct = r.headers.get('content-type') || ''
        if (!ct.includes('application/json')) return null
        return r.json()
      })
      .then((data) => {
        if (!cancelled && data) setFetchedStatus(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [memorial.id, memorial.donation])

  const donation = memorial.donation || fetchedStatus?.donation
  const deceasedName =
    memorial.deceased_name ||
    fetchedStatus?.deceased_name ||
    memorial.fullName ||
    null

  useEffect(() => {
    if (donation?.enabled && donation?.approval_status === 'approved') {
      loadWall(memorial.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memorial.id, donation?.enabled, donation?.approval_status])

  if (!donation?.enabled || donation.approval_status !== 'approved') {
    return null
  }

  // Resolve display values: prefer freshly-loaded wall data, fall back to
  // values embedded on the memorial object (KV cache).
  const raised = wall?.total_raised_pesewas ?? donation.total_raised_pesewas ?? 0
  const donorCount = wall?.total_donor_count ?? donation.total_donor_count ?? 0
  const donorLabel = donorCount === 1 ? '1 person has donated' : `${donorCount} people have donated`

  return (
    <section className="bg-muted border border-border rounded-2xl p-6 my-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">
        In memory of {deceasedName}
      </h3>

      <ProgressBar raised={raised} goal={donation.goal_amount_pesewas} />

      <p className="text-muted-foreground mt-2">{donorLabel}</p>

      <div className="flex gap-3 mt-4">
        <DonateButton slug={memorial.slug || fetchedStatus?.slug} />
        <ShareDonationDialog memorial={memorial} />
      </div>

      {wall && wall.wall_mode !== 'private' && wall.donations?.length > 0 && (
        <div className="mt-6">
          <DonorWall memorialId={memorial.id} />
        </div>
      )}
    </section>
  )
}
