import { useBrochureStore } from '../../stores/brochureStore'

export default function BackCoverForm() {
  const store = useBrochureStore()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Back Cover Bible Verse</label>
        <textarea
          value={store.backCoverVerse}
          onChange={(e) => store.updateField('backCoverVerse', e.target.value)}
          rows={4}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Closing Phrase</label>
        <input
          type="text"
          value={store.backCoverPhrase}
          onChange={(e) => store.updateField('backCoverPhrase', e.target.value)}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Sub-text</label>
        <input
          type="text"
          value={store.backCoverSubtext}
          onChange={(e) => store.updateField('backCoverSubtext', e.target.value)}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Designer Credit (optional)</label>
        <input
          type="text"
          value={store.designerCredit}
          onChange={(e) => store.updateField('designerCredit', e.target.value)}
          placeholder="Designed by..."
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  )
}
