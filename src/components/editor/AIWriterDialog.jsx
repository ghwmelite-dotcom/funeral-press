import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { generateAIText } from '../../utils/aiApi'

const TONE_OPTIONS = [
  { value: 'warm', label: 'Warm & Loving' },
  { value: 'formal', label: 'Formal & Dignified' },
  { value: 'faith', label: 'Faith-centered' },
  { value: 'personal', label: 'Personal & Intimate' },
]

export default function AIWriterDialog({ open, onOpenChange, type = 'tribute', onInsert, deceasedName }) {
  const [step, setStep] = useState(1)
  const [relationship, setRelationship] = useState('')
  const [memories, setMemories] = useState('')
  const [tone, setTone] = useState('warm')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const typeLabels = {
    tribute: 'Tribute',
    biography: 'Biography',
    acknowledgements: 'Acknowledgements',
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setResult('')
    try {
      const text = await generateAIText(type, {
        relationship,
        memories,
        tone,
        name,
        deceasedName,
      })
      setResult(text)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Failed to generate text. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    if (result && onInsert) {
      onInsert(result)
      handleClose()
    }
  }

  const handleClose = () => {
    setStep(1)
    setRelationship('')
    setMemories('')
    setTone('warm')
    setName('')
    setResult('')
    setError('')
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            AI {typeLabels[type]} Writer
          </DialogTitle>
          <DialogDescription>
            Let AI help you write a beautiful {typeLabels[type].toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Input form */}
        {step === 1 && (
          <div className="space-y-4 mt-2">
            {type === 'tribute' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Who is writing this tribute?</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Children, Grandchildren, Friends"
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {type === 'acknowledgements' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Family name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Johnson Family"
                  className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {type === 'biography' ? 'Key life details & achievements' : 'Key memories & qualities'}
              </label>
              <textarea
                value={memories}
                onChange={(e) => setMemories(e.target.value)}
                rows={4}
                placeholder={
                  type === 'biography'
                    ? 'e.g. Born in a small town. Teacher for 30 years. Devoted mother of 5...'
                    : 'e.g. Always smiling, incredible cook, loved singing hymns, strong faith...'
                }
                className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                      tone === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:border-input'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setStep(2); handleGenerate() }}
              disabled={!memories.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm font-medium rounded-lg transition-colors"
            >
              Generate with AI <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === 2 && loading && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Writing your {typeLabels[type].toLowerCase()}...</p>
            <div className="w-full space-y-2 mt-4">
              <div className="h-3 bg-muted rounded animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.1), transparent)', backgroundSize: '200% 100%' }} />
              <div className="h-3 bg-muted rounded animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.1), transparent)', backgroundSize: '200% 100%', animationDelay: '0.2s' }} />
              <div className="h-3 bg-muted rounded w-3/4 animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.1), transparent)', backgroundSize: '200% 100%', animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Step 2: Error */}
        {step === 2 && error && (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => { setStep(1) }}
              className="px-4 py-2 text-sm text-card-foreground bg-muted rounded-lg hover:bg-accent transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-4 mt-2">
            <div className="max-h-64 overflow-y-auto bg-card border border-input rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setStep(2); handleGenerate() }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-accent text-card-foreground text-sm rounded-lg transition-colors"
              >
                <RefreshCw size={14} /> Regenerate
              </button>
              <button
                onClick={handleInsert}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
              >
                <Sparkles size={14} /> Insert
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
