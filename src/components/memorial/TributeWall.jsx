import { useState, useEffect, useCallback } from 'react'
import { Flame, Flower2, Feather, Loader2 } from 'lucide-react'
import { getTributes } from '../../utils/memorialApi'
import LightCandleDialog from './LightCandleDialog.jsx'

const PRODUCT_META = {
  candle:  { label: 'candle',  Icon: Flame   },
  flowers: { label: 'flowers', Icon: Flower2 },
  tribute: { label: 'tribute', Icon: Feather },
}

function relativeDate(isoString) {
  if (!isoString) return ''
  const ms = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(ms / 60_000)
  const hours = Math.floor(ms / 3_600_000)
  const days  = Math.floor(ms / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildCountLabel(counts) {
  if (!counts) return ''
  const parts = []
  if (counts.candle  > 0) parts.push(`${counts.candle} candle${counts.candle  !== 1 ? 's' : ''} lit`)
  if (counts.flowers > 0) parts.push(`${counts.flowers} flower${counts.flowers !== 1 ? 's' : ''} laid`)
  if (counts.tribute > 0) parts.push(`${counts.tribute} tribute${counts.tribute !== 1 ? 's' : ''}`)
  return parts.join(' • ')
}

export default function TributeWall({ memorialId, deceasedName }) {
  const [tributes, setTributes]   = useState([])
  const [counts, setCounts]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchTributes = useCallback(async () => {
    try {
      const data = await getTributes(memorialId)
      setTributes(data.tributes ?? [])
      setCounts(data.counts ?? null)
    } catch {
      // Non-fatal — wall simply shows empty
    } finally {
      setLoading(false)
    }
  }, [memorialId])

  useEffect(() => {
    fetchTributes()
  }, [fetchTributes])

  const countLabel = buildCountLabel(counts)

  return (
    <section
      aria-label={`Tribute wall for ${deceasedName}`}
      className="mx-auto my-10 max-w-2xl px-4"
      data-testid="tribute-wall"
    >
      {/* Section header */}
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-foreground">
          Tribute Wall
        </h2>
        {countLabel && (
          <p className="mt-1 text-sm text-muted-foreground" data-testid="count-label">
            {countLabel}
          </p>
        )}
      </div>

      {/* Light a candle CTA */}
      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Flame size={18} aria-hidden="true" />
          Light a candle
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground motion-reduce:animate-none" aria-label="Loading tributes" />
        </div>
      )}

      {/* Empty state */}
      {!loading && tributes.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground" data-testid="empty-state">
          Be the first to light a candle for {deceasedName}.
        </p>
      )}

      {/* Tribute list */}
      {!loading && tributes.length > 0 && (
        <ul className="space-y-3" data-testid="tribute-list">
          {tributes.map((tribute) => {
            const meta = PRODUCT_META[tribute.type] ?? PRODUCT_META.candle
            const Icon = meta.Icon
            return (
              <li
                key={tribute.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
                data-testid="tribute-item"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {tribute.author_name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeDate(tribute.created_at)}
                    </span>
                  </div>
                  {tribute.message && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {tribute.message}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Dialog */}
      <LightCandleDialog
        memorialId={memorialId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false)
          setLoading(true)
          fetchTributes()
        }}
      />
    </section>
  )
}
