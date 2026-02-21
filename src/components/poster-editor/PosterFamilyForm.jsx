import { usePosterStore } from '../../stores/posterStore'

export default function PosterFamilyForm() {
  const store = usePosterStore()
  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  const fields = [
    { key: 'father', label: 'Father' },
    { key: 'mother', label: 'Mother' },
  ]

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
          <input type="text" value={store[f.key]} onChange={(e) => store.updateField(f.key, e.target.value)} className={inputClass} />
        </div>
      ))}

      {/* Widow/Widower with label selector */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-muted-foreground">Widow / Widower</label>
          <select
            value={store.widowWidowerLabel}
            onChange={(e) => store.updateField('widowWidowerLabel', e.target.value)}
            className="bg-card border border-input rounded px-2 py-0.5 text-[10px] text-card-foreground focus:outline-none"
          >
            <option value="WIDOWER">Widower</option>
            <option value="WIDOW">Widow</option>
          </select>
        </div>
        <input type="text" value={store.widowWidower} onChange={(e) => store.updateField('widowWidower', e.target.value)} className={inputClass} />
      </div>

      {/* Remaining fields as textareas since they can have multiple entries */}
      {[
        { key: 'children', label: 'Children', placeholder: 'List children, one per line or comma-separated' },
        { key: 'grandchildren', label: 'Grandchildren', placeholder: 'List grandchildren...' },
        { key: 'siblings', label: 'Siblings', placeholder: 'List siblings...' },
        { key: 'inLaw', label: 'In-Law', placeholder: 'In-law name(s)...' },
      ].map((f) => (
        <div key={f.key}>
          <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
          <textarea value={store[f.key]} onChange={(e) => store.updateField(f.key, e.target.value)} rows={2} placeholder={f.placeholder} className={inputClass} />
        </div>
      ))}
    </div>
  )
}
