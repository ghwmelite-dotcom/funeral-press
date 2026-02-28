import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Receipt, ChevronDown, ChevronRight, Globe, Radio, ExternalLink, Download, Loader2, Upload, X, Flower2, Plus, Trash2 } from 'lucide-react'
import { useBrochureStore } from '../../stores/brochureStore'

/* Minimal inline QR card preview (matches QRCodePrintPage design) */
const GOLD = '#C9A84C'
const BLACK = '#1A1A1A'
const CREAM = '#FDF8F0'

function MiniQRPreview({ type, qrDataUrl, displayName }) {
  const isMemorial = type === 'memorial'
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '210/297',
        background: CREAM,
        border: `1px solid ${GOLD}`,
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        fontFamily: "'Playfair Display', Georgia, serif",
      }}
    >
      <p style={{ fontSize: '7px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '4px', fontFamily: 'system-ui, sans-serif' }}>
        {isMemorial ? 'In Loving Memory Of' : 'Funeral Service For'}
      </p>
      <p style={{ fontSize: '9px', color: BLACK, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, marginBottom: '6px' }}>
        {displayName || 'Name'}
      </p>
      <div style={{ background: BLACK, color: GOLD, padding: '2px 8px', fontSize: '6px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginBottom: '6px' }}>
        {isMemorial ? 'Online Memorial' : 'Order of Service'}
      </div>
      {qrDataUrl && (
        <img src={qrDataUrl} alt="QR" style={{ width: '48px', height: '48px', imageRendering: 'pixelated', border: `1px solid ${GOLD}`, padding: '2px', background: '#fff' }} />
      )}
    </div>
  )
}

/* Full-size card for PDF capture (matches QRCodePrintPage QRCard exactly) */
function FullQRCard({ type, qrDataUrl, displayName, lifeSpan, funeralVenue, url }) {
  const isMemorial = type === 'memorial'
  const title = isMemorial ? 'Online Memorial' : 'Order of Service'
  const subtitle = isMemorial ? 'Scan to visit the memorial page' : 'Scan to follow along with the service'
  const description = isMemorial
    ? 'View the full biography, photo gallery, tributes, and leave a message of condolence for the family.'
    : "Access the complete order of service, hymns, scripture readings, and programme for today's ceremony."

  return (
    <div style={{
      width: '100%', height: '100%', background: CREAM, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
    }}>
      <div style={{ position: 'absolute', inset: '16px', border: `2px solid ${GOLD}`, pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ width: 'calc(100% - 64px)', marginTop: '40px', height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      <div style={{ fontSize: '28px', color: GOLD, marginTop: '16px', lineHeight: 1 }}>&#10013;</div>
      <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.35em', marginTop: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
        {isMemorial ? 'In Loving Memory Of' : 'Funeral Service For'}
      </p>
      <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', color: BLACK, textAlign: 'center', marginTop: '8px', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.2, padding: '0 48px' }}>
        {displayName || 'Name'}
      </h1>
      {lifeSpan && <p style={{ fontSize: '12px', color: '#777', marginTop: '6px', letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif' }}>{lifeSpan}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <div style={{ width: '60px', height: '1px', background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '14px' }}>&#10022;</span>
        <div style={{ width: '60px', height: '1px', background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>
      <div style={{ marginTop: '18px', background: BLACK, color: GOLD, padding: '8px 36px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
        {title}
      </div>
      <div style={{ marginTop: '24px', padding: '14px', background: '#fff', border: `2px solid ${GOLD}`, position: 'relative' }}>
        {qrDataUrl && <img src={qrDataUrl} alt={`QR Code for ${title}`} style={{ width: '200px', height: '200px', display: 'block', imageRendering: 'pixelated' }} />}
      </div>
      <p style={{ marginTop: '16px', fontSize: '14px', color: BLACK, fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>{subtitle}</p>
      <p style={{ marginTop: '8px', fontSize: '11px', color: '#777', textAlign: 'center', lineHeight: 1.6, maxWidth: '360px', padding: '0 32px', fontFamily: 'system-ui, sans-serif' }}>{description}</p>
      {funeralVenue && <p style={{ marginTop: '16px', fontSize: '11px', color: '#666', fontFamily: 'system-ui, sans-serif' }}>{funeralVenue}</p>}
      <div style={{ marginTop: 'auto', paddingBottom: '48px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: '#999', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{url}</p>
        <p style={{ fontSize: '9px', color: '#bbb', marginTop: '6px', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase' }}>funeralpress.org</p>
      </div>
    </div>
  )
}

/* Mini wreath card preview for the editor */
function MiniWreathPreview({ message, from }) {
  return (
    <div style={{
      width: '100%', aspectRatio: '5/3', background: CREAM, position: 'relative',
      overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Playfair Display', Georgia, serif",
      padding: '8px 6px', border: `1px solid ${GOLD}`, borderRadius: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
        <div style={{ width: '16px', height: '0.5px', background: GOLD }} />
        <span style={{ color: GOLD, fontSize: '7px' }}>&#10013;</span>
        <div style={{ width: '16px', height: '0.5px', background: GOLD }} />
      </div>
      <p style={{ fontSize: '9px', color: BLACK, fontWeight: 600, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.2, margin: '2px 0' }}>
        {message || 'Message'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: '2px 0' }}>
        <div style={{ width: '12px', height: '0.5px', background: GOLD }} />
        <span style={{ color: GOLD, fontSize: '5px' }}>&#10022;</span>
        <div style={{ width: '12px', height: '0.5px', background: GOLD }} />
      </div>
      <p style={{ fontSize: '6px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'system-ui, sans-serif' }}>
        — {from || 'From'} —
      </p>
    </div>
  )
}

function WreathCardsSection({ open, onToggle }) {
  const store = useBrochureStore()
  const wreathCards = store.wreathCards || []

  const updateCard = (index, field, value) => {
    const updated = [...wreathCards]
    updated[index] = { ...updated[index], [field]: value }
    store.updateField('wreathCards', updated)
  }

  const addCard = () => {
    store.updateField('wreathCards', [...wreathCards, { message: '', from: '' }])
  }

  const removeCard = (index) => {
    store.updateField('wreathCards', wreathCards.filter((_, i) => i !== index))
  }

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-card/50 transition-colors"
      >
        <Flower2 size={14} className="text-primary shrink-0" />
        <span className="text-xs font-medium text-card-foreground flex-1">Wreath Cards</span>
        <span className="text-[10px] text-muted-foreground mr-1">{wreathCards.length}</span>
        {open ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-border/30 space-y-3 pt-3">
          <p className="text-[10px] text-muted-foreground">
            Create message cards for funeral wreaths. Each card prints on its own A4 page.
          </p>

          {wreathCards.map((card, i) => (
            <div key={i} className="border border-border/40 rounded-lg p-2 space-y-2">
              <div className="flex items-start gap-2">
                {/* Mini preview */}
                <div className="w-20 shrink-0">
                  <MiniWreathPreview message={card.message} from={card.from} />
                </div>

                {/* Editable fields */}
                <div className="flex-1 space-y-1.5">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">Message</label>
                    <input
                      type="text"
                      value={card.message}
                      onChange={(e) => updateCard(i, 'message', e.target.value)}
                      placeholder="e.g. Rest In Peace"
                      className="w-full bg-card border border-input rounded-md px-2 py-1 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">From</label>
                    <input
                      type="text"
                      value={card.from}
                      onChange={(e) => updateCard(i, 'from', e.target.value)}
                      placeholder="e.g. The Family"
                      className="w-full bg-card border border-input rounded-md px-2 py-1 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Delete button */}
                {wreathCards.length > 1 && (
                  <button
                    onClick={() => removeCard(i)}
                    className="mt-1 p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove card"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add card */}
          <button
            onClick={addCard}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] border border-dashed border-input rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus size={10} /> Add Wreath Card
          </button>

          {/* Open full page */}
          <Link
            to="/wreath-cards"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
          >
            <ExternalLink size={12} /> Open Wreath Cards Page
          </Link>
        </div>
      )}
    </div>
  )
}

export default function PrintMaterialsForm({ onOpenPublish, onOpenLiveService }) {
  const store = useBrochureStore()
  const { fullName, title, dateOfBirth, dateOfDeath, funeralVenue, familySignature, coverPhoto,
    memorialId, liveServiceId, memorialQrCode, liveServiceQrCode } = store

  const [qrOpen, setQrOpen] = useState(true)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [wreathOpen, setWreathOpen] = useState(false)
  const [downloading, setDownloading] = useState(null)

  // Receipt state
  const [alias, setAlias] = useState('')
  const [receiptPhoto, setReceiptPhoto] = useState(null)
  const [obituaryImage, setObituaryImage] = useState(null)
  const [totalReceipts, setTotalReceipts] = useState(20)
  const [startNum, setStartNum] = useState(1)
  const photoInputRef = useRef(null)
  const obituaryInputRef = useRef(null)

  // Hidden full-size cards for PDF capture
  const memorialCardRef = useRef(null)
  const serviceCardRef = useRef(null)

  const displayName = `${title || ''} ${fullName || ''}`.trim()
  const safeName = (fullName || 'QR-Card').replace(/\s+/g, '-')

  const formatDate = (d) => {
    if (!d) return ''
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return d }
  }

  const lifeSpan = dateOfBirth && dateOfDeath ? `${formatDate(dateOfBirth)} — ${formatDate(dateOfDeath)}` : ''

  const memorialUrl = memorialId ? `https://funeralpress.org/memorial/${memorialId}` : null
  const liveServiceUrl = liveServiceId ? `https://funeralpress.org/live-service/${liveServiceId}` : null

  const hasAnyPublished = memorialUrl || liveServiceUrl

  const handleDownload = useCallback(async (type) => {
    const ref = type === 'memorial' ? memorialCardRef : serviceCardRef
    if (!ref.current) return
    setDownloading(type)
    try {
      const { downloadCardAsPdf } = await import('../../utils/downloadQrPdf')
      const label = type === 'memorial' ? 'Memorial' : 'Order-of-Service'
      await downloadCardAsPdf(ref.current, `${safeName}-${label}-QR.pdf`)
    } finally {
      setDownloading(null)
    }
  }, [safeName])

  const handleFile = (e, setter) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setter(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  // Auto-fill receipt fields from store
  const deceasedName = fullName || ''
  const surname = fullName ? fullName.trim().split(/\s+/).pop().toUpperCase() : ''
  const receiptFamilyName = familySignature || ''

  // Build receipt page URL with query params
  const receiptParams = new URLSearchParams()
  if (deceasedName) receiptParams.set('name', deceasedName)
  if (surname) receiptParams.set('surname', surname)
  if (receiptFamilyName) receiptParams.set('family', receiptFamilyName)
  if (alias) receiptParams.set('alias', alias)
  if (totalReceipts !== 20) receiptParams.set('count', totalReceipts)
  if (startNum !== 1) receiptParams.set('start', startNum)
  const receiptUrl = `/receipt${receiptParams.toString() ? '?' + receiptParams.toString() : ''}`

  return (
    <div className="space-y-2">
      {/* ── QR Code Cards ── */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setQrOpen(!qrOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-card/50 transition-colors"
        >
          <QrCode size={14} className="text-primary shrink-0" />
          <span className="text-xs font-medium text-card-foreground flex-1">QR Code Cards</span>
          {qrOpen ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
        </button>

        {qrOpen && (
          <div className="px-3 pb-3 border-t border-border/30 space-y-3">
            {!hasAnyPublished ? (
              /* Not published yet */
              <div className="pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Publish a memorial or live service first to generate QR code cards for attendees.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onOpenPublish}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                  >
                    <Globe size={12} /> Publish Memorial
                  </button>
                  <button
                    onClick={onOpenLiveService}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                  >
                    <Radio size={12} /> Share Service
                  </button>
                </div>
              </div>
            ) : (
              /* Published — show previews */
              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {memorialUrl && memorialQrCode && (
                    <div className="space-y-2">
                      <MiniQRPreview type="memorial" qrDataUrl={memorialQrCode} displayName={displayName} />
                      <button
                        onClick={() => handleDownload('memorial')}
                        disabled={downloading === 'memorial'}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors disabled:opacity-50"
                      >
                        {downloading === 'memorial'
                          ? <><Loader2 size={10} className="animate-spin" /> Generating...</>
                          : <><Download size={10} /> Download PDF</>
                        }
                      </button>
                    </div>
                  )}
                  {liveServiceUrl && liveServiceQrCode && (
                    <div className="space-y-2">
                      <MiniQRPreview type="service" qrDataUrl={liveServiceQrCode} displayName={displayName} />
                      <button
                        onClick={() => handleDownload('service')}
                        disabled={downloading === 'service'}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors disabled:opacity-50"
                      >
                        {downloading === 'service'
                          ? <><Loader2 size={10} className="animate-spin" /> Generating...</>
                          : <><Download size={10} /> Download PDF</>
                        }
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/qr-cards"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md transition-colors"
                >
                  <ExternalLink size={12} /> Open Full Page for Printing
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Donation Receipt Booklet ── */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setReceiptOpen(!receiptOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-card/50 transition-colors"
        >
          <Receipt size={14} className="text-primary shrink-0" />
          <span className="text-xs font-medium text-card-foreground flex-1">Donation Receipt Booklet</span>
          {receiptOpen ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
        </button>

        {receiptOpen && (
          <div className="px-3 pb-3 border-t border-border/30 space-y-3 pt-3">
            {/* Auto-filled fields (read-only display) */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Deceased Name (from Basic Info)</label>
                <div className="bg-muted/50 border border-input rounded-md px-2 py-1.5 text-xs text-card-foreground">
                  {deceasedName || <span className="text-muted-foreground italic">Fill in Basic Information first</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Surname</label>
                  <div className="bg-muted/50 border border-input rounded-md px-2 py-1.5 text-xs text-card-foreground font-semibold">
                    {surname || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Family Name</label>
                  <div className="bg-muted/50 border border-input rounded-md px-2 py-1.5 text-xs text-card-foreground">
                    {receiptFamilyName || <span className="text-muted-foreground italic">From Acknowledgements</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">a.k.a. / Alias (optional)</label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="e.g. Elitor"
                className="w-full bg-card border border-input rounded-md px-2 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Photo uploads */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Photo of Deceased</label>
                <input ref={photoInputRef} type="file" accept="image/*" onChange={(e) => handleFile(e, setReceiptPhoto)} className="hidden" />
                {receiptPhoto ? (
                  <div className="flex items-center gap-2">
                    <img src={receiptPhoto} alt="Deceased" className="w-10 h-12 object-cover rounded border border-border" />
                    <button onClick={() => { setReceiptPhoto(null); if (photoInputRef.current) photoInputRef.current.value = '' }} className="text-muted-foreground hover:text-destructive">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => photoInputRef.current?.click()} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] border border-dashed border-input rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    <Upload size={10} /> Upload
                  </button>
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Obituary Image</label>
                <input ref={obituaryInputRef} type="file" accept="image/*" onChange={(e) => handleFile(e, setObituaryImage)} className="hidden" />
                {obituaryImage ? (
                  <div className="flex items-center gap-2">
                    <img src={obituaryImage} alt="Obituary" className="w-10 h-12 object-cover rounded border border-border" />
                    <button onClick={() => { setObituaryImage(null); if (obituaryInputRef.current) obituaryInputRef.current.value = '' }} className="text-muted-foreground hover:text-destructive">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => obituaryInputRef.current?.click()} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] border border-dashed border-input rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    <Upload size={10} /> Upload
                  </button>
                )}
              </div>
            </div>

            {/* Count & start */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Number of receipts</label>
                <input
                  type="number"
                  value={totalReceipts}
                  onChange={(e) => setTotalReceipts(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-card border border-input rounded-md px-2 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Start from #</label>
                <input
                  type="number"
                  value={startNum}
                  onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-card border border-input rounded-md px-2 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              {totalReceipts} receipts &mdash; #{String(startNum).padStart(4, '0')} to #{String(startNum + totalReceipts - 1).padStart(4, '0')}
            </p>

            <Link
              to={receiptUrl}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              <ExternalLink size={12} /> Open Receipt Booklet
            </Link>
          </div>
        )}
      </div>

      {/* ── Wreath Cards ── */}
      <WreathCardsSection open={wreathOpen} onToggle={() => setWreathOpen(!wreathOpen)} />

      {/* Hidden full-size QR cards for PDF capture */}
      {memorialUrl && memorialQrCode && (
        <div ref={memorialCardRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '794px', height: '1123px' }}>
          <FullQRCard type="memorial" qrDataUrl={memorialQrCode} displayName={displayName} lifeSpan={lifeSpan} funeralVenue={funeralVenue} url={memorialUrl} />
        </div>
      )}
      {liveServiceUrl && liveServiceQrCode && (
        <div ref={serviceCardRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '794px', height: '1123px' }}>
          <FullQRCard type="service" qrDataUrl={liveServiceQrCode} displayName={displayName} lifeSpan={lifeSpan} funeralVenue={funeralVenue} url={liveServiceUrl} />
        </div>
      )}
    </div>
  )
}
