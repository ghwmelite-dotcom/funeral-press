import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Images, Plus, Edit3, Share2, ArrowLeft, Loader2 } from 'lucide-react'
import { apiFetch } from '../utils/apiClient'
import { useNotification } from '../components/ui/notification'
import PageMeta from '../components/seo/PageMeta'

const DRAFT_KEY = 'funeralpress_gallery_draft'

export default function GalleryCreatorPage() {
  const navigate = useNavigate()
  const { notify } = useNotification()

  const [title, setTitle] = useState('')
  const [deceasedName, setDeceasedName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [galleries, setGalleries] = useState([])
  const [loading, setLoading] = useState(true)

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY))
      if (draft) {
        setTitle(draft.title || '')
        setDeceasedName(draft.deceasedName || '')
        setDescription(draft.description || '')
      }
    } catch { /* ignore */ }
  }, [])

  // Save draft on every change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, deceasedName, description }))
    } catch { /* ignore */ }
  }, [title, deceasedName, description])

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchGalleries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchGalleries() {
    try {
      const data = await apiFetch('/galleries')
      setGalleries(data.galleries || [])
    } catch (err) {
      notify(err.message || 'Failed to load galleries', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim() || !deceasedName.trim()) {
      notify('Please fill in the title and deceased name', 'warning')
      return
    }
    setCreating(true)
    try {
      const data = await apiFetch('/galleries/create', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), deceasedName: deceasedName.trim(), description: description.trim() }),
      })
      notify('Gallery created successfully!', 'success')
      clearDraft()
      navigate(`/gallery-editor/${data.slug}`)
    } catch (err) {
      notify(err.message || 'Failed to create gallery', 'error')
    } finally {
      setCreating(false)
    }
  }

  function handleShare(slug) {
    const url = `${window.location.origin}/gallery/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      notify('Gallery link copied to clipboard!', 'success')
    }).catch(() => {
      notify('Could not copy link', 'error')
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Photo Gallery Maker | FuneralPress"
        description="Create beautiful photo galleries to celebrate and remember your loved ones. Upload photos, add captions, and share with family and friends."
        path="/gallery-creator"
      />

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Images size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Photo Gallery Maker</span>
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Home</span>
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 sm:pb-8 space-y-10">
        {/* Create Gallery Form */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h1 className="text-xl font-semibold text-foreground">Create a New Photo Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Create a beautiful online photo gallery to celebrate the life of your loved one.
            Share it with family and friends so everyone can view and remember together.
          </p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Gallery Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Celebrating the Life of John"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Deceased Name</label>
              <input
                type="text"
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                placeholder="Full name of the deceased"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description or tribute..."
                rows={3}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Gallery (1 credit)
            </button>
          </form>
        </section>

        {/* Existing Galleries */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Galleries</h2>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Loading galleries...
            </div>
          ) : galleries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Images size={40} className="mx-auto mb-3 opacity-40" />
              <p>You haven't created any galleries yet.</p>
              <p className="text-xs mt-1">Create your first gallery above to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {galleries.map((gallery) => (
                <div
                  key={gallery.id}
                  className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-foreground text-sm">{gallery.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gallery.deceased_name || gallery.deceasedName}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {gallery.photo_count || 0} photo{(gallery.photo_count || 0) !== 1 ? 's' : ''}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/gallery-editor/${gallery.slug}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                    >
                      <Edit3 size={12} />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleShare(gallery.slug)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-md hover:text-foreground transition-colors"
                    >
                      <Share2 size={12} />
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
