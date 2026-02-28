import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Loader2, BookOpen, Music, Download } from 'lucide-react'
import { getLiveService } from '../utils/liveServiceApi'
import { themes } from '../utils/themes'
import { downloadPageAsPdf } from '../utils/downloadQrPdf'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ServiceItem({ item, index, theme }) {
  const [expanded, setExpanded] = useState(false)
  const hasVerses = item.type === 'hymn' && item.verses && item.verses.length > 0

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: theme.border + '20' }}
    >
      <button
        onClick={() => hasVerses && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${hasVerses ? 'cursor-pointer active:opacity-80' : 'cursor-default'}`}
        style={hasVerses && expanded ? { backgroundColor: theme.secondaryBg } : undefined}
        disabled={!hasVerses}
      >
        {/* Number */}
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{
            backgroundColor: item.type === 'hymn' ? theme.heading + '25' : theme.border + '15',
            color: item.type === 'hymn' ? theme.heading : theme.subtleText,
          }}
        >
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.type === 'hymn' && (
              <Music size={14} style={{ color: theme.heading }} className="shrink-0" />
            )}
            {item.type === 'scripture' && (
              <BookOpen size={14} style={{ color: theme.heading }} className="shrink-0" />
            )}
            <span
              className={`text-sm ${item.type === 'hymn' ? 'font-semibold' : ''}`}
              style={{ color: item.type === 'hymn' ? theme.heading : theme.bodyText }}
            >
              {item.type === 'hymn' ? item.title : item.text}
            </span>
          </div>
          {item.type === 'scripture' && item.reference && (
            <p className="text-xs mt-0.5 italic" style={{ color: theme.subtleText }}>
              {item.reference}
            </p>
          )}
          {hasVerses && (
            <p className="text-[10px] mt-1" style={{ color: theme.subtleText }}>
              {expanded ? 'Tap to hide lyrics' : 'Tap to view lyrics'}
            </p>
          )}
        </div>

        {/* Expand icon */}
        {hasVerses && (
          <span className="shrink-0 mt-1" style={{ color: theme.subtleText }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </button>

      {/* Expanded lyrics */}
      {hasVerses && expanded && (
        <div className="px-4 pb-4 pt-1" style={{ backgroundColor: theme.secondaryBg }}>
          <div className="ml-10 space-y-4">
            {item.verses.map((verse, vi) => (
              <div key={vi}>
                <span
                  className="text-[10px] uppercase tracking-widest font-bold block mb-1.5"
                  style={{ color: theme.heading }}
                >
                  Verse {vi + 1}
                </span>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: theme.bodyText }}
                >
                  {verse}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LiveServicePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const result = await getLiveService(id)
        setData(result)
      } catch (err) {
        setError(err.message || 'Service not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm mt-4">Loading order of service...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl text-card-foreground font-semibold mb-2">Service Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">This service page may have expired or the link may be incorrect.</p>
          <Link to="/" className="text-sm text-primary hover:text-primary/90">
            Create a Funeral Brochure
          </Link>
        </div>
      </div>
    )
  }

  const theme = themes[data.theme] || themes.blackGold
  const serviceItems = data.serviceItems || []
  const contentRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!contentRef.current || downloading) return
    setDownloading(true)
    try {
      const name = data.fullName || 'Order-of-Service'
      await downloadPageAsPdf(contentRef.current, `${name}-Order-of-Service.pdf`, { bgColor: theme.pageBg })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.pageBg }}>
      {/* Download button */}
      <div className="max-w-lg mx-auto px-4 pt-4 flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg transition-all disabled:opacity-50"
          style={{
            backgroundColor: theme.secondaryBg,
            color: theme.heading,
            border: `1px solid ${theme.border}40`,
          }}
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {downloading ? 'Preparing PDF...' : 'Download PDF'}
        </button>
      </div>

      <div ref={contentRef}>
      {/* Header */}
      <div className="max-w-lg mx-auto px-4 pt-10 pb-6 text-center">
        {/* Cross */}
        <div className="text-3xl mb-3" style={{ color: theme.heading }}>&#10013;</div>

        {/* Title */}
        <p
          className="text-xs uppercase tracking-[0.3em] mb-4"
          style={{ color: theme.subtleText }}
        >
          Order of Service
        </p>

        {/* Photo */}
        {data.coverPhoto && (
          <div
            className="w-36 h-44 mx-auto rounded-full overflow-hidden border-2 mb-5"
            style={{ borderColor: theme.border }}
          >
            <img src={data.coverPhoto} alt={data.fullName} className="w-full h-full object-cover object-top" />
          </div>
        )}

        {/* Name */}
        <h1
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: theme.heading }}
        >
          {data.fullName}
        </h1>

        {/* Dates */}
        <p className="text-xs" style={{ color: theme.subtleText }}>
          {formatDate(data.birthDate)} — {formatDate(data.deathDate)}
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="h-px w-12" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
          <span style={{ color: theme.border, fontSize: '10px' }}>&#9670;</span>
          <div className="h-px w-12" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
        </div>
      </div>

      {/* Programme Items */}
      <div className="max-w-lg mx-auto px-3 pb-6">
        <div
          className="rounded-xl overflow-hidden border"
          style={{ backgroundColor: theme.pageBg, borderColor: theme.border + '30' }}
        >
          {serviceItems.map((item, i) => (
            <ServiceItem key={i} item={item} index={i} theme={theme} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 pb-10">
        <div className="text-center py-6 border-t" style={{ borderColor: theme.border + '20' }}>
          <div className="text-lg mb-2" style={{ color: theme.heading }}>&#10013;</div>
          <p className="text-[10px]" style={{ color: theme.subtleText }}>
            Created with{' '}
            <Link to="/" className="hover:underline" style={{ color: theme.heading }}>
              FuneralPress
            </Link>
          </p>
        </div>
      </div>
      </div>{/* end ref wrapper */}
    </div>
  )
}
