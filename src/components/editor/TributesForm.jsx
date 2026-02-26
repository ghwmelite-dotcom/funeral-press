import { useBrochureStore } from '../../stores/brochureStore'
import { Plus, Trash2, ChevronDown, ChevronRight, Lightbulb, BookOpen, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { tributeTemplates } from '../../utils/templates'
import { tributeWritingGuides } from '../../utils/writingPrompts'
import WordCountIndicator from './WordCountIndicator'
import WritingPromptsDialog from './WritingPromptsDialog'
import AIWriterDialog from './AIWriterDialog'
import ImageUploader from './ImageUploader'

export default function TributesForm() {
  const store = useBrochureStore()
  const [expandedIndex, setExpandedIndex] = useState(0)
  const [templateDropdownIndex, setTemplateDropdownIndex] = useState(-1)
  const [writingGuideOpen, setWritingGuideOpen] = useState(false)
  const [activeGuide, setActiveGuide] = useState(null)
  const [activeGuideIndex, setActiveGuideIndex] = useState(-1)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiDialogIndex, setAiDialogIndex] = useState(-1)

  const handleApplyTemplate = (index, templateKey) => {
    const template = tributeTemplates[templateKey]
    if (!template) return
    store.updateTribute(index, 'title', template.title)
    store.updateTribute(index, 'subtitle', template.subtitle)
    store.updateTribute(index, 'openingVerse', template.openingVerse)
    setTemplateDropdownIndex(-1)
  }

  const handleOpenWritingGuide = (index) => {
    // Try to match a guide based on tribute title
    const tribute = store.tributes[index]
    const titleLower = (tribute.title || '').toLowerCase()
    let guideKey = 'general'
    if (titleLower.includes('children') || titleLower.includes('child')) guideKey = 'children'
    else if (titleLower.includes('grandchild')) guideKey = 'grandchildren'
    else if (titleLower.includes('family')) guideKey = 'family'
    else if (titleLower.includes('friend')) guideKey = 'friends'
    else if (titleLower.includes('colleague')) guideKey = 'colleagues'
    setActiveGuide(tributeWritingGuides[guideKey])
    setActiveGuideIndex(index)
    setWritingGuideOpen(true)
  }

  const handleInsertGuideText = (text) => {
    if (activeGuideIndex >= 0) {
      store.updateTribute(activeGuideIndex, 'body', text)
    }
  }

  return (
    <div className="space-y-2">
      {store.tributes.map((tribute, i) => (
        <div key={tribute.id} className="border border-input rounded-lg overflow-hidden">
          {/* Accordion header */}
          <button
            onClick={() => setExpandedIndex(expandedIndex === i ? -1 : i)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-card hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedIndex === i ? (
                <ChevronDown size={14} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={14} className="text-muted-foreground" />
              )}
              <span className="text-sm text-card-foreground">
                {tribute.title || `Tribute ${i + 1}`}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Remove this tribute section?')) store.removeTribute(i)
              }}
              className="p-1 text-muted-foreground/60 hover:text-red-400 transition-colors"
              aria-label="Remove tribute"
            >
              <Trash2 size={12} />
            </button>
          </button>

          {/* Accordion content */}
          {expandedIndex === i && (
            <div className="p-3 space-y-3 bg-card/50">
              {/* Template and writing guide buttons */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() =>
                      setTemplateDropdownIndex(templateDropdownIndex === i ? -1 : i)
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] bg-muted border border-input rounded-md text-card-foreground hover:text-foreground hover:border-input transition-colors"
                  >
                    <BookOpen size={12} />
                    Browse tribute templates...
                  </button>
                  {templateDropdownIndex === i && (
                    <div className="absolute top-full left-0 mt-1 z-20 w-64 max-w-[calc(100vw-2rem)] bg-card border border-input rounded-lg shadow-xl overflow-hidden">
                      {Object.entries(tributeTemplates).map(([key, tpl]) => (
                        <button
                          key={key}
                          onClick={() => handleApplyTemplate(i, key)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border last:border-b-0"
                        >
                          <span className="text-foreground">{tpl.title}</span>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            {tpl.subtitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleOpenWritingGuide(i)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] bg-muted border border-input rounded-md text-primary hover:text-primary/90 hover:border-primary/30 transition-colors"
                >
                  <Lightbulb size={12} />
                  Help me write
                </button>
                <button
                  onClick={() => { setAiDialogIndex(i); setAiDialogOpen(true) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] bg-primary/10 border border-primary/30 rounded-md text-primary hover:text-primary/90 hover:bg-primary/20 transition-colors"
                >
                  <Sparkles size={12} />
                  AI Write
                </button>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tribute Title</label>
                <input
                  type="text"
                  value={tribute.title}
                  onChange={(e) => store.updateTribute(i, 'title', e.target.value)}
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Subtitle</label>
                <input
                  type="text"
                  value={tribute.subtitle}
                  onChange={(e) => store.updateTribute(i, 'subtitle', e.target.value)}
                  placeholder="e.g. To Our Beloved Mother"
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Opening Verse</label>
                <textarea
                  value={tribute.openingVerse}
                  onChange={(e) => store.updateTribute(i, 'openingVerse', e.target.value)}
                  rows={2}
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder={`"Her children arise and call her blessed." — Proverbs 31:28`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Tribute Body</label>
                  <WordCountIndicator text={tribute.body} min={150} max={300} />
                </div>
                <textarea
                  value={tribute.body}
                  onChange={(e) => store.updateTribute(i, 'body', e.target.value)}
                  rows={8}
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
                  placeholder="Write the tribute text..."
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Closing Line</label>
                <input
                  type="text"
                  value={tribute.closingLine}
                  onChange={(e) => store.updateTribute(i, 'closingLine', e.target.value)}
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Tribute photos */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Photos (optional, up to 3)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((j) => (
                    <div key={j}>
                      <ImageUploader
                        value={(tribute.photos || [])[j]}
                        onChange={(v) => store.updateTributePhoto(i, j, v)}
                        label={`Photo ${j + 1}`}
                        aspectRatio="4/3"
                        recommendedText="Recommended: 800x600px landscape"
                      />
                      <input
                        type="text"
                        value={(tribute.photoCaptions || [])[j] || ''}
                        onChange={(e) => store.updateTributeCaption(i, j, e.target.value)}
                        placeholder="Caption..."
                        className="w-full mt-1 bg-card border border-input rounded px-2 py-1 text-[11px] text-card-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => store.addTribute()}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 transition-colors mt-2"
      >
        <Plus size={14} /> Add Tribute Section
      </button>

      {/* Writing prompts dialog */}
      <WritingPromptsDialog
        open={writingGuideOpen}
        onOpenChange={setWritingGuideOpen}
        guide={activeGuide}
        onInsert={handleInsertGuideText}
      />

      <AIWriterDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        type="tribute"
        deceasedName={`${store.title} ${store.fullName}`}
        onInsert={(text) => {
          if (aiDialogIndex >= 0) store.updateTribute(aiDialogIndex, 'body', text)
        }}
      />
    </div>
  )
}
