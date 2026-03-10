import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { useThemeStore } from '../stores/themeStore'
import {
  Bell, Sun, Moon, Plus, Trash2, CalendarHeart, Clock, Image, BookOpen,
  BellRing, Download, ChevronDown, ChevronUp, X, ArrowRight,
} from 'lucide-react'

const STORAGE_KEY = 'funeralpress_anniversaries'

const RELATIONSHIPS = [
  'Parent', 'Spouse', 'Sibling', 'Child', 'Grandparent', 'Grandchild',
  'Uncle', 'Aunt', 'Cousin', 'Friend', 'Colleague', 'Other',
]

function loadAnniversaries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveAnniversaries(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function computeAnniversaryInfo(dateOfPassing) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const passing = new Date(dateOfPassing)
  passing.setHours(0, 0, 0, 0)

  const currentYear = today.getFullYear()
  const anniversaryThisYear = new Date(currentYear, passing.getMonth(), passing.getDate())
  anniversaryThisYear.setHours(0, 0, 0, 0)

  let nextAnniversary = anniversaryThisYear
  if (anniversaryThisYear < today) {
    nextAnniversary = new Date(currentYear + 1, passing.getMonth(), passing.getDate())
  }
  nextAnniversary.setHours(0, 0, 0, 0)

  const diffMs = nextAnniversary.getTime() - today.getTime()
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))

  // Check if today IS the anniversary
  const isToday = anniversaryThisYear.getTime() === today.getTime()

  // Days ago (if this year's anniversary already passed)
  let daysAgo = 0
  if (!isToday && anniversaryThisYear < today) {
    daysAgo = Math.round((today.getTime() - anniversaryThisYear.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Years since passing
  const yearsSince = nextAnniversary.getFullYear() - passing.getFullYear()
  const yearsSinceCurrent = currentYear - passing.getFullYear()

  return {
    nextAnniversary,
    daysUntil: isToday ? 0 : daysUntil,
    isToday,
    daysAgo,
    yearsSince,
    yearsSinceCurrent: yearsSinceCurrent < 1 ? 1 : yearsSinceCurrent,
    ordinalLabel: `${getOrdinalSuffix(isToday ? yearsSinceCurrent : yearsSince)} Anniversary`,
  }
}

function getCountdownText(info) {
  if (info.isToday) return 'Today!'
  if (info.daysAgo > 0 && info.daysAgo <= 30) return `${info.daysAgo} day${info.daysAgo === 1 ? '' : 's'} ago`
  if (info.daysUntil === 1) return 'Tomorrow!'
  return `in ${info.daysUntil} day${info.daysUntil === 1 ? '' : 's'}`
}

function getUrgencyClass(info) {
  if (info.isToday) return 'border-green-500 ring-2 ring-green-400/50 animate-pulse'
  if (info.daysUntil <= 7) return 'border-red-500'
  if (info.daysUntil <= 30) return 'border-[#C9A84C]'
  return 'border-border'
}

function generateICS(entry) {
  const passing = new Date(entry.dateOfPassing)
  const month = String(passing.getMonth() + 1).padStart(2, '0')
  const day = String(passing.getDate()).padStart(2, '0')
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `anniversary-${entry.id}@funeralpress.org`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FuneralPress//Anniversary Tracker//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${now.getFullYear() + 1}${month}${day}`,
    `SUMMARY:Memorial Anniversary - ${entry.deceasedName}`,
    `DESCRIPTION:Memorial anniversary of ${entry.deceasedName} (${entry.relationship}). Date of passing: ${entry.dateOfPassing}.`,
    'RRULE:FREQ=YEARLY',
    `TRANSP:TRANSPARENT`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Tomorrow is the memorial anniversary of ${entry.deceasedName}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.join('\r\n')
}

function downloadICS(entry) {
  const ics = generateICS(entry)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entry.deceasedName.replace(/\s+/g, '-')}-Anniversary.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export default function AnniversaryTrackerPage() {
  const { theme, toggleTheme } = useThemeStore()
  const [entries, setEntries] = useState(() => loadAnniversaries())
  const [formOpen, setFormOpen] = useState(false)
  const [notifStatus, setNotifStatus] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  // Form state
  const [deceasedName, setDeceasedName] = useState('')
  const [dateOfPassing, setDateOfPassing] = useState('')
  const [relationship, setRelationship] = useState('Parent')

  useEffect(() => {
    saveAnniversaries(entries)
  }, [entries])

  // Check for today's anniversaries and fire notifications
  useEffect(() => {
    if (notifStatus !== 'granted') return
    entries.forEach(entry => {
      const info = computeAnniversaryInfo(entry.dateOfPassing)
      if (info.isToday) {
        new Notification('Memorial Anniversary', {
          body: `Today is the ${info.ordinalLabel} of ${entry.deceasedName}.`,
          icon: '/favicon.ico',
        })
      }
    })
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = useCallback((e) => {
    e.preventDefault()
    if (!deceasedName.trim() || !dateOfPassing) return
    const newEntry = {
      id: `ann-${Date.now()}`,
      deceasedName: deceasedName.trim(),
      dateOfPassing,
      relationship,
      createdAt: new Date().toISOString(),
    }
    setEntries(prev => [...prev, newEntry])
    setDeceasedName('')
    setDateOfPassing('')
    setRelationship('Parent')
    setFormOpen(false)
  }, [deceasedName, dateOfPassing, relationship])

  const handleDelete = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleEnableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission()
    setNotifStatus(result)
  }, [])

  // Sort by next upcoming anniversary
  const sortedEntries = useMemo(() => {
    return [...entries]
      .map(entry => ({ ...entry, anniversaryInfo: computeAnniversaryInfo(entry.dateOfPassing) }))
      .sort((a, b) => {
        // Today first, then by daysUntil ascending
        if (a.anniversaryInfo.isToday && !b.anniversaryInfo.isToday) return -1
        if (!a.anniversaryInfo.isToday && b.anniversaryInfo.isToday) return 1
        return a.anniversaryInfo.daysUntil - b.anniversaryInfo.daysUntil
      })
  }, [entries])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Memorial Anniversary Tracker — Never Forget Important Dates | FuneralPress"
        description="Track memorial anniversaries and never miss an important remembrance date. Set reminders, export to calendar, and create anniversary materials."
        path="/anniversaries"
      />

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <CalendarHeart size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Anniversary Tracker</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/reminders"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Reminders
          </Link>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Memorial Anniversary Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Never forget an important remembrance date. Track anniversaries and create memorial materials.
          </p>
        </div>

        {/* Notification banner */}
        {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
          <div className="mb-6 p-4 rounded-lg bg-card border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BellRing size={20} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Enable Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Get browser notifications on anniversary dates.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
              style={{ backgroundColor: '#C9A84C', color: '#fff' }}
            >
              Enable
            </button>
          </div>
        )}
        {notifStatus === 'granted' && (
          <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <BellRing size={16} className="text-green-500 shrink-0" />
            <p className="text-xs text-green-600 dark:text-green-400">
              Browser notifications enabled. You will be reminded on anniversary dates.
            </p>
          </div>
        )}
        {notifStatus === 'denied' && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <BellRing size={16} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-500">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}

        {/* Add button */}
        <div className="mb-6">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="w-full p-3 rounded-lg border-2 border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            {formOpen ? <ChevronUp size={18} /> : <Plus size={18} />}
            <span className="text-sm font-medium">{formOpen ? 'Close Form' : 'Add Memorial Anniversary'}</span>
          </button>
        </div>

        {/* Add form */}
        {formOpen && (
          <form onSubmit={handleAdd} className="mb-8 p-5 rounded-lg bg-card border border-border space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Deceased Name</label>
              <input
                type="text"
                value={deceasedName}
                onChange={e => setDeceasedName(e.target.value)}
                placeholder="Full name of the deceased"
                required
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Passing</label>
                <input
                  type="date"
                  value={dateOfPassing}
                  onChange={e => setDateOfPassing(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Relationship</label>
                <select
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {RELATIONSHIPS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#C9A84C' }}
              >
                Add Memorial
              </button>
            </div>
          </form>
        )}

        {/* Empty state */}
        {sortedEntries.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <CalendarHeart size={48} className="mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No anniversaries tracked yet.</p>
            <p className="text-muted-foreground text-xs">Add a memorial above to start tracking.</p>
          </div>
        )}

        {/* Anniversary cards */}
        <div className="space-y-4">
          {sortedEntries.map(entry => {
            const info = entry.anniversaryInfo
            const urgencyClass = getUrgencyClass(info)
            const countdownText = getCountdownText(info)

            return (
              <div
                key={entry.id}
                className={`rounded-lg bg-card border-2 p-5 transition-all ${urgencyClass}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className="text-lg font-bold text-foreground truncate"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {entry.deceasedName}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {entry.relationship}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                      Passed: {new Date(entry.dateOfPassing).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarHeart size={14} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">{info.ordinalLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className={info.isToday ? 'text-green-500' : info.daysUntil <= 7 ? 'text-red-500' : 'text-muted-foreground'} />
                        <span className={`text-sm font-semibold ${
                          info.isToday ? 'text-green-500' : info.daysUntil <= 7 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {countdownText}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Link
                        to="/poster-editor"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                      >
                        <Image size={12} />
                        Create Anniversary Poster
                      </Link>
                      <Link
                        to="/booklet-editor"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                      >
                        <BookOpen size={12} />
                        Create Memorial Booklet
                      </Link>
                      <button
                        onClick={() => downloadICS(entry)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                        title="Export to Calendar (.ics)"
                      >
                        <Download size={12} />
                        Export Calendar
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Link back to reminders */}
        {sortedEntries.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              to="/reminders"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              View Reminder Cards <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
