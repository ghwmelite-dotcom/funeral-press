import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Heart, Calendar, MapPin, Clock, BookOpen, Loader2, Download, Lock, X } from 'lucide-react'
import { getMemorial, getMemorialEntitlement } from '../utils/memorialApi'
import { themes } from '../utils/themes'
import { resolveMemorialTheme } from '../utils/memorialTheme'
import { DonatePanel } from '../components/donation/DonatePanel.jsx'
import UpgradeTributeCard from '../components/memorial/UpgradeTributeCard.jsx'
import UpgradeDialog from '../components/memorial/UpgradeDialog.jsx'
import TributeVideoStudio from '../components/memorial/TributeVideoStudio.jsx'
import TributeWall from '../components/memorial/TributeWall.jsx'
import FollowMemorial from '../components/memorial/FollowMemorial.jsx'
import { recordLoopEvent, captureLoopSurface } from '../utils/loopAnalytics'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`
}

export default function MemorialPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const contentRef = useRef(null)
  const footerImpressionFired = useRef(false)
  const [downloading, setDownloading] = useState(false)
  const [entitlement, setEntitlement] = useState({ premium: false, tier: null, features: {} })
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const [showQrRibbon, setShowQrRibbon] = useState(false)
  const qrRibbonKey = `fp-qr-ribbon-${id}`

  // Convenience derived values
  const premium = !!entitlement.premium
  const features = entitlement.features ?? {}

  const refreshEntitlement = () => {
    getMemorialEntitlement(id).then((e) => setEntitlement(e)).catch(() => {})
  }

  useEffect(() => {
    async function load() {
      try {
        const result = await getMemorial(id)
        setData(result)
      } catch (err) {
        setError(err.message || 'Memorial not found')
      } finally {
        setLoading(false)
      }
    }
    load()
    refreshEntitlement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Loop impression (spec §2.6): every public memorial view is a footer
  // impression. Ref guard: at most once per mount (StrictMode double-invokes
  // effects in dev, and `data` identity can change without a new view).
  useEffect(() => {
    if (data && !footerImpressionFired.current) {
      footerImpressionFired.current = true
      recordLoopEvent('loop_impression', 'memorial_footer', { memorialId: id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    // First-visit ribbon for print-QR scanners (spec §2.4): tribute first,
    // pathway second; dismiss is permanent per visitor per memorial.
    let seen = false
    try { seen = !!localStorage.getItem(qrRibbonKey) } catch { /* ignore */ }
    if (searchParams.get('src') === 'qr' && !seen) {
      setShowQrRibbon(true)
      recordLoopEvent('loop_impression', 'qr_ribbon', { memorialId: id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dismissQrRibbon = () => {
    try { localStorage.setItem(qrRibbonKey, '1') } catch { /* ignore */ }
    setShowQrRibbon(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm mt-4">Loading memorial...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Heart size={48} className="text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl text-card-foreground font-semibold mb-2">Memorial Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">This memorial page may have expired or the link may be incorrect.</p>
          <Link to="/" className="text-sm text-primary hover:text-primary/90">
            Create a Memorial Brochure
          </Link>
        </div>
      </div>
    )
  }

  const { theme, fellBack: themeFellBack } = resolveMemorialTheme(data.theme, features, themes)

  const handleDownload = async () => {
    if (!contentRef.current || downloading) return
    setDownloading(true)
    try {
      const { downloadPageAsPdf } = await import('../utils/downloadQrPdf')
      const name = data.fullName || 'Memorial'
      await downloadPageAsPdf(contentRef.current, `${name}-Memorial.pdf`, { bgColor: theme.pageBg })
    } finally {
      setDownloading(false)
    }
  }

  const ogTitle = `${data.fullName || 'Memorial'} — Memorial`
  const ogDescription = (() => {
    if (data.tributes && data.tributes.length > 0 && data.tributes[0].body) {
      const text = data.tributes[0].body
      return text.length > 150 ? text.slice(0, 147) + '...' : text
    }
    if (data.biography) {
      return data.biography.length > 150 ? data.biography.slice(0, 147) + '...' : data.biography
    }
    return `In loving memory of ${data.fullName || 'our beloved'}. View the memorial page and celebrate their life.`
  })()

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.pageBg }}>
      {showQrRibbon && (
        <div
          className="sticky top-0 z-40 flex items-center justify-center gap-3 px-4 py-2 text-xs"
          style={{ backgroundColor: theme.secondaryBg, color: theme.bodyText }}
        >
          <span>
            You're viewing a tribute to {data.fullName} ·{' '}
            <Link
              to="/honour?from=qr_ribbon"
              onClick={() => {
                captureLoopSurface('qr_ribbon')
                recordLoopEvent('loop_click', 'qr_ribbon', { memorialId: id })
              }}
              className="hover:underline"
              style={{ color: theme.heading }}
            >
              Created with FuneralPress
            </Link>
          </span>
          <button
            type="button"
            onClick={dismissQrRibbon}
            aria-label="Dismiss"
            className="min-w-[44px] min-h-[44px] -my-2 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <Helmet>
        <title>{ogTitle} | FuneralPress</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://funeralpress.org/memorial/${id}`} />
        {data.coverPhoto && <meta property="og:image" content={data.coverPhoto} />}
        <meta name="description" content={ogDescription} />
      </Helmet>

      {/* Download button */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 flex justify-end items-center gap-3">
        {/* Theme fallback nudge — shown when a premium theme was chosen but not entitled */}
        {themeFellBack && (
          <button
            data-testid="theme-upgrade-nudge"
            onClick={() => setUpgradeOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-opacity opacity-60 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            style={{
              backgroundColor: theme.secondaryBg,
              color: theme.heading,
              border: `1px solid ${theme.border}50`,
            }}
            aria-label="Unlock premium themes"
          >
            <Lock size={11} />
            <span>Unlock premium themes</span>
          </button>
        )}
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
      {/* Header / Hero */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        {/* Cross */}
        <div className="text-3xl mb-4" style={{ color: theme.heading }}>&#10013;</div>

        {/* Subtitle */}
        <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: theme.subtleText }}>
          {data.coverSubtitle || 'Celebration of Life'}
        </p>

        {/* Photo */}
        {data.coverPhoto && (
          <div className="w-48 h-60 mx-auto rounded-full overflow-hidden border-2 mb-6" style={{ borderColor: theme.border }}>
            <img src={data.coverPhoto} alt={data.fullName} className="w-full h-full object-cover object-top" />
          </div>
        )}

        {/* Name */}
        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: theme.heading }}
        >
          {data.title} {data.fullName}
        </h1>

        {/* Dates */}
        <p className="text-sm" style={{ color: theme.subtleText }}>
          {formatDate(data.dateOfBirth)} — {formatDate(data.dateOfDeath)}
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 my-8">
          <div className="h-px w-16" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
          <span style={{ color: theme.border }}>&#9670;</span>
          <div className="h-px w-16" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
        </div>

        {/* Cover verse */}
        {data.coverVerse && (
          <p className="text-sm italic max-w-lg mx-auto leading-relaxed" style={{ color: theme.subtleText }}>
            {data.coverVerse}
          </p>
        )}
      </div>

      {/* Funeral Details */}
      <div className="max-w-2xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.secondaryBg }}>
            <Calendar size={20} className="mx-auto mb-2" style={{ color: theme.heading }} />
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.subtleText }}>Date</p>
            <p className="text-sm font-medium" style={{ color: theme.bodyText }}>{formatDate(data.funeralDate)}</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.secondaryBg }}>
            <Clock size={20} className="mx-auto mb-2" style={{ color: theme.heading }} />
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.subtleText }}>Time</p>
            <p className="text-sm font-medium" style={{ color: theme.bodyText }}>{formatTime(data.funeralTime)}</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.secondaryBg }}>
            <MapPin size={20} className="mx-auto mb-2" style={{ color: theme.heading }} />
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.subtleText }}>Venue</p>
            <p className="text-sm font-medium" style={{ color: theme.bodyText }}>{data.funeralVenue}</p>
          </div>
        </div>

        {/* Donation panel — renders null unless donation is enabled & approved */}
        <DonatePanel memorial={data} />

        {/* Follow memorial — yearly reminder opt-in */}
        <FollowMemorial
          memorialId={id}
          deceasedName={data.fullName}
          dateOfBirth={data.dateOfBirth}
          dateOfDeath={data.dateOfDeath}
        />

        {/* Tribute wall — paid candles, flowers & tributes */}
        <TributeWall memorialId={id} deceasedName={data.fullName} />

        {/* Biography */}
        {data.biography && (
          <div className="mb-12">
            <h2
              className="text-lg font-bold text-center mb-6 uppercase tracking-[0.2em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: theme.heading }}
            >
              Biography
            </h2>
            <div className="space-y-4">
              {data.biography.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: theme.bodyText }}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Tributes */}
        {data.tributes && data.tributes.length > 0 && (
          <div className="mb-12">
            <h2
              className="text-lg font-bold text-center mb-6 uppercase tracking-[0.2em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: theme.heading }}
            >
              Tributes
            </h2>
            <div className="space-y-8">
              {data.tributes.map((tribute, i) => (
                <div key={i} className="p-6 rounded-lg" style={{ backgroundColor: theme.secondaryBg }}>
                  <h3 className="text-sm font-bold mb-1" style={{ color: theme.heading }}>
                    {tribute.title}
                  </h3>
                  {tribute.subtitle && (
                    <p className="text-xs italic mb-3" style={{ color: theme.subtleText }}>{tribute.subtitle}</p>
                  )}
                  {tribute.openingVerse && (
                    <p className="text-xs italic mb-4" style={{ color: theme.subtleText }}>{tribute.openingVerse}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: theme.bodyText }}>
                    {tribute.body}
                  </p>
                  {tribute.closingLine && (
                    <p className="text-xs font-semibold mt-4 italic" style={{ color: theme.heading }}>
                      {tribute.closingLine}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acknowledgements */}
        {data.acknowledgements && (
          <div className="mb-12">
            <h2
              className="text-lg font-bold text-center mb-6 uppercase tracking-[0.2em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: theme.heading }}
            >
              Acknowledgements
            </h2>
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: theme.secondaryBg }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: theme.bodyText }}>
                {data.acknowledgements}
              </p>
              {data.familySignature && (
                <p className="text-sm font-semibold mt-4 italic" style={{ color: theme.heading }}>
                  — {data.familySignature}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer — loop pathway (spec §2.2): dignified attribution on all tiers */}
        <div className="text-center py-8 border-t" style={{ borderColor: theme.border + '30' }}>
          <div className="text-lg mb-2" style={{ color: theme.heading }}>&#10013;</div>
          <p className="text-xs" style={{ color: theme.subtleText }}>
            This tribute was lovingly created with{' '}
            <Link
              to="/honour?from=memorial_footer"
              onClick={() => {
                captureLoopSurface('memorial_footer')
                recordLoopEvent('loop_click', 'memorial_footer', { memorialId: id })
              }}
              className="hover:underline"
              style={{ color: theme.heading }}
            >
              FuneralPress
            </Link>
          </p>
        </div>

        {/* Premium upgrade / status — opens tier dialog when not yet premium */}
        <UpgradeTributeCard
          deceasedName={data.fullName}
          premium={premium}
          onUpgrade={() => setUpgradeOpen(true)}
        />

        {/* Tier upgrade dialog */}
        <UpgradeDialog
          memorialId={id}
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          onSuccess={refreshEntitlement}
        />

        {/* AI Tribute Video — gated on features.tributeVideo from entitlement */}
        {features.tributeVideo && (
          <TributeVideoStudio
            memorialId={id}
            deceasedName={data.fullName}
            subtitle={`${formatDate(data.dateOfBirth)} — ${formatDate(data.dateOfDeath)}`}
            biography={data.biography}
            coverPhoto={data.coverPhoto}
          />
        )}

        {/* Branding footer (free tier / no removeBranding entitlement) */}
        {!features.removeBranding && (
          <div className="text-center py-6 border-t border-border mt-12">
            <a href="https://funeralpress.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Created with FuneralPress
            </a>
          </div>
        )}
      </div>
      </div>{/* end ref wrapper */}

      {/* FuneralPress branding (free tier / no removeBranding entitlement) */}
      {!features.removeBranding && (
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <a
            href="https://funeralpress.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs opacity-40 hover:opacity-60 transition-opacity"
            style={{ color: theme.subtleText }}
          >
            Created with FuneralPress
          </a>
        </div>
      )}
    </div>
  )
}
