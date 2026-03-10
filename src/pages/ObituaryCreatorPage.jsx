import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { Scroll, ArrowLeft, Plus, Copy, ExternalLink, Loader2, User, Image, Calendar, MapPin, Users, FileText, Upload, LinkIcon, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '../utils/apiClient'
import { useNotification } from '../components/ui/notification'

const DRAFT_KEY = 'funeralpress_obituary_draft'

export default function ObituaryCreatorPage() {
  const { notify } = useNotification()

  // Form state
  const [deceasedName, setDeceasedName] = useState('')
  const [deceasedPhoto, setDeceasedPhoto] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [deathDate, setDeathDate] = useState('')
  const [biography, setBiography] = useState('')
  const [funeralDate, setFuneralDate] = useState('')
  const [funeralTime, setFuneralTime] = useState('')
  const [funeralVenue, setFuneralVenue] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [familyMembers, setFamilyMembers] = useState('')
  const [photoMode, setPhotoMode] = useState('upload')
  const [draftSaved, setDraftSaved] = useState(false)
  const fileInputRef = useRef(null)
  const draftTimerRef = useRef(null)

  const [creating, setCreating] = useState(false)
  const [createdSlug, setCreatedSlug] = useState(null)
  const [obituaries, setObituaries] = useState([])
  const [loadingObituaries, setLoadingObituaries] = useState(true)

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY))
      if (draft) {
        setDeceasedName(draft.deceasedName || '')
        setDeceasedPhoto(draft.deceasedPhoto || '')
        setBirthDate(draft.birthDate || '')
        setDeathDate(draft.deathDate || '')
        setBiography(draft.biography || '')
        setFuneralDate(draft.funeralDate || '')
        setFuneralTime(draft.funeralTime || '')
        setFuneralVenue(draft.funeralVenue || '')
        setVenueAddress(draft.venueAddress || '')
        setFamilyMembers(draft.familyMembers || '')
        if (draft.deceasedPhoto && draft.deceasedPhoto.startsWith('data:')) {
          setPhotoMode('upload')
        } else if (draft.deceasedPhoto) {
          setPhotoMode('url')
        }
      }
    } catch {}
  }, [])

  // Debounced draft saving (1 second)
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          deceasedName, deceasedPhoto, birthDate, deathDate, biography,
          funeralDate, funeralTime, funeralVenue, venueAddress, familyMembers,
        }))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      } catch {}
    }, 1000)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [deceasedName, deceasedPhoto, birthDate, deathDate, biography, funeralDate, funeralTime, funeralVenue, venueAddress, familyMembers])

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Image must be under 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setDeceasedPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Progress calculation
  const sectionsComplete = useMemo(() => {
    let count = 0
    if (deceasedName.trim()) count++
    if (birthDate && deathDate) count++
    if (biography.trim()) count++
    if (funeralDate && funeralVenue.trim()) count++
    if (familyMembers.trim()) count++
    return count
  }, [deceasedName, birthDate, deathDate, biography, funeralDate, funeralVenue, familyMembers])

  useEffect(() => {
    fetchObituaries()
  }, [])

  async function fetchObituaries() {
    try {
      const data = await apiFetch('/obituaries')
      setObituaries(data.obituaries || [])
    } catch {
      // silently fail
    } finally {
      setLoadingObituaries(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!deceasedName.trim()) {
      notify('Please enter the deceased name', 'error')
      return
    }
    setCreating(true)
    try {
      const data = await apiFetch('/obituaries/create', {
        method: 'POST',
        body: JSON.stringify({
          deceasedName: deceasedName.trim(),
          deceasedPhoto,
          birthDate,
          deathDate,
          biography,
          funeralDate,
          funeralTime,
          funeralVenue,
          venueAddress,
          familyMembers,
        }),
      })
      setCreatedSlug(data.slug)
      notify('Obituary published successfully!', 'success')
      // Reset form
      setDeceasedName('')
      setDeceasedPhoto('')
      setBirthDate('')
      setDeathDate('')
      setBiography('')
      setFuneralDate('')
      setFuneralTime('')
      setFuneralVenue('')
      setVenueAddress('')
      setFamilyMembers('')
      clearDraft()
      fetchObituaries()
    } catch (err) {
      notify(err.message || 'Failed to publish obituary', 'error')
    } finally {
      setCreating(false)
    }
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/obituary/${slug}`
    navigator.clipboard.writeText(url)
    notify('Link copied to clipboard!', 'success')
  }

  const inputClass = 'w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 placeholder:text-muted-foreground/60 transition-all'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Create an Obituary Announcement | FuneralPress"
        description="Publish a beautiful obituary announcement page online. Share funeral details, biography, and family information with friends and family."
        path="/obituary-creator"
      />

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Scroll size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Obituary Creator</span>
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Home</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A84C]/10 mb-4">
            <Scroll size={28} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Obituary Announcement</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Create a dignified obituary page to share with family and friends. Include funeral details, biography, and more.
          </p>
        </div>

        {/* Created success banner */}
        {createdSlug && (
          <div className="mb-8 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl p-5">
            <p className="text-sm font-medium text-foreground mb-2">Obituary published! Share this link:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/obituary/${createdSlug}`}
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              />
              <button
                onClick={() => copyLink(createdSlug)}
                className="p-2 rounded-lg bg-[#C9A84C] text-white hover:bg-[#b8973f] transition-colors"
                title="Copy link"
              >
                <Copy size={16} />
              </button>
              <Link
                to={`/obituary/${createdSlug}`}
                className="p-2 rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors"
                title="View obituary"
              >
                <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus size={18} className="text-[#C9A84C]" />
              Create Obituary
            </h2>
            <div className="flex items-center gap-3">
              {draftSaved && (
                <span className="flex items-center gap-1 text-xs text-green-500 animate-in fade-in">
                  <CheckCircle2 size={12} />
                  Draft saved
                </span>
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {sectionsComplete}/5 sections
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 mb-6">
            <div
              className="bg-[#C9A84C] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(sectionsComplete / 5) * 100}%` }}
            />
          </div>

          {/* Section: Personal Info */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-3 flex items-center gap-1.5">
              <User size={12} />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Deceased Name *</label>
                <input
                  type="text"
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  placeholder="e.g. Kofi Mensah"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <Image size={12} className="inline mr-1" />
                  Photo (optional)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${photoMode === 'upload' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Upload size={11} />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('url')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${photoMode === 'url' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LinkIcon size={11} />
                    Paste URL
                  </button>
                </div>
                {photoMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={inputClass + ' text-left cursor-pointer flex items-center gap-2'}
                    >
                      <Upload size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground/60">{deceasedPhoto && deceasedPhoto.startsWith('data:') ? 'Image selected - click to change' : 'Click to select an image...'}</span>
                    </button>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={deceasedPhoto.startsWith('data:') ? '' : deceasedPhoto}
                    onChange={(e) => setDeceasedPhoto(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={inputClass}
                  />
                )}
                {deceasedPhoto && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={deceasedPhoto}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-border"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setDeceasedPhoto(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date of Death</label>
                  <input
                    type="date"
                    value={deathDate}
                    onChange={(e) => setDeathDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Biography */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-3 flex items-center gap-1.5">
              <FileText size={12} />
              Biography
            </h3>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Write a brief biography of the deceased. Share their life story, achievements, and the memories they leave behind..."
              rows={6}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Section: Funeral Details */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-3 flex items-center gap-1.5">
              <Calendar size={12} />
              Funeral Details
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Funeral Date</label>
                  <input
                    type="date"
                    value={funeralDate}
                    onChange={(e) => setFuneralDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Funeral Time</label>
                  <input
                    type="time"
                    value={funeralTime}
                    onChange={(e) => setFuneralTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <MapPin size={12} className="inline mr-1" />
                  Venue Name
                </label>
                <input
                  type="text"
                  value={funeralVenue}
                  onChange={(e) => setFuneralVenue(e.target.value)}
                  placeholder="e.g. Accra International Conference Centre"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Venue Address</label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="e.g. Castle Road, Osu, Accra"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: Family Members */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-3 flex items-center gap-1.5">
              <Users size={12} />
              Family Members
            </h3>
            <textarea
              value={familyMembers}
              onChange={(e) => setFamilyMembers(e.target.value)}
              placeholder="List family members, e.g.&#10;Wife: Ama Mensah&#10;Children: Kwame, Akua, Yaw&#10;Siblings: Kofi Jr., Abena"
              rows={4}
              className={inputClass + ' resize-none'}
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#b8973f] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Scroll size={16} />
                Publish Obituary (1 credit)
              </>
            )}
          </button>
        </form>

        {/* Existing obituaries */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Obituaries</h2>
          {loadingObituaries ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading...
            </div>
          ) : obituaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No obituaries yet. Create your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {obituaries.map((obit) => (
                <div
                  key={obit.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{obit.deceasedName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {obit.slug && `/${obit.slug}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyLink(obit.slug)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                    <Link
                      to={`/obituary/${obit.slug}`}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="View"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
