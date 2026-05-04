import { formatMinor } from '../../utils/currency.js'

export function ProgressBar({ raised, goal }) {
  if (!goal) {
    return <p className="text-muted-foreground">{formatMinor(raised, 'GHS')} raised</p>
  }
  const pct = Math.min(100, Math.round((raised / goal) * 100))
  return (
    <div>
      <p className="text-foreground mb-2">
        <span className="font-semibold">{formatMinor(raised, 'GHS')}</span>
        <span className="text-muted-foreground"> raised of {formatMinor(goal, 'GHS')} goal</span>
      </p>
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
