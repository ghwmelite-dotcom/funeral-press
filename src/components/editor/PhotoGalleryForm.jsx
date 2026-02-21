import { useState } from 'react'
import { useBrochureStore } from '../../stores/brochureStore'
import ImageUploader from './ImageUploader'
import ImageEnhanceDialog from './ImageEnhanceDialog'
import { Plus, Trash2 } from 'lucide-react'

export default function PhotoGalleryForm() {
  const store = useBrochureStore()
  const photos = store.galleryPhotos
  const [enhanceIndex, setEnhanceIndex] = useState(-1)
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false)

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Photos are grouped by page title. Add a page title to group photos together on the same gallery page.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, i) => (
          <div key={photo.id} className="space-y-1.5 relative group">
            <ImageUploader
              value={photo.src}
              onChange={(v) => store.updateGalleryPhoto(i, 'src', v)}
              label={`Photo ${i + 1}`}
              aspectRatio="4/3"
              recommendedText="Recommended: 800x600px landscape"
              onEnhanceRequest={photo.src ? () => { setEnhanceIndex(i); setEnhanceDialogOpen(true) } : undefined}
            />
            <input
              type="text"
              value={photo.caption}
              onChange={(e) => store.updateGalleryPhoto(i, 'caption', e.target.value)}
              placeholder="Caption..."
              className="w-full bg-card border border-input rounded px-2 py-1 text-[11px] text-card-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="text"
              value={photo.pageTitle}
              onChange={(e) => store.updateGalleryPhoto(i, 'pageTitle', e.target.value)}
              placeholder="Page title (e.g. Treasured Memories)"
              className="w-full bg-card border border-input rounded px-2 py-1 text-[11px] text-primary/70 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {photos.length > 1 && (
              <button
                onClick={() => store.removeGalleryPhoto(i)}
                className="absolute top-1 right-1 p-1 bg-card/80 text-muted-foreground hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Remove photo"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {photos.length < 20 && (
        <button
          onClick={() => store.addGalleryPhoto()}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 transition-colors"
        >
          <Plus size={14} /> Add Photo Slot
        </button>
      )}

      {enhanceIndex >= 0 && photos[enhanceIndex]?.src && (
        <ImageEnhanceDialog
          open={enhanceDialogOpen}
          onOpenChange={setEnhanceDialogOpen}
          imageSrc={photos[enhanceIndex].src}
          onApply={(enhanced) => store.updateGalleryPhoto(enhanceIndex, 'src', enhanced)}
        />
      )}
    </div>
  )
}
