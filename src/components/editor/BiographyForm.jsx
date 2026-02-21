import { useState } from 'react'
import { useBrochureStore } from '../../stores/brochureStore'
import ImageUploader from './ImageUploader'
import WordCountIndicator from './WordCountIndicator'
import WritingPromptsDialog from './WritingPromptsDialog'
import { biographyWritingGuide } from '../../utils/writingPrompts'
import { Lightbulb, Sparkles } from 'lucide-react'
import AIWriterDialog from './AIWriterDialog'

export default function BiographyForm() {
  const store = useBrochureStore()
  const [guideOpen, setGuideOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  const handleInsertGuideText = (text) => {
    store.updateField('biography', text)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-muted-foreground">Biography Text</label>
          <WordCountIndicator text={store.biography} min={300} max={500} />
        </div>

        {/* Writing guide button */}
        <button
          onClick={() => setGuideOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 mb-2 text-[11px] bg-muted border border-input rounded-md text-primary hover:text-primary/90 hover:border-primary/30 transition-colors"
        >
          <Lightbulb size={12} />
          Writing guide
        </button>

        <button
          onClick={() => setAiDialogOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 mb-2 text-[11px] bg-primary/10 border border-primary/30 rounded-md text-primary hover:text-primary/90 hover:bg-primary/20 transition-colors"
        >
          <Sparkles size={12} />
          AI Write
        </button>

        <textarea
          value={store.biography}
          onChange={(e) => store.updateField('biography', e.target.value)}
          rows={14}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
          placeholder="Write the biography of the deceased. Separate paragraphs with blank lines..."
        />
        <p className="text-[10px] text-muted-foreground/60 mt-1">Separate paragraphs with blank lines. Each paragraph break creates a new paragraph in the PDF.</p>
      </div>

      {/* Biography photos */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Biography Photos (optional, up to 3)</label>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <ImageUploader
                value={store.biographyPhotos[i]}
                onChange={(v) => store.updateBiographyPhoto(i, v)}
                label={`Photo ${i + 1}`}
                aspectRatio="4/3"
                recommendedText="Recommended: 800x600px landscape"
              />
              <input
                type="text"
                value={store.biographyPhotoCaptions[i]}
                onChange={(e) => store.updateBiographyCaption(i, e.target.value)}
                placeholder="Caption..."
                className="w-full mt-1 bg-card border border-input rounded px-2 py-1 text-[11px] text-card-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Writing prompts dialog */}
      <WritingPromptsDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        guide={biographyWritingGuide}
        onInsert={handleInsertGuideText}
      />

      <AIWriterDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        type="biography"
        deceasedName={`${store.title} ${store.fullName}`}
        onInsert={(text) => store.updateField('biography', text)}
      />
    </div>
  )
}
