import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { generateWizardContent } from '../utils/aiApi'

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal & Dignified' },
  { value: 'warm', label: 'Warm & Loving' },
  { value: 'celebratory', label: 'Celebratory' },
  { value: 'traditional', label: 'Traditional' },
]

const DENOMINATION_OPTIONS = [
  'Catholic', 'Protestant', 'Pentecostal', 'Methodist', 'Presbyterian',
  'Anglican', 'Baptist', 'Seventh-Day Adventist', 'Muslim', 'Traditional', 'Non-religious', 'Other',
]

const TRAIT_OPTIONS = [
  'Loving', 'Kind', 'Generous', 'Faithful', 'Hardworking', 'Humble',
  'Joyful', 'Wise', 'Patient', 'Strong', 'Caring', 'Devoted',
]

const HOBBY_OPTIONS = [
  'Cooking', 'Gardening', 'Reading', 'Music', 'Church activities', 'Sports',
  'Sewing', 'Farming', 'Teaching', 'Volunteering', 'Travel', 'Dancing',
]

export default function AIWriterWizard({ open, onOpenChange, onInsert, deceasedName }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Step 1: Basic Info
  const [name, setName] = useState(deceasedName || '')
  const [age, setAge] = useState('')
  const [dob, setDob] = useState('')
  const [dateOfPassing, setDateOfPassing] = useState('')
  const [placeOfPassing, setPlaceOfPassing] = useState('')

  // Step 2: Life & Personality
  const [occupation, setOccupation] = useState('')
  const [hobbies, setHobbies] = useState([])
  const [traits, setTraits] = useState([])
  const [achievements, setAchievements] = useState('')

  // Step 3: Family
  const [survivedBy, setSurvivedBy] = useState('')
  const [specialRelationships, setSpecialRelationships] = useState('')
  const [familyMotto, setFamilyMotto] = useState('')

  // Step 4: Faith & Culture
  const [denomination, setDenomination] = useState('')
  const [churchName, setChurchName] = useState('')
  const [favoriteHymns, setFavoriteHymns] = useState('')
  const [culturalCustoms, setCulturalCustoms] = useState('')

  // Step 5: Tone
  const [tone, setTone] = useState('warm')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const toggleChip = (value, list, setter) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await generateWizardContent({
        name, age, dob, dateOfPassing, placeOfPassing,
        occupation, hobbies: hobbies.join(', '), traits: traits.join(', '), achievements,
        survivedBy, specialRelationships, familyMotto,
        denomination, churchName, favoriteHymns, culturalCustoms,
        tone, specialInstructions,
      })
      setResult(data)
      setStep(6) // Result step
    } catch (err) {
      setError(err.message || 'Failed to generate content')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setResult(null)
    setError('')
    setLoading(false)
    onOpenChange(false)
  }

  const inputCls = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'

  const chipCls = (selected) =>
    `px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
      selected ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:border-primary/50'
    }`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            AI Content Wizard
          </DialogTitle>
          <DialogDescription>
            {step <= 5 ? `Step ${step} of 5` : 'Generated Content'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        {step <= 5 && (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-3 mt-2">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name of deceased" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={age} onChange={e => setAge(e.target.value)} placeholder="Age" className={inputCls} />
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateOfPassing} onChange={e => setDateOfPassing(e.target.value)} className={inputCls} />
              <input type="text" value={placeOfPassing} onChange={e => setPlaceOfPassing(e.target.value)} placeholder="Place of passing" className={inputCls} />
            </div>
          </div>
        )}

        {/* Step 2: Life & Personality */}
        {step === 2 && (
          <div className="space-y-3 mt-2">
            <h3 className="text-sm font-medium">Life & Personality</h3>
            <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Occupation / profession" className={inputCls} />
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Hobbies & Interests</label>
              <div className="flex flex-wrap gap-1.5">
                {HOBBY_OPTIONS.map(h => (
                  <button key={h} onClick={() => toggleChip(h, hobbies, setHobbies)} className={chipCls(hobbies.includes(h))}>{h}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Personality Traits</label>
              <div className="flex flex-wrap gap-1.5">
                {TRAIT_OPTIONS.map(t => (
                  <button key={t} onClick={() => toggleChip(t, traits, setTraits)} className={chipCls(traits.includes(t))}>{t}</button>
                ))}
              </div>
            </div>
            <textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={2} placeholder="Key achievements..." className={inputCls + ' resize-none'} />
          </div>
        )}

        {/* Step 3: Family */}
        {step === 3 && (
          <div className="space-y-3 mt-2">
            <h3 className="text-sm font-medium">Family</h3>
            <textarea value={survivedBy} onChange={e => setSurvivedBy(e.target.value)} rows={3} placeholder="Survived by (e.g. wife Mary, children John, Ama, Kweku...)" className={inputCls + ' resize-none'} />
            <textarea value={specialRelationships} onChange={e => setSpecialRelationships(e.target.value)} rows={2} placeholder="Special relationships or bonds..." className={inputCls + ' resize-none'} />
            <input type="text" value={familyMotto} onChange={e => setFamilyMotto(e.target.value)} placeholder="Family motto (optional)" className={inputCls} />
          </div>
        )}

        {/* Step 4: Faith & Culture */}
        {step === 4 && (
          <div className="space-y-3 mt-2">
            <h3 className="text-sm font-medium">Faith & Culture</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Denomination</label>
              <div className="flex flex-wrap gap-1.5">
                {DENOMINATION_OPTIONS.map(d => (
                  <button key={d} onClick={() => setDenomination(d)} className={chipCls(denomination === d)}>{d}</button>
                ))}
              </div>
            </div>
            <input type="text" value={churchName} onChange={e => setChurchName(e.target.value)} placeholder="Church / mosque name" className={inputCls} />
            <input type="text" value={favoriteHymns} onChange={e => setFavoriteHymns(e.target.value)} placeholder="Favorite hymns or songs" className={inputCls} />
            <textarea value={culturalCustoms} onChange={e => setCulturalCustoms(e.target.value)} rows={2} placeholder="Cultural customs to mention (e.g. Akan traditions, libation...)" className={inputCls + ' resize-none'} />
          </div>
        )}

        {/* Step 5: Tone */}
        {step === 5 && (
          <div className="space-y-3 mt-2">
            <h3 className="text-sm font-medium">Tone & Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setTone(opt.value)}
                  className={`px-3 py-2.5 text-xs rounded-lg border transition-colors ${
                    tone === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:border-primary/50'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} rows={3} placeholder="Any special instructions or things to include/avoid..." className={inputCls + ' resize-none'} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Generating obituary, eulogy, and programme intro...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => { setError(''); setStep(5) }} className="px-4 py-2 text-sm bg-muted rounded-lg hover:bg-accent transition-colors">
              Go Back
            </button>
          </div>
        )}

        {/* Step 6: Results */}
        {step === 6 && result && !loading && (
          <div className="space-y-4 mt-2">
            {[
              { key: 'obituary', label: 'Obituary (~300 words)' },
              { key: 'eulogy', label: 'Eulogy (~500 words)' },
              { key: 'programme_intro', label: 'Programme Introduction (~150 words)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  {result[key] && (
                    <button
                      onClick={() => { if (onInsert) onInsert(key, result[key]); }}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Check size={12} /> Insert
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto bg-card border border-input rounded-lg p-3">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {result[key] || 'Not generated'}
                  </p>
                </div>
              </div>
            ))}

            <button onClick={() => { setStep(5); handleGenerate() }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-accent text-card-foreground text-sm rounded-lg transition-colors">
              <RefreshCw size={14} /> Regenerate All
            </button>
          </div>
        )}

        {/* Navigation */}
        {step <= 5 && !loading && !error && (
          <div className="flex gap-2 mt-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-4 py-2.5 bg-muted hover:bg-accent text-card-foreground text-sm rounded-lg transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={step === 5 ? handleGenerate : () => setStep(step + 1)}
              disabled={step === 1 && !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm font-medium rounded-lg transition-colors"
            >
              {step === 5 ? (
                <><Sparkles size={14} /> Generate Content</>
              ) : (
                <>Next <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
