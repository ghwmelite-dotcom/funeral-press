// src/components/admin/BlogDraftsTab.jsx
// Owner review surface for AI blog drafts (spec §4.6): the single human
// touchpoint. Nothing publishes without the buttons below.
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, X, Eye } from 'lucide-react'
import { apiFetch } from '../../utils/apiClient'

const STATUS_STYLES = {
  draft: 'bg-amber-500/10 text-amber-500',
  published: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-400',
}

export default function BlogDraftsTab() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null) // full post object
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/admin/blog')
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id, action) => {
    setBusyId(id)
    try {
      await apiFetch(`/admin/blog/${id}/${action}`, { method: 'POST' })
      load()
      if (preview?.id === id) setPreview(null)
    } catch { /* surface stays unchanged; admin can retry */ } finally {
      setBusyId(null)
    }
  }

  const openPreview = async (id) => {
    try {
      const d = await apiFetch(`/admin/blog/${id}`)
      setPreview(d.post)
    } catch { /* ignore */ }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 className="animate-spin inline" size={20} /></div>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-card-foreground">Blog drafts</h2>
      {posts.length === 0 && <p className="text-sm text-muted-foreground">No drafts yet — the Wednesday cron writes one per week.</p>}
      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[p.status] || ''}`}>{p.status}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-card-foreground truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground truncate">{p.topic || p.slug}</p>
            </div>
            <button type="button" onClick={() => openPreview(p.id)} aria-label="Preview" className="p-2 text-muted-foreground hover:text-primary"><Eye size={16} /></button>
            {p.status === 'draft' && (
              <>
                <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p.id, 'publish')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg disabled:opacity-50">
                  <Check size={13} /> Publish
                </button>
                <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p.id, 'reject')}
                  className="flex items-center gap-1 px-3 py-1.5 border border-border text-xs text-muted-foreground rounded-lg hover:border-red-400 hover:text-red-400 disabled:opacity-50">
                  <X size={13} /> Reject
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-card-foreground">{preview.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{preview.description}</p>
            </div>
            <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="p-2 text-muted-foreground hover:text-primary shrink-0"><X size={16} /></button>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground max-h-96 overflow-y-auto">
            {(preview.content || []).map((block, i) => {
              if (block.type === 'heading') return <h4 key={i} className="text-card-foreground font-semibold pt-2">{block.text}</h4>
              if (block.type === 'list') return <ul key={i} className="list-disc pl-5 space-y-1">{block.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              if (block.type === 'cta') return <p key={i} className="text-primary">→ {block.text} ({block.link})</p>
              return <p key={i}>{block.text}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
