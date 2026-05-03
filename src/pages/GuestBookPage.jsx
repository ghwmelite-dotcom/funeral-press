import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { BookOpen, Send, Loader2, User, MessageSquare, Clock } from 'lucide-react'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

export default function GuestBookPage() {
  const { slug } = useParams()
  const [book, setBook] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sign form state
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    fetchBook()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function fetchBook() {
    try {
      const res = await fetch(`${API_BASE}/guest-book/${slug}`)
      if (!res.ok) throw new Error('Guest book not found')
      const data = await res.json()
      setBook(data.book)
      setEntries(data.entries || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSign(e) {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    setSigning(true)
    try {
      const res = await fetch(`${API_BASE}/guest-book/${slug}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      })
      if (!res.ok) throw new Error('Failed to sign guest book')
      const data = await res.json()
      setEntries((prev) => [
        ...prev,
        { id: data.id, name: name.trim(), message: message.trim(), createdAt: new Date().toISOString() },
      ])
      setName('')
      setMessage('')
      setSigned(true)
      setTimeout(() => setSigned(false), 4000)
    } catch {
      // silent
    } finally {
      setSigning(false)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C9A84C]" />
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-center px-4">
        <div>
          <BookOpen size={48} className="text-[#C9A84C]/40 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Guest Book Not Found</h1>
          <p className="text-[#999] text-sm">This guest book may have been removed or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <PageMeta
        title={`Guest Book for ${book.deceasedName} | FuneralPress`}
        description={book.coverMessage || `Sign the digital guest book in memory of ${book.deceasedName}. Leave a message of love and remembrance.`}
        path={`/guest-book/${slug}`}
        image={book.deceasedPhoto}
      />

      {/* Hero section */}
      <div className="relative pt-12 pb-10 px-4 text-center">
        {/* Subtle decorative line */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
          <span className="text-[#C9A84C] text-lg">&#10013;</span>
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
        </div>

        {book.deceasedPhoto && (
          <div className="w-28 h-28 rounded-full mx-auto mb-5 border-2 border-[#C9A84C]/40 overflow-hidden shadow-lg shadow-[#C9A84C]/10">
            <img
              src={book.deceasedPhoto}
              alt={book.deceasedName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          In Loving Memory of
        </h1>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#C9A84C] mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {book.deceasedName}
        </h2>

        {book.coverMessage && (
          <p className="text-[#bbb] text-sm sm:text-base max-w-lg mx-auto leading-relaxed italic">
            "{book.coverMessage}"
          </p>
        )}

        {/* Entry count */}
        <div className="mt-6 inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-full px-4 py-2 text-xs text-[#999]">
          <BookOpen size={14} className="text-[#C9A84C]" />
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} signed
        </div>
      </div>

      {/* Entries */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        {entries.length > 0 && (
          <div className="space-y-4 mb-10">
            {entries.map((entry, i) => (
              <div
                key={entry.id || i}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 transition-all hover:border-[#C9A84C]/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={16} className="text-[#C9A84C]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-white truncate">{entry.name}</span>
                      {entry.createdAt && (
                        <span className="text-[10px] text-[#666] flex items-center gap-1 shrink-0">
                          <Clock size={10} />
                          {formatDate(entry.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[#ccc] text-sm leading-relaxed">{entry.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sign form */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-[#C9A84C]" />
            Sign the Guest Book
          </h3>

          {signed && (
            <div className="mb-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg px-4 py-3 text-sm text-[#C9A84C]">
              Thank you for signing the guest book.
            </div>
          )}

          <form onSubmit={handleSign} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Your Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 placeholder:text-[#555] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Your Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message of love and remembrance..."
                rows={4}
                required
                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 placeholder:text-[#555] transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={signing || !name.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#b8973f] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {signing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Sign Guest Book
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-6 text-center">
        <a
          href="https://funeralpress.org"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#555] hover:text-[#C9A84C] transition-colors tracking-wider uppercase"
        >
          Created with FuneralPress
        </a>
      </footer>
    </div>
  )
}
