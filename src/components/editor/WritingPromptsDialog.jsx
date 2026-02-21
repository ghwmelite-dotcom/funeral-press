import { useState } from 'react'
import { Lightbulb, ChevronRight, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'

export default function WritingPromptsDialog({ open, onOpenChange, guide, onInsert }) {
  const [activeStage, setActiveStage] = useState(0)

  if (!guide) return null

  const handleInsertAll = () => {
    const text = guide.stages.map((s) => s.example).join('\n\n')
    onInsert(text)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb size={18} className="text-primary" />
            {guide.title}
          </DialogTitle>
          <DialogDescription>
            Follow these prompts to write your tribute. Click &quot;Insert template&quot; to start
            with example text.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {guide.stages.map((stage, i) => (
            <div
              key={i}
              className={`border rounded-lg overflow-hidden transition-colors ${
                i === activeStage ? 'border-primary/30 bg-card' : 'border-border'
              }`}
            >
              <button
                onClick={() => setActiveStage(i)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
              >
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-card-foreground flex-1">{stage.name}</span>
                <ChevronRight
                  size={14}
                  className={`text-muted-foreground transition-transform ${
                    i === activeStage ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {i === activeStage && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs text-primary">{stage.prompt}</p>
                  <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground italic leading-relaxed">
                    &quot;{stage.example}&quot;
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleInsertAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors"
        >
          <FileText size={14} /> Insert template text
        </button>
      </DialogContent>
    </Dialog>
  )
}
