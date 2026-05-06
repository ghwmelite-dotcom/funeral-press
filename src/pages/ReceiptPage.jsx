import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Printer, ArrowLeft, Upload, X, Download } from 'lucide-react'
import { Link } from 'react-router-dom'

function useLandscapePrint() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@page { size: landscape; margin: 0; }'
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
}

function pad(n, len = 4) {
  return String(n).padStart(len, '0')
}

const BROWN = '#5C2D0E'
const BROWN_MED = '#7A3E18'
const GOLD = '#C9A84C'
const W = 1280
const H = 594

export default function ReceiptPage() {
  useLandscapePrint()

  const [familyName, setFamilyName] = useState('')
  const [deceasedName, setDeceasedName] = useState('')
  const [surname, setSurname] = useState('')
  const [alias, setAlias] = useState('')
  const [photo, setPhoto] = useState(null)
  const [obituaryImage, setObituaryImage] = useState(null)
  const [totalReceipts, setTotalReceipts] = useState(20)
  const [startNum, setStartNum] = useState(1)
  const photoRef = useRef(null)
  const obituaryRef = useRef(null)

  const receiptNumbers = Array.from({ length: totalReceipts }, (_, i) => pad(startNum + i))

  const handleFile = (e, setter) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setter(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const sharedProps = { deceasedName, surname, familyName, alias, photo, obituaryImage }

  return (
    <div className="min-h-screen bg-background">
      <header className="print:hidden sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Button>
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">Donation Receipt Booklet</h1>
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print Booklet
          </Button>
        </div>
      </header>

      <div className="print:hidden max-w-lg mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the deceased's details, upload their photo and obituary image, then print.
        </p>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <Field label="Full Name of Deceased" value={deceasedName} onChange={setDeceasedName} placeholder="e.g. Ametsitsie Godson Kofi" />
          <Field label="Surname (appears bold & large)" value={surname} onChange={setSurname} placeholder="e.g. BRIM-AGBEFU" />
          <Field label="a.k.a. / Alias (optional)" value={alias} onChange={setAlias} placeholder="e.g. Elitor" />
          <Field label="Family Name" value={familyName} onChange={setFamilyName} placeholder="e.g. The Entire Family" />
          <div className="grid grid-cols-2 gap-3">
            <ImgUpload label="Photo of Deceased" hint="Shown on receipts" value={photo} inputRef={photoRef}
              onUpload={(e) => handleFile(e, setPhoto)} onRemove={() => { setPhoto(null); photoRef.current.value = '' }} />
            <ImgUpload label="Obituary Image" hint="Shown on cover" value={obituaryImage} inputRef={obituaryRef}
              onUpload={(e) => handleFile(e, setObituaryImage)} onRemove={() => { setObituaryImage(null); obituaryRef.current.value = '' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number of receipts" type="number" value={totalReceipts} onChange={(v) => setTotalReceipts(Math.max(1, parseInt(v) || 1))} />
            <Field label="Start from #" type="number" value={startNum} onChange={(v) => setStartNum(Math.max(1, parseInt(v) || 1))} />
          </div>
          <p className="text-xs text-muted-foreground">
            Prints <span className="font-semibold text-foreground">1 cover + {totalReceipts} receipts</span> ({totalReceipts + 1} pages) &mdash; #{pad(startNum)} to #{pad(startNum + totalReceipts - 1)}
          </p>
        </div>
      </div>

      {/* PRINT */}
      <div className="receipt-print-area hidden print:block">
        <div className="receipt-page"><Cover {...sharedProps} total={totalReceipts} start={startNum} /></div>
        {receiptNumbers.map((n) => (
          <div key={n} className="receipt-page"><Receipt no={n} {...sharedProps} /></div>
        ))}
      </div>

      {/* PREVIEW */}
      <div className="print:hidden max-w-7xl mx-auto px-4 pb-12 space-y-8">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preview</p>
        <Preview><Cover {...sharedProps} total={totalReceipts} start={startNum} /></Preview>
        <Preview><Receipt no={receiptNumbers[0]} {...sharedProps} /></Preview>
        {totalReceipts > 1 && (
          <p className="text-xs text-muted-foreground text-center">+ {totalReceipts - 1} more receipt{totalReceipts > 2 ? 's' : ''} when printed</p>
        )}
      </div>
    </div>
  )
}

/* Small helpers */
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  )
}
function ImgUpload({ label, hint, value, inputRef, onUpload, onRemove }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-0.5 block">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
      {value ? (
        <div className="flex items-center gap-2">
          <img src={value} alt={label} className="w-12 h-14 object-cover rounded border border-border" />
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="w-full text-xs">
          <Upload className="w-3 h-3 mr-1" /> Upload
        </Button>
      )}
    </div>
  )
}
function Preview({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl shadow-xl" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ width: `${W}px`, minWidth: `${W}px` }}>{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════════
   COVER PAGE
   ═══════════════════════════════════════ */
function Cover({ deceasedName, surname, familyName, alias, photo, obituaryImage, total, start }) {
  const img = obituaryImage || photo
  return (
    <div style={{
      width: `${W}px`, height: `${H}px`, background: '#fff', position: 'relative',
      overflow: 'hidden', display: 'flex', fontFamily: "'Playfair Display', Georgia, serif",
    }}>
      {/* Full brown border frame */}
      <div style={{ position: 'absolute', inset: 0, border: `6px solid ${BROWN}`, pointerEvents: 'none', zIndex: 2 }} />

      {/* Top banner */}
      <div style={{ position: 'absolute', top: 6, left: 6, right: 6, height: '52px', background: BROWN, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: GOLD, fontSize: '28px', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600 }}>
          Acknowledgement
        </span>
      </div>

      {/* Left section with obituary image */}
      {img && (
        <div style={{ width: '360px', flexShrink: 0, paddingTop: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '20px' }}>
          <img src={img} alt="" style={{ width: '300px', height: '400px', objectFit: 'cover', border: `5px solid ${BROWN}`, boxShadow: '4px 4px 20px rgba(0,0,0,0.15)' }} />
        </div>
      )}

      {/* Right / center content */}
      <div style={{ flex: 1, paddingTop: '70px', paddingBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingLeft: img ? '0' : '40px', paddingRight: '40px' }}>
        <p style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '8px', fontFamily: 'system-ui, sans-serif' }}>In Loving Memory Of</p>

        <p style={{ fontSize: '26px', color: BROWN, marginBottom: '2px' }}>
          {deceasedName || 'Full Name'}
        </p>
        {surname && (
          <p style={{ fontSize: '52px', fontWeight: 'bold', color: BROWN, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.04em' }}>
            {surname}
          </p>
        )}
        {alias && <p style={{ fontSize: '15px', fontStyle: 'italic', color: '#666', marginTop: '4px', fontFamily: 'system-ui, sans-serif' }}>(a.k.a. {alias})</p>}

        {/* Ornamental divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
          <div style={{ width: '50px', height: '1px', background: `linear-gradient(to right, transparent, ${BROWN})` }} />
          <span style={{ color: GOLD, fontSize: '16px' }}>&#10022;</span>
          <div style={{ width: '50px', height: '1px', background: `linear-gradient(to left, transparent, ${BROWN})` }} />
        </div>

        {familyName && <p style={{ fontSize: '14px', color: '#555', marginBottom: '14px', fontFamily: 'system-ui, sans-serif' }}>{familyName}</p>}

        <div style={{ background: BROWN, color: GOLD, padding: '10px 32px', marginBottom: '16px', letterSpacing: '0.25em', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
          Funeral Donation Receipts
        </div>

        <div style={{ border: `3px solid ${BROWN}`, padding: '12px 32px', display: 'inline-block' }}>
          <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'system-ui, sans-serif' }}>This booklet contains</p>
          <p style={{ fontSize: '34px', fontWeight: 'bold', color: BROWN, lineHeight: 1.1 }}>{total} Receipts</p>
          <p style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>#{pad(start)} &mdash; #{pad(start + total - 1)}</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, height: '6px', background: BROWN, zIndex: 1 }} />
    </div>
  )
}

/* ═══════════════════════════════════════
   RECEIPT — matches Ghanaian funeral style
   ═══════════════════════════════════════ */
function Receipt({ no, deceasedName, surname, familyName, alias, photo }) {

  return (
    <div style={{
      width: `${W}px`, height: `${H}px`, background: '#fff', position: 'relative',
      overflow: 'hidden', display: 'flex', color: '#222',
    }}>
      {/* Brown left bar */}
      <div style={{ width: '6px', background: BROWN, flexShrink: 0 }} />

      {/* Content column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Brown header */}
        <div style={{
          background: BROWN, padding: '0 32px', height: '48px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif", color: '#fff',
            fontSize: '22px', fontStyle: 'italic', letterSpacing: '0.18em',
          }}>
            A c k n o w l e d g e m e n t
          </span>
        </div>

        {/* Receipt number right-aligned */}
        <div style={{ textAlign: 'right', padding: '6px 32px 0', fontFamily: 'system-ui, sans-serif' }}>
          <span style={{ fontSize: '11px', color: '#aaa' }}>No. </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: BROWN, fontFamily: 'monospace' }}>#{no}</span>
        </div>

        {/* Main body */}
        <div style={{ flex: 1, padding: '4px 32px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Acknowledgement text */}
          <div style={{ textAlign: 'center', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
            <p style={{ fontSize: '14px' }}>
              {familyName || 'The Entire Family'} Of The Late
            </p>
            <p style={{ fontSize: '14px' }}>
              {deceasedName || 'Full Name'}{' '}
              <span style={{ fontWeight: 700 }}>{surname || ''}</span>
            </p>
            <p style={{ fontSize: '14px' }}>Wishes To Acknowledge With Thanks</p>
            <p style={{ fontSize: '14px' }}>The Receipt Of Your Kind Donation During The</p>
            <p style={{ fontSize: '14px' }}>Funeral, Burial, Memorial And Thanksgiving</p>
            <p style={{ fontSize: '14px' }}>Service Of Their Beloved</p>
          </div>

          {/* Large deceased name */}
          <div style={{ textAlign: 'center', margin: '6px 0 4px', fontFamily: "'Playfair Display', Georgia, serif" }}>
            <p style={{ fontSize: '28px', color: BROWN, lineHeight: 1.1 }}>
              {deceasedName || 'Full Name'}
            </p>
            {surname && (
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: BROWN, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.03em' }}>
                {surname}
              </p>
            )}
            {alias && (
              <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666', marginTop: '2px', fontFamily: 'system-ui, sans-serif' }}>
                (a.k.a. {alias})
              </p>
            )}
          </div>

          {/* Fields */}
          <div style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Name */}
            <div style={{ fontSize: '15px', marginBottom: '6px', display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 500 }}>Name:</span>
              <span style={{ flex: 1, borderBottom: '1.5px dotted #999', marginLeft: '8px', minHeight: '18px' }} />
            </div>
            {/* Phone */}
            <div style={{ fontSize: '15px', marginBottom: '10px', display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 500 }}>Phone No:</span>
              <span style={{ flex: 1, borderBottom: '1.5px dotted #999', marginLeft: '8px', minHeight: '18px' }} />
            </div>
            {/* AMOUNT GHS */}
            <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: '10px' }}>
              <div style={{
                background: BROWN, color: '#fff', padding: '0 20px',
                fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
              }}>
                AMOUNT GHS
              </div>
              <div style={{ border: `2.5px solid ${BROWN}`, width: '260px', height: '40px' }} />
            </div>
            {/* Date & Sign */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', flex: 1 }}>
                <span style={{ fontWeight: 500 }}>Date:</span>
                <span style={{ flex: 1, borderBottom: '1.5px dotted #999', marginLeft: '8px', minHeight: '18px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', flex: 1 }}>
                <span style={{ fontWeight: 500 }}>Sign:</span>
                <span style={{ flex: 1, borderBottom: '1.5px dotted #999', marginLeft: '8px', minHeight: '18px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo on right */}
      {photo && (
        <div style={{
          width: '240px', flexShrink: 0, position: 'relative',
          background: `linear-gradient(to bottom, ${BROWN} 48px, #fff 48px)`,
        }}>
          {/* Vertical brown accent left of photo */}
          <div style={{ position: 'absolute', top: '48px', left: 0, bottom: 0, width: '4px', background: BROWN }} />
          <img
            src={photo}
            alt="Deceased"
            style={{
              position: 'absolute', bottom: 0, left: '4px', right: 0,
              width: '236px', height: `${H - 48}px`,
              objectFit: 'cover', objectPosition: 'top center',
            }}
          />
        </div>
      )}
    </div>
  )
}
