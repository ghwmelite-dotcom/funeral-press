import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { BookOpen, ArrowLeft, Plus, Copy, ExternalLink, Loader2, User, Image, MessageSquare, Upload, LinkIcon } from 'lucide-react'
import { apiFetch } from '../utils/apiClient'
import { useNotification } from '../components/ui/notification'

const DRAFT_KEY = 'funeralpress_guestbook_draft'

export default function GuestBookCreatorPage() {
  const { notify } = useNotification()
  const [deceasedName, setDeceasedName] = useState('')
  const [deceasedPhoto, setDeceasedPhoto] = useState('')
  const [coverMessage, setCoverMessage] = useState('')
  const [photoMode, setPhotoMode] = useState('upload') // 'upload' or 'url'
  const [creating, setCreating] = useState(false)
  const [createdSlug, setCreatedSlug] = useState(null)
  const [books, setBooks] = useState([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const fileInputRef = useRef(null)

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY))
      if (draft) {
        setDeceasedName(draft.deceasedName || '')
        setDeceasedPhoto(draft.deceasedPhoto || '')
        setCoverMessage(draft.coverMessage || '')
        if (draft.deceasedPhoto && draft.deceasedPhoto.startsWith('data:')) {
          setPhotoMode('upload')
        } else if (draft.deceasedPhoto) {
          setPhotoMode('url')
        }
      }
    } catch {}
  }, [])

  // Save draft on every change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ deceasedName, deceasedPhoto, coverMessage }))
    } catch {}
  }, [deceasedName, deceasedPhoto, coverMessage])

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

  useEffect(() => {
    fetchBooks()
  }, [])

  async function fetchBooks() {
    try {
      const data = await apiFetch('/guest-books')
      setBooks(data.books || [])
    } catch {
      // silently fail
    } finally {
      setLoadingBooks(false)
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
      const data = await apiFetch('/guest-books/create', {
        method: 'POST',
        body: JSON.stringify({ deceasedName: deceasedName.trim(), deceasedPhoto, coverMessage }),
      })
      setCreatedSlug(data.slug)
      notify('Guest book created successfully!', 'success')
      setDeceasedName('')
      setDeceasedPhoto('')
      setCoverMessage('')
      clearDraft()
      fetchBooks()
    } catch (err) {
      notify(err.message || 'Failed to create guest book', 'error')
    } finally {
      setCreating(false)
    }
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/guest-book/${slug}`
    navigator.clipboard.writeText(url)
    notify('Link copied to clipboard!', 'success')
  }

  const inputClass = 'w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 placeholder:text-muted-foreground/60 transition-all'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Create a Digital Guest Book | FuneralPress"
        description="Create a beautiful digital guest book for a memorial or funeral. Allow friends and family to sign and leave heartfelt messages online."
        path="/guest-book-creator"
      />

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <BookOpen size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Guest Book Creator</span>
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
            <BookOpen size={28} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Digital Guest Book</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Create a beautiful online guest book where friends and family can leave messages of love and remembrance.
          </p>
        </div>

        {/* Created success banner */}
        {createdSlug && (
          <div className="mb-8 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl p-5">
            <p className="text-sm font-medium text-foreground mb-2">Guest book created! Share this link:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/guest-book/${createdSlug}`}
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
                to={`/guest-book/${createdSlug}`}
                className="p-2 rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors"
                title="Open guest book"
              >
                <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Plus size={18} className="text-[#C9A84C]" />
            Create New Guest Book
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                <User size={12} className="inline mr-1" />
                Deceased Name *
              </label>
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

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                <MessageSquare size={12} className="inline mr-1" />
                Cover Message
              </label>
              <textarea
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                placeholder="A brief message that visitors will see when they open the guest book..."
                rows={3}
                className={inputClass + ' resize-none'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#b8973f] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <BookOpen size={16} />
                Create Guest Book (1 credit)
              </>
            )}
          </button>
        </form>

        {/* Existing books */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Guest Books</h2>
          {loadingBooks ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading...
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No guest books yet. Create your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{book.deceasedName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {book.slug && `/${book.slug}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyLink(book.slug)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                    <Link
                      to={`/guest-book/${book.slug}`}
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
