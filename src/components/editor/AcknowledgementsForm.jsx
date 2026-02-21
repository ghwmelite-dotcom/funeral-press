import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useBrochureStore } from '../../stores/brochureStore'
import AIWriterDialog from './AIWriterDialog'

export default function AcknowledgementsForm() {
  const store = useBrochureStore()
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Acknowledgements Text</label>

        <button
          onClick={() => setAiDialogOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 mb-2 text-[11px] bg-primary/10 border border-primary/30 rounded-md text-primary hover:text-primary/90 hover:bg-primary/20 transition-colors"
        >
          <Sparkles size={12} />
          AI Write
        </button>

        <textarea
          value={store.acknowledgements}
          onChange={(e) => store.updateField('acknowledgements', e.target.value)}
          rows={8}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Family Signature</label>
        <input
          type="text"
          value={store.familySignature}
          onChange={(e) => store.updateField('familySignature', e.target.value)}
          placeholder="e.g. The Hodges & Amewovi Families"
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <AIWriterDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        type="acknowledgements"
        deceasedName={`${store.title} ${store.fullName}`}
        onInsert={(text) => store.updateField('acknowledgements', text)}
      />
    </div>
  )
}
