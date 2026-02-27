import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, Clock, MapPin, RotateCcw, Share2, CheckCircle2, Circle, Users, Download, Loader2 } from 'lucide-react'
import { useBrochureStore } from '../stores/brochureStore'
import { useCountdown } from '../hooks/useCountdown'
import { useProgrammeTracker } from '../hooks/useProgrammeTracker'
import { downloadPageAsPdf } from '../utils/downloadQrPdf'

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-muted border border-input rounded-xl flex items-center justify-center">
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider">{label}</span>
    </div>
  )
}

export default function ProgrammePage() {
  const store = useBrochureStore()
  const countdown = useCountdown(store.funeralDate, store.funeralTime)
  const tracker = useProgrammeTracker()
  const printRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!printRef.current || downloading) return
    setDownloading(true)
    try {
      const name = store.fullName || 'Programme'
      await downloadPageAsPdf(printRef.current, `${name}-Order-of-Service.pdf`, { bgColor: '#09090b' })
    } finally {
      setDownloading(false)
    }
  }

  const allItems = [
    ...(store.orderOfService?.churchService || []).map((item, i) => ({
      id: `church-${i}`,
      ...item,
      section: 'Church Service',
    })),
    ...(store.orderOfService?.privateBurial || []).map((item, i) => ({
      id: `burial-${i}`,
      ...item,
      section: 'Private Burial',
    })),
  ]

  const totalItems = allItems.length
  const checkedCount = allItems.filter((item) => tracker.isChecked(item.id)).length

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date not set'
    return new Date(dateStr + 'T00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`
  }

  const handleShare = () => {
    const text = `Funeral Programme\n${store.title} ${store.fullName}\n${formatDate(store.funeralDate)} at ${formatTime(store.funeralTime)}\nVenue: ${store.funeralVenue}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div ref={printRef} className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/editor" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Day-of Programme
              </h1>
              <p className="text-xs text-muted-foreground">{store.title} {store.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? 'Preparing...' : 'Download'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            {countdown.isPast ? 'Service Has Begun' : 'Time Until Service'}
          </p>
          {countdown.isPast ? (
            <p className="text-primary text-lg font-semibold">The service has started or passed</p>
          ) : (
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 md:gap-4">
              <CountdownUnit value={countdown.days} label="Days" />
              <span className="text-muted-foreground/60 text-xl mt-[-20px]">:</span>
              <CountdownUnit value={countdown.hours} label="Hours" />
              <span className="text-muted-foreground/60 text-xl mt-[-20px]">:</span>
              <CountdownUnit value={countdown.minutes} label="Mins" />
              <span className="text-muted-foreground/60 text-xl mt-[-20px]">:</span>
              <CountdownUnit value={countdown.seconds} label="Secs" />
            </div>
          )}
        </div>

        {/* Quick Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck size={16} className="text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Date & Time</span>
            </div>
            <p className="text-sm text-foreground">{formatDate(store.funeralDate)}</p>
            <p className="text-sm text-primary">{formatTime(store.funeralTime)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Venue</span>
            </div>
            <p className="text-sm text-foreground">{store.funeralVenue || 'Not set'}</p>
            <p className="text-xs text-muted-foreground mt-1">{store.burialLocation ? `Burial: ${store.burialLocation}` : ''}</p>
          </div>
        </div>

        {/* Officials Quick Reference */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Officials</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[...(store.officials?.ministers || []), ...(store.officials?.programmeOfficials || [])].map((official, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{official.role}:</span>
                <span className="text-foreground">{official.name || '\u2014'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Programme Checklist */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Service Programme</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">{checkedCount}/{totalItems} complete</span>
              <button
                onClick={tracker.resetAll}
                className="p-1.5 text-muted-foreground hover:text-card-foreground transition-colors"
                title="Reset all"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
            />
          </div>

          {['Church Service', 'Private Burial'].map((sectionName) => {
            const sectionItems = allItems.filter((item) => item.section === sectionName)
            if (sectionItems.length === 0) return null
            return (
              <div key={sectionName} className="mb-4 last:mb-0">
                <h3 className="text-xs text-primary/80 font-medium mb-2 uppercase tracking-wider">{sectionName}</h3>
                <div className="space-y-1">
                  {sectionItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => tracker.toggle(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        tracker.isChecked(item.id)
                          ? 'bg-emerald-900/20 border border-emerald-800/30'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      {tracker.isChecked(item.id) ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-muted-foreground/60 shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{item.time}</span>
                      <span className={`text-sm ${tracker.isChecked(item.id) ? 'text-muted-foreground line-through' : 'text-card-foreground'}`}>
                        {item.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
