import { useEffect } from 'react'
import { useDonationStore } from '../../stores/donationStore.js'
import { ProgressBar } from './ProgressBar.jsx'
import { DonateButton } from './DonateButton.jsx'
import { DonorWall } from './DonorWall.jsx'
import { ShareDonationDialog } from './ShareDonationDialog.jsx'

export function DonatePanel({ memorial }) {
  const walls = useDonationStore((s) => s.walls)
  const loadWall = useDonationStore((s) => s.loadWall)
  const wall = walls[memorial.id]

  useEffect(() => {
    if (memorial.donation?.enabled && memorial.donation?.approval_status === 'approved') {
      loadWall(memorial.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memorial.id, memorial.donation?.enabled, memorial.donation?.approval_status])

  if (!memorial.donation?.enabled || memorial.donation.approval_status !== 'approved') {
    return null
  }

  // Resolve display values: prefer freshly-loaded wall data, fall back to
  // values embedded on the memorial object (KV cache).
  const raised = wall?.total_raised_pesewas ?? memorial.donation.total_raised_pesewas ?? 0
  const donorCount = wall?.total_donor_count ?? memorial.donation.total_donor_count ?? 0
  const donorLabel = donorCount === 1 ? '1 person has donated' : `${donorCount} people have donated`

  return (
    <section className="bg-muted border border-border rounded-2xl p-6 my-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">
        In memory of {memorial.deceased_name}
      </h3>

      <ProgressBar raised={raised} goal={memorial.donation.goal_amount_pesewas} />

      <p className="text-muted-foreground mt-2">{donorLabel}</p>

      <div className="flex gap-3 mt-4">
        <DonateButton slug={memorial.slug} />
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
