import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useBrochureStore } from '../stores/brochureStore'
import { generateQRCodeDataUrl } from '../utils/qrCode'
import PageMeta from '../components/seo/PageMeta'
import { downloadCardAsPdf } from '../utils/downloadQrPdf'
import { events } from '../utils/analytics'

/* Inject portrait @page rule while this page is mounted */
function usePortraitPrint() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@page { size: portrait; margin: 0; }'
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
}

const GOLD = '#C9A84C'
const BLACK = '#1A1A1A'
const CREAM = '#FDF8F0'
const DARK_GOLD = '#A6882F'

export default function QRCodePrintPage() {
  usePortraitPrint()

  const store = useBrochureStore()
  const {
    fullName, title, dateOfBirth, dateOfDeath,
    funeralDate, funeralVenue,
    memorialId, liveServiceId,
    memorialQrCode, liveServiceQrCode,
  } = store

  const [qrMemorial, setQrMemorial] = useState(memorialQrCode)
  const [qrLiveService, setQrLiveService] = useState(liveServiceQrCode)
  const [downloading, setDownloading] = useState(null) // 'memorial' | 'service' | null

  const memorialRef = useRef(null)
  const serviceRef = useRef(null)

  const memorialUrl = memorialId ? `https://funeralpress.org/memorial/${memorialId}` : null
  const liveServiceUrl = liveServiceId ? `https://funeralpress.org/live-service/${liveServiceId}` : null

  // Generate QR codes on mount if URLs exist but QR data doesn't
  useEffect(() => {
    async function gen() {
      let generated = false
      if (memorialUrl && !qrMemorial) {
        const qr = await generateQRCodeDataUrl(memorialUrl, { width: 400, margin: 2, dark: BLACK, light: '#FFFFFF' })
        setQrMemorial(qr)
        generated = true
      }
      if (liveServiceUrl && !qrLiveService) {
        const qr = await generateQRCodeDataUrl(liveServiceUrl, { width: 400, margin: 2, dark: BLACK, light: '#FFFFFF' })
        setQrLiveService(qr)
        generated = true
      }
      if (generated) {
        events.qrCodeGenerated()
      }
    }
    gen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memorialUrl, liveServiceUrl])

  const formatDate = (d) => {
    if (!d) return ''
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return d }
  }

  const lifeSpan = dateOfBirth && dateOfDeath
    ? `${formatDate(dateOfBirth)} — ${formatDate(dateOfDeath)}`
    : ''

  const displayName = `${title || ''} ${fullName || ''}`.trim()
  const safeName = (fullName || 'QR-Card').replace(/\s+/g, '-')

  const noPages = !memorialUrl && !liveServiceUrl

  const handleDownload = useCallback(async (type) => {
    const ref = type === 'memorial' ? memorialRef : serviceRef
    if (!ref.current) return
    setDownloading(type)
    try {
      const label = type === 'memorial' ? 'Memorial' : 'Order-of-Service'
      await downloadCardAsPdf(ref.current, `${safeName}-${label}-QR.pdf`)
    } finally {
      setDownloading(null)
    }
  }, [safeName])

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Memorial QR Code Cards — Link Print to Digital Memorials | FuneralPress"
        description="Generate QR code cards that link to online memorial pages. Print and distribute at funerals so guests can access tributes, photos, and memorial slideshows."
        path="/qr-cards"
      />
      {/* Header bar — hidden when printing */}
      <header className="print:hidden sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/editor">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Editor</Button>
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">QR Code Cards</h1>
          </div>
          <Button size="sm" onClick={() => window.print()} disabled={noPages}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print All
          </Button>
        </div>
      </header>

      {noPages && (
        <div className="print:hidden max-w-lg mx-auto px-4 py-16 text-center space-y-3">
          <p className="text-muted-foreground">No memorial or live service has been published yet.</p>
          <p className="text-sm text-muted-foreground">Publish from the editor first, then return here to print QR code cards for attendees.</p>
          <Link to="/editor"><Button variant="outline" size="sm" className="mt-4">Go to Editor</Button></Link>
        </div>
      )}

      {/* ═══ PRINT AREA — hidden on screen, visible in print ═══ */}
      <div className="qr-print-area hidden print:block">
        {memorialUrl && qrMemorial && (
          <div className="qr-print-page">
            <QRCard
              type="memorial"
              title="Online Memorial"
              subtitle="Scan to visit the memorial page"
              description="View the full biography, photo gallery, tributes, and leave a message of condolence for the family."
              qrDataUrl={qrMemorial}
              url={memorialUrl}
              displayName={displayName}
              lifeSpan={lifeSpan}
              funeralVenue={funeralVenue}
            />
          </div>
        )}
        {liveServiceUrl && qrLiveService && (
          <div className="qr-print-page">
            <QRCard
              type="service"
              title="Order of Service"
              subtitle="Scan to follow along with the service"
              description="Access the complete order of service, hymns, scripture readings, and programme for today's ceremony."
              qrDataUrl={qrLiveService}
              url={liveServiceUrl}
              displayName={displayName}
              lifeSpan={lifeSpan}
              funeralVenue={funeralVenue}
              funeralDate={formatDate(funeralDate)}
            />
          </div>
        )}
      </div>

      {/* ═══ SCREEN PREVIEW ═══ */}
      {!noPages && (
        <div className="print:hidden max-w-3xl mx-auto px-4 pb-16 space-y-10">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium pt-6">Preview — prints at full page size</p>

          {memorialUrl && qrMemorial && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Memorial Page QR</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload('memorial')}
                  disabled={downloading === 'memorial'}
                >
                  {downloading === 'memorial'
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating...</>
                    : <><Download className="w-3.5 h-3.5 mr-1" /> Download PDF</>
                  }
                </Button>
              </div>
              <div
                ref={memorialRef}
                className="rounded-xl shadow-2xl overflow-hidden border border-border"
                style={{ aspectRatio: '210/297' }}
              >
                <QRCard
                  type="memorial"
                  title="Online Memorial"
                  subtitle="Scan to visit the memorial page"
                  description="View the full biography, photo gallery, tributes, and leave a message of condolence for the family."
                  qrDataUrl={qrMemorial}
                  url={memorialUrl}
                  displayName={displayName}
                  lifeSpan={lifeSpan}
                  funeralVenue={funeralVenue}
                />
              </div>
            </div>
          )}

          {liveServiceUrl && qrLiveService && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Order of Service QR</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload('service')}
                  disabled={downloading === 'service'}
                >
                  {downloading === 'service'
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating...</>
                    : <><Download className="w-3.5 h-3.5 mr-1" /> Download PDF</>
                  }
                </Button>
              </div>
              <div
                ref={serviceRef}
                className="rounded-xl shadow-2xl overflow-hidden border border-border"
                style={{ aspectRatio: '210/297' }}
              >
                <QRCard
                  type="service"
                  title="Order of Service"
                  subtitle="Scan to follow along with the service"
                  description="Access the complete order of service, hymns, scripture readings, and programme for today's ceremony."
                  qrDataUrl={qrLiveService}
                  url={liveServiceUrl}
                  displayName={displayName}
                  lifeSpan={lifeSpan}
                  funeralVenue={funeralVenue}
                  funeralDate={formatDate(funeralDate)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   QR CARD — Full-page, premium funeral print design
   ═══════════════════════════════════════════════════════════ */
function QRCard({ type, title, subtitle, description, qrDataUrl, url, displayName, lifeSpan, funeralVenue, funeralDate }) {
  const isMemorial = type === 'memorial'

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: CREAM,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
    }}>

      {/* Outer decorative border */}
      <div style={{
        position: 'absolute', inset: '16px',
        border: `2px solid ${GOLD}`,
        pointerEvents: 'none',
        zIndex: 2,
      }} />
      {/* Inner decorative border */}
      <div style={{
        position: 'absolute', inset: '22px',
        border: `0.5px solid ${DARK_GOLD}`,
        pointerEvents: 'none',
        zIndex: 2,
        opacity: 0.5,
      }} />

      {/* Corner ornaments */}
      <Corner pos="top-left" />
      <Corner pos="top-right" />
      <Corner pos="bottom-left" />
      <Corner pos="bottom-right" />

      {/* Top gold bar */}
      <div style={{
        width: 'calc(100% - 64px)',
        marginTop: '40px',
        height: '3px',
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />

      {/* Cross symbol */}
      <div style={{
        fontSize: '28px',
        color: GOLD,
        marginTop: '16px',
        lineHeight: 1,
      }}>
        &#10013;
      </div>

      {/* "In Loving Memory Of" */}
      <p style={{
        fontSize: '11px',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.35em',
        marginTop: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 500,
      }}>
        {isMemorial ? 'In Loving Memory Of' : 'Funeral Service For'}
      </p>

      {/* Deceased name */}
      <h1 style={{
        fontSize: 'clamp(22px, 3.5vw, 34px)',
        color: BLACK,
        textAlign: 'center',
        marginTop: '8px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        padding: '0 48px',
      }}>
        {displayName || 'Name'}
      </h1>

      {/* Life dates */}
      {lifeSpan && (
        <p style={{
          fontSize: '12px',
          color: '#777',
          marginTop: '6px',
          letterSpacing: '0.1em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {lifeSpan}
        </p>
      )}

      {/* Ornamental divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '14px',
      }}>
        <div style={{ width: '60px', height: '1px', background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '14px' }}>&#10022;</span>
        <div style={{ width: '60px', height: '1px', background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>

      {/* Card type label */}
      <div style={{
        marginTop: '18px',
        background: BLACK,
        color: GOLD,
        padding: '8px 36px',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {title}
      </div>

      {/* QR code container */}
      <div style={{
        marginTop: '24px',
        padding: '14px',
        background: '#fff',
        border: `2px solid ${GOLD}`,
        boxShadow: `0 0 0 1px ${DARK_GOLD}22, 0 8px 32px rgba(0,0,0,0.08)`,
        position: 'relative',
      }}>
        {/* Small corner accents on QR frame */}
        <div style={{ position: 'absolute', top: -1, left: -1, width: '14px', height: '14px', borderTop: `3px solid ${GOLD}`, borderLeft: `3px solid ${GOLD}` }} />
        <div style={{ position: 'absolute', top: -1, right: -1, width: '14px', height: '14px', borderTop: `3px solid ${GOLD}`, borderRight: `3px solid ${GOLD}` }} />
        <div style={{ position: 'absolute', bottom: -1, left: -1, width: '14px', height: '14px', borderBottom: `3px solid ${GOLD}`, borderLeft: `3px solid ${GOLD}` }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: '14px', height: '14px', borderBottom: `3px solid ${GOLD}`, borderRight: `3px solid ${GOLD}` }} />

        <img
          src={qrDataUrl}
          alt={`QR Code for ${title}`}
          style={{
            width: 'min(200px, 35vw)',
            height: 'min(200px, 35vw)',
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Scan instruction */}
      <p style={{
        marginTop: '16px',
        fontSize: '14px',
        color: BLACK,
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '0.02em',
      }}>
        {subtitle}
      </p>

      {/* Description */}
      <p style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#777',
        textAlign: 'center',
        lineHeight: 1.6,
        maxWidth: '360px',
        padding: '0 32px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {description}
      </p>

      {/* Venue / Date info */}
      {(funeralVenue || funeralDate) && (
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {funeralVenue && (
            <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.5 }}>
              {funeralVenue}
            </p>
          )}
          {funeralDate && (
            <p style={{ fontSize: '11px', color: '#666', fontWeight: 600, marginTop: '2px' }}>
              {funeralDate}
            </p>
          )}
        </div>
      )}

      {/* URL display */}
      <div style={{
        marginTop: 'auto',
        paddingBottom: '48px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '10px',
          justifyContent: 'center',
        }}>
          <div style={{ width: '40px', height: '1px', background: `linear-gradient(to right, transparent, ${GOLD})` }} />
          <span style={{ color: GOLD, fontSize: '10px' }}>&#10022;</span>
          <div style={{ width: '40px', height: '1px', background: `linear-gradient(to left, transparent, ${GOLD})` }} />
        </div>
        <p style={{
          fontSize: '10px',
          color: '#999',
          letterSpacing: '0.08em',
          fontFamily: 'monospace',
        }}>
          {url}
        </p>
        <p style={{
          fontSize: '9px',
          color: '#bbb',
          marginTop: '6px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          funeralpress.org
        </p>
      </div>
    </div>
  )
}

/* Corner ornament component */
function Corner({ pos }) {
  const size = '20px'
  const offset = '12px'
  const style = {
    position: 'absolute',
    width: size,
    height: size,
    zIndex: 3,
    pointerEvents: 'none',
  }

  const line = { position: 'absolute', background: GOLD }

  if (pos === 'top-left') {
    Object.assign(style, { top: offset, left: offset })
    return (
      <div style={style}>
        <div style={{ ...line, top: 0, left: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, top: 0, left: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
  if (pos === 'top-right') {
    Object.assign(style, { top: offset, right: offset })
    return (
      <div style={style}>
        <div style={{ ...line, top: 0, right: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, top: 0, right: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
  if (pos === 'bottom-left') {
    Object.assign(style, { bottom: offset, left: offset })
    return (
      <div style={style}>
        <div style={{ ...line, bottom: 0, left: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, bottom: 0, left: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
  if (pos === 'bottom-right') {
    Object.assign(style, { bottom: offset, right: offset })
    return (
      <div style={style}>
        <div style={{ ...line, bottom: 0, right: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, bottom: 0, right: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
}
