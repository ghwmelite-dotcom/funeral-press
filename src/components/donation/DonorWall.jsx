import { useDonationStore } from '../../stores/donationStore.js'
import { formatMinor } from '../../utils/currency.js'

function relativeTime(ts) {
  const diff = Date.now() - ts
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-GH')
}

export function DonorWall({ memorialId }) {
  const walls = useDonationStore((s) => s.walls)
  const wallLoading = useDonationStore((s) => s.wallLoading)
  const loadWall = useDonationStore((s) => s.loadWall)
  const wall = walls[memorialId]

  if (!wall || !wall.donations) return null

  const showAmounts = wall.wall_mode === 'full'
  const isLoading = !!wallLoading[memorialId]

  return (
    <div>
      <h4 className="text-lg font-medium text-foreground mb-3">Recent donations</h4>
      <ul className="divide-y divide-border">
        {wall.donations.map((d) => (
          <li key={d.id} className="py-3 flex justify-between items-center">
            <span className="text-foreground">{d.display_name}</span>
            <span className="flex items-center gap-3 text-muted-foreground text-sm">
              {showAmounts && d.amount_pesewas !== undefined && (
                <span className="text-foreground font-medium">
                  {formatMinor(d.amount_pesewas, 'GHS')}
                </span>
              )}
              <span>{relativeTime(d.created_at)}</span>
            </span>
          </li>
        ))}
      </ul>
      {wall.next_cursor && (
        <button
          onClick={() => loadWall(memorialId, wall.next_cursor)}
          disabled={isLoading}
          className="mt-4 w-full text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Loading…' : 'Show more'}
        </button>
      )}
    </div>
  )
}
