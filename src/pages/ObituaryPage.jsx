import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { Scroll, Calendar, Clock, MapPin, Users, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

export default function ObituaryPage() {
  const { slug } = useParams()
  const [obituary, setObituary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    fetchObituary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Countdown timer
  useEffect(() => {
    if (!obituary?.funeralDate) return

    function calcCountdown() {
      const funeralDateTime = obituary.funeralTime
        ? new Date(`${obituary.funeralDate}T${obituary.funeralTime}`)
        : new Date(`${obituary.funeralDate}T09:00:00`)

      const now = new Date()
      const diff = funeralDateTime - now

      if (diff <= 0) {
        setCountdown(null)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds })
    }

    calcCountdown()
    const interval = setInterval(calcCountdown, 1000)
    return () => clearInterval(interval)
  }, [obituary])

  async function fetchObituary() {
    try {
      const res = await fetch(`${API_BASE}/obituary/${slug}`)
      if (!res.ok) throw new Error('Obituary not found')
      const data = await res.json()
      setObituary(data.obituary)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  function formatTime(timeStr) {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  function formatLifespan(birth, death) {
    if (!birth && !death) return ''
    const b = birth ? new Date(birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '?'
    const d = death ? new Date(death + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '?'
    return `${b} - ${d}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C9A84C]" />
      </div>
    )
  }

  if (error || !obituary) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-center px-4">
        <div>
          <Scroll size={48} className="text-[#C9A84C]/40 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Obituary Not Found</h1>
          <p className="text-[#999] text-sm">This obituary may have been removed or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  const lifespan = formatLifespan(obituary.birthDate, obituary.deathDate)

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <PageMeta
        title={`In Loving Memory of ${obituary.deceasedName} | FuneralPress`}
        description={obituary.biography ? obituary.biography.slice(0, 160) : `Obituary announcement for ${obituary.deceasedName}. View funeral details and pay your respects.`}
        path={`/obituary/${slug}`}
        image={obituary.deceasedPhoto}
      />

      {/* Hero Section */}
      <div className="relative pt-16 pb-12 px-4 text-center">
        {/* Decorative top */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-20 h-px bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
          <span className="text-[#C9A84C] text-xl">&#10013;</span>
          <div className="w-20 h-px bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
        </div>

        <p className="text-[#C9A84C] text-xs uppercase tracking-[0.3em] mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          In Loving Memory
        </p>

        {obituary.deceasedPhoto && (
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full mx-auto mb-6 border-3 border-[#C9A84C]/40 overflow-hidden shadow-2xl shadow-[#C9A84C]/10" style={{ borderWidth: '3px' }}>
            <img
              src={obituary.deceasedPhoto}
              alt={obituary.deceasedName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-3xl sm:text-5xl font-bold text-[#C9A84C] mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {obituary.deceasedName}
        </h1>

        {lifespan && (
          <p className="text-[#999] text-sm sm:text-base tracking-wide">{lifespan}</p>
        )}

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-12 h-px bg-[#C9A84C]/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/50" />
          <div className="w-12 h-px bg-[#C9A84C]/30" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Biography */}
        {obituary.biography && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C] mb-4 text-center">
              Life & Legacy
            </h2>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 sm:p-8">
              <p className="text-[#ccc] text-sm sm:text-base leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {obituary.biography}
              </p>
            </div>
          </section>
        )}

        {/* Funeral Details */}
        {(obituary.funeralDate || obituary.funeralVenue) && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C] mb-4 text-center">
              Funeral Service
            </h2>
            <div className="bg-[#1a1a1a] border border-[#C9A84C]/20 rounded-xl p-6 sm:p-8">
              <div className="space-y-5">
                {obituary.funeralDate && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                      <Calendar size={18} className="text-[#C9A84C]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Date</p>
                      <p className="text-white font-medium">{formatDate(obituary.funeralDate)}</p>
                    </div>
                  </div>
                )}

                {obituary.funeralTime && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                      <Clock size={18} className="text-[#C9A84C]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Time</p>
                      <p className="text-white font-medium">{formatTime(obituary.funeralTime)}</p>
                    </div>
                  </div>
                )}

                {obituary.funeralVenue && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                      <MapPin size={18} className="text-[#C9A84C]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Venue</p>
                      <p className="text-white font-medium">{obituary.funeralVenue}</p>
                      {obituary.venueAddress && (
                        <p className="text-[#999] text-sm mt-0.5">{obituary.venueAddress}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Countdown Timer */}
        {countdown && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C] mb-4 text-center">
              Service Begins In
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: countdown.days, label: 'Days' },
                { value: countdown.hours, label: 'Hours' },
                { value: countdown.minutes, label: 'Minutes' },
                { value: countdown.seconds, label: 'Seconds' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-4 text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] sm:text-xs text-[#888] uppercase tracking-wider mt-1">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Family Members */}
        {obituary.familyMembers && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C] mb-4 text-center">
              Family
            </h2>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-[#C9A84C]" />
                </div>
                <p className="text-[#ccc] text-sm leading-relaxed whitespace-pre-line flex-1">
                  {obituary.familyMembers}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-px bg-[#C9A84C]/20" />
          <span className="text-[#C9A84C]/40 text-xs">&#10013;</span>
          <div className="w-8 h-px bg-[#C9A84C]/20" />
        </div>
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
