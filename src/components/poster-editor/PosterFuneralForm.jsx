import { Plus, Trash2 } from 'lucide-react'
import { usePosterStore } from '../../stores/posterStore'

export default function PosterFuneralForm() {
  const store = usePosterStore()
  const items = store.funeralArrangements
  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">Add each funeral event with a label (e.g. "BURIAL SERVICE") and details (date, time, venue).</p>

      {items.map((item, i) => (
        <div key={i} className="p-3 bg-card/50 border border-border rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={item.label}
                onChange={(e) => store.updateFuneralArrangement(i, 'label', e.target.value)}
                placeholder="Event label, e.g. BURIAL SERVICE"
                className={inputClass}
              />
              <textarea
                value={item.value}
                onChange={(e) => store.updateFuneralArrangement(i, 'value', e.target.value)}
                rows={2}
                placeholder="Date, time, and venue details..."
                className={inputClass}
              />
            </div>
            {items.length > 1 && (
              <button onClick={() => store.removeFuneralArrangement(i)} className="p-1.5 text-muted-foreground/60 hover:text-red-400 transition-colors mt-1">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={() => store.addFuneralArrangement()}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 transition-colors"
      >
        <Plus size={14} /> Add Arrangement
      </button>
    </div>
  )
}
