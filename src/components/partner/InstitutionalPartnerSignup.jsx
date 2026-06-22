import { useState, useRef } from 'react'
import { Loader2, Upload, Church, Building2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { usePartnerStore } from '../../stores/partnerStore'

const DENOMINATIONS = [
  'Methodist',
  'Catholic',
  'Presbyterian',
  'Pentecostal',
  'Charismatic',
  'Adventist',
  'Anglican',
  'Other',
]

export default function InstitutionalPartnerSignup({ open, onOpenChange, onComplete }) {
  const { updateProfile, uploadLogo, fetchProfile } = usePartnerStore()
  const [partnerType, setPartnerType] = useState('')
  const [denomination, setDenomination] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!partnerType) {
      setError('Please select a partner type.')
      return
    }
    if (partnerType === 'church' && !denomination) {
      setError('Please select a denomination.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      let logoUrl = null
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile)
      }

      await updateProfile({
        partner_type: partnerType,
        denomination: partnerType === 'church' ? denomination : null,
        welcome_message: welcomeMessage || null,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      })

      await fetchProfile()
      onOpenChange(false)
      onComplete?.()
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-xl text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Set Up Your Partner Profile
          </DialogTitle>
          <DialogDescription>
            Tell us about your institution so we can personalise your partner experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Partner Type */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
              Partner Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setPartnerType('church'); setDenomination('') }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  partnerType === 'church'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <Church size={24} />
                <span className="text-sm font-medium">Church</span>
              </button>
              <button
                type="button"
                onClick={() => { setPartnerType('funeral_home'); setDenomination('') }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  partnerType === 'funeral_home'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <Building2 size={24} />
                <span className="text-sm font-medium">Funeral Home</span>
              </button>
            </div>
          </div>

          {/* Denomination (church only) */}
          {partnerType === 'church' && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
                Denomination
              </label>
              <select
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
              >
                <option value="">Select denomination...</option>
                {DENOMINATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Logo Upload */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
              Logo (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground/40 transition-colors bg-muted/20"
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-20 h-20 object-contain rounded-lg"
                />
              ) : (
                <>
                  <Upload size={24} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload your logo</span>
                </>
              )}
            </button>
          </div>

          {/* Welcome Message */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
              Welcome Message
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value.slice(0, 500))}
              placeholder="Welcome message shown to families who visit through your link"
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              {welcomeMessage.length}/500
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-lg transition-colors text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
