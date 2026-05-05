import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'

const RANGES = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
]

export default function FunnelTab() {
  const fetchFunnel = useAdminStore((s) => s.fetchFunnel)
  const funnel = useAdminStore((s) => s.analyticsFunnel)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchFunnel(days)
  }, [days, fetchFunnel])

  if (!funnel) {
    return <div className="text-muted-foreground p-6 text-center">Loading funnel…</div>
  }

  const maxCount = Math.max(1, ...funnel.stages.map((s) => s.count))

  return (
    <div className="space-y-6">
      {/* Range filter */}
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDays(r.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              days === r.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Funnel chart — horizontal bars sized by count */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {funnel.stages.map((stage, i) => {
          const widthPct = (stage.count / maxCount) * 100
          const dropoff = i > 0 ? 100 - stage.conversion_pct : null
          return (
            <div key={stage.key}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="font-medium text-foreground">{stage.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-foreground font-semibold tabular-nums">{stage.count}</span>
                  {i > 0 && (
                    <span className={`text-xs ${dropoff > 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {stage.conversion_pct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Note about missing stages */}
      <p className="text-xs text-muted-foreground">
        Funnel shows users who fired the corresponding event in the last {funnel.days} days. Visit
        and Print stages are not yet tracked; conversion rates are stage-to-stage from Signup
        onward. Each stage counts distinct users who fired the event in window.
      </p>
    </div>
  )
}
