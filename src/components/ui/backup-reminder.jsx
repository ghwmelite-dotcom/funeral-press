import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { useBrochureStore } from '../../stores/brochureStore'

export function BackupReminder() {
  const editCount = useBrochureStore(s => s.editCountSinceLastSave)
  const saveBrochure = useBrochureStore(s => s.saveBrochure)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || editCount < 5) return null

  return (
    <div className="mx-4 mt-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-xs text-primary">
      <Save size={14} className="shrink-0" />
      <span className="flex-1">You have unsaved changes. Don't forget to save!</span>
      <button onClick={() => { saveBrochure(); setDismissed(true) }} className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90">Save Now</button>
      <button onClick={() => setDismissed(true)} className="text-primary hover:text-primary/80"><X size={14} /></button>
    </div>
  )
}
