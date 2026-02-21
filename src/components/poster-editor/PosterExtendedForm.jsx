import { usePosterStore } from '../../stores/posterStore'

export default function PosterExtendedForm() {
  const store = usePosterStore()
  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  const fields = [
    { key: 'brothersSisters', label: 'Brothers & Sisters', placeholder: 'List names...' },
    { key: 'cousins', label: 'Cousins', placeholder: 'List names...' },
    { key: 'nephewsNieces', label: 'Nephews & Nieces', placeholder: 'List names...' },
    { key: 'chiefMourners', label: 'Chief Mourners', placeholder: 'List chief mourners...' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">These appear in the right column of the details section on the poster.</p>
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
          <textarea value={store[f.key]} onChange={(e) => store.updateField(f.key, e.target.value)} rows={3} placeholder={f.placeholder} className={inputClass} />
        </div>
      ))}
    </div>
  )
}
