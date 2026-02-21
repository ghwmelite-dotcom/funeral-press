import { useBrochureStore } from '../../stores/brochureStore'
import ImageUploader from './ImageUploader'

export default function BackCoverForm() {
  const store = useBrochureStore()

  return (
    <div className="space-y-4">
      {/* Back cover photo */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Back Cover Photo (optional)</label>
        <p className="text-[10px] text-muted-foreground/60 mb-2">Upload a different photo for the back cover, or leave empty to use the front cover photo.</p>
        <div className="max-w-[200px]">
          <ImageUploader
            value={store.backCoverPhoto}
            onChange={(v) => store.updateField('backCoverPhoto', v)}
            label="Back Cover Photo"
            aspectRatio="3/4"
            recommendedText="Recommended: Portrait orientation"
          />
        </div>
      </div>

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
