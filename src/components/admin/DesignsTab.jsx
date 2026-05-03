import { useEffect } from 'react'
import { Palette } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'

const PRODUCT_LABELS = {
  brochure: 'Funeral Brochure',
  poster: 'Obituary Poster',
  invitation: 'Invitation Card',
  thankYou: 'Thank You Card',
  booklet: 'Programme Booklet',
  banner: 'Banner',
}

const PRODUCT_COLORS = {
  brochure: 'bg-blue-500',
  poster: 'bg-amber-500',
  invitation: 'bg-pink-500',
  thankYou: 'bg-emerald-500',
  booklet: 'bg-purple-500',
  banner: 'bg-orange-500',
}

export default function DesignsTab() {
  const { designs, fetchDesigns, isLoading } = useAdminStore()

  useEffect(() => {
    fetchDesigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading && Object.keys(designs).length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const entries = Object.entries(designs)
  const maxCount = entries.reduce((max, [, count]) => Math.max(max, count), 1)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Designs Unlocked</p>
        </div>
        <p className="text-3xl font-bold text-foreground">{total}</p>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(([type, count]) => (
          <div key={type} className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-medium text-foreground mb-1">{PRODUCT_LABELS[type] || type}</p>
            <p className="text-2xl font-bold text-foreground mb-3">{count}</p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${PRODUCT_COLORS[type] || 'bg-primary'}`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {total > 0 ? ((count / total) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-dashed border-border rounded-xl">
          <Palette size={32} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No design data yet</p>
        </div>
      )}
    </div>
  )
}
