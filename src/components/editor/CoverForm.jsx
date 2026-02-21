import { useState } from 'react'
import { useBrochureStore } from '../../stores/brochureStore'
import ImageUploader from './ImageUploader'
import ImageCropDialog from './ImageCropDialog'
import ImageEnhanceDialog from './ImageEnhanceDialog'

export default function CoverForm() {
  const store = useBrochureStore()
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Portrait Photo</label>
        <ImageUploader
          value={store.coverPhoto}
          onChange={(v) => store.updateField('coverPhoto', v)}
          label="Upload portrait photo"
          aspectRatio="3/4"
          recommendedText="Recommended: 600x800px portrait"
          onCropRequest={() => setCropDialogOpen(true)}
          onEnhanceRequest={() => setEnhanceDialogOpen(true)}
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Cover Subtitle</label>
        <input
          type="text"
          value={store.coverSubtitle}
          onChange={(e) => store.updateField('coverSubtitle', e.target.value)}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Cover Bible Verse</label>
        <textarea
          value={store.coverVerse}
          onChange={(e) => store.updateField('coverVerse', e.target.value)}
          rows={4}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Enter Bible verse for the cover..."
        />
      </div>

      {/* Crop dialog for cover photo */}
      {store.coverPhoto && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={store.coverPhoto}
          aspectRatio={3 / 4}
          onCrop={(croppedDataUrl) => store.updateField('coverPhoto', croppedDataUrl)}
        />
      )}

      {store.coverPhoto && (
        <ImageEnhanceDialog
          open={enhanceDialogOpen}
          onOpenChange={setEnhanceDialogOpen}
          imageSrc={store.coverPhoto}
          onApply={(enhanced) => store.updateField('coverPhoto', enhanced)}
        />
      )}
    </div>
  )
}
