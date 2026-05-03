import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  FileText,
  Copy,
  Check,
  Loader2,
  Share2,
  TrendingUp,
  Award,
  Banknote,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Star,
  Crown,
  Gift,
  Receipt,
  Image,
  BookOpen,
  Layout,
  Presentation,
  Mail,
  MessageCircle,
  Wrench,
} from 'lucide-react'
import { Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePartnerStore } from '../stores/partnerStore'
import { useThemeStore } from '../stores/themeStore'
import UserMenu from '../components/auth/UserMenu'
import GoogleLoginButton from '../components/auth/GoogleLoginButton'
import WhatsAppTemplates from '../components/partner/WhatsAppTemplates'

// ─── Commission config ───────────────────────────────────────────────────────

const TIERS = [
  { name: 'Starter', icon: Star, min: 0, max: 5, rate: 30, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/30', fill: 'bg-zinc-400' },
  { name: 'Growing', icon: TrendingUp, min: 6, max: 20, rate: 33, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', fill: 'bg-blue-400' },
  { name: 'Pro', icon: Award, min: 21, max: 50, rate: 37, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', fill: 'bg-amber-400' },
  { name: 'Elite', icon: Crown, min: 51, max: Infinity, rate: 40, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', fill: 'bg-purple-400' },
]

const PRODUCTS = [
  { name: 'Funeral Brochure', price: 60, icon: FileText },
  { name: 'Obituary Poster', price: 40, icon: FileText },
  { name: 'Invitation Card', price: 35, icon: FileText },
  { name: 'Programme Booklet', price: 45, icon: FileText },
  { name: 'Full Memorial Suite', price: 150, icon: Gift },
]

const AVG_ORDER_VALUE = 65 // GHS weighted average

function getTier(referralCount) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (referralCount >= TIERS[i].min) return { ...TIERS[i], index: i }
  }
  return { ...TIERS[0], index: 0 }
}

function getNextTier(referralCount) {
  const current = getTier(referralCount)
  if (current.index >= TIERS.length - 1) return null
  return TIERS[current.index + 1]
}

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf
    if (value === 0) {
      raf = requestAnimationFrame(() => setDisplay(0))
      return () => cancelAnimationFrame(raf)
    }
    const start = Date.now()
    const from = 0
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(from + (value - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
}

// ─── Progress ring ───────────────────────────────────────────────────────────

function ProgressRing({ progress, size = 80, stroke = 6, color = 'text-primary' }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(progress, 1) * circumference)

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
        className="stroke-muted" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className={`stroke-current ${color} transition-all duration-1000 ease-out`} />
    </svg>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PartnerDashboardPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const { profile, referrals, isLoadingProfile, isLoadingReferrals, fetchProfile, fetchReferrals } = usePartnerStore()
  const [copied, setCopied] = useState(false)
  const [showAllReferrals, setShowAllReferrals] = useState(false)
  const [calcDesigns, setCalcDesigns] = useState(10)
  const [showTiers, setShowTiers] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    if (!user.isPartner) { navigate('/'); return }
    fetchProfile()
    fetchReferrals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const tier = useMemo(() => getTier(profile?.totalReferrals || 0), [profile?.totalReferrals])
  const nextTier = useMemo(() => getNextTier(profile?.totalReferrals || 0), [profile?.totalReferrals])

  const tierProgress = useMemo(() => {
    if (!nextTier) return 1
    const current = profile?.totalReferrals || 0
    const range = nextTier.min - tier.min
    const progress = (current - tier.min) / range
    return Math.min(Math.max(progress, 0), 1)
  }, [profile?.totalReferrals, tier, nextTier])

  const projectedEarnings = useMemo(() => {
    const designs = profile?.totalDesigns || 0
    return designs * AVG_ORDER_VALUE * (tier.rate / 100)
  }, [profile?.totalDesigns, tier.rate])

  const calcEarnings = useMemo(() => {
    return calcDesigns * AVG_ORDER_VALUE * (tier.rate / 100)
  }, [calcDesigns, tier.rate])

  const referralUrl = profile?.referralCode
    ? `https://funeralpress.org/?ref=${profile.referralCode}`
    : ''

  const handleCopy = async () => {
    if (!referralUrl) return
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleWhatsAppShare = () => {
    if (!referralUrl) return
    const text = `Create beautiful funeral brochures with FuneralPress. Use my partner link: ${referralUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const displayedReferrals = showAllReferrals ? referrals : referrals.slice(0, 5)

  if (!user?.isPartner) return null

  const TierIcon = tier.icon

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
        {user ? <UserMenu /> : <GoogleLoginButton />}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-lg"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>

          <div className="flex items-center gap-3">
            <Users size={22} className="text-primary" />
            <h1
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Partner Dashboard
            </h1>
          </div>

          {isLoadingProfile ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          ) : profile && (
            <p className="text-sm text-muted-foreground mt-2">
              {profile.name}
            </p>
          )}
        </div>

        {/* Referral Code Box */}
        {profile?.referralCode && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground font-mono truncate">
                {referralUrl}
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 p-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                title="Copy link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="shrink-0 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                title="Share via WhatsApp"
              >
                <Share2 size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Code: <span className="font-mono font-semibold text-foreground">{profile.referralCode}</span>
            </p>
          </div>
        )}

        {/* ═══ Tier & Earnings Hero ═══ */}
        {profile && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Tier ring */}
              <div className="relative shrink-0">
                <ProgressRing progress={tierProgress} size={96} stroke={7} color={tier.color} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <TierIcon size={20} className={tier.color} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${tier.color}`}>{tier.name}</span>
                </div>
              </div>

              {/* Earnings summary */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Projected Earnings</p>
                <p className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  <AnimatedNumber value={projectedEarnings} prefix="GHS " decimals={2} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier.rate}% commission on {profile.totalDesigns} design{profile.totalDesigns !== 1 ? 's' : ''}
                </p>
                {nextTier && (
                  <p className="text-xs text-primary mt-2">
                    {nextTier.min - (profile.totalReferrals || 0)} more referral{nextTier.min - (profile.totalReferrals || 0) !== 1 ? 's' : ''} to reach <span className="font-semibold">{nextTier.name}</span> ({nextTier.rate}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Stats Grid ═══ */}
        {profile && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <Users size={14} className="text-primary mb-1.5" />
              <p className="text-2xl font-bold text-foreground">
                <AnimatedNumber value={profile.totalReferrals} />
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Referrals</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <FileText size={14} className="text-primary mb-1.5" />
              <p className="text-2xl font-bold text-foreground">
                <AnimatedNumber value={profile.totalDesigns} />
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Designs</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <Zap size={14} className="text-primary mb-1.5" />
              <p className="text-2xl font-bold text-foreground">{tier.rate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Commission</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <Banknote size={14} className="text-primary mb-1.5" />
              <p className="text-2xl font-bold text-foreground">
                <AnimatedNumber value={profile.totalReferrals > 0 ? projectedEarnings / profile.totalReferrals : 0} prefix="" decimals={0} />
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">GHS / Referral</p>
            </div>
          </div>
        )}

        {/* ═══ Quick Tools ═══ */}
        {profile && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Quick Tools</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(profile.partner_type === 'funeral_home' ? [
                { label: 'Receipt Generator', to: '/receipt', icon: Receipt },
                { label: 'Poster Editor', to: '/poster', icon: Image },
                { label: 'Banner Editor', to: '/banner', icon: Layout },
                { label: 'Booklet Editor', to: '/booklet', icon: BookOpen },
              ] : [
                { label: 'Programme Booklet', to: '/booklet', icon: BookOpen },
                { label: 'Brochure Editor', to: '/editor', icon: FileText },
                { label: 'Invitation Editor', to: '/invitation', icon: Mail },
                { label: 'Slideshow Maker', to: '/slideshow', icon: Presentation },
              ]).map((tool) => {
                const ToolIcon = tool.icon
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className="flex flex-col items-center gap-2 p-4 bg-muted/30 border border-border rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all text-center group"
                  >
                    <ToolIcon size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{tool.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ Commission Tiers ═══ */}
        <div className="bg-card border border-border rounded-xl mb-6 overflow-hidden">
          <button
            onClick={() => setShowTiers(!showTiers)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Award size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Commission Tiers</span>
            </div>
            {showTiers ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          {showTiers && (
            <div className="px-5 pb-5 space-y-3">
              {TIERS.map((t, i) => {
                const Icon = t.icon
                const isActive = tier.index === i
                return (
                  <div
                    key={t.name}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                      isActive ? `${t.bg} ${t.border}` : 'border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${t.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={t.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {t.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} referrals
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${isActive ? t.color : 'text-muted-foreground'}`}>{t.rate}%</p>
                      <p className="text-[10px] text-muted-foreground">commission</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ═══ Earnings Calculator ═══ */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Earnings Calculator</h2>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            See how much you could earn based on paid designs from your referrals.
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Paid designs per month</label>
              <span className="text-sm font-bold text-foreground">{calcDesigns}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={calcDesigns}
              onChange={(e) => setCalcDesigns(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
              <span>1</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                <p className="text-lg font-bold text-foreground">
                  GHS <AnimatedNumber value={calcEarnings} decimals={0} duration={300} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quarterly</p>
                <p className="text-lg font-bold text-foreground">
                  GHS <AnimatedNumber value={calcEarnings * 3} decimals={0} duration={300} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Yearly</p>
                <p className="text-lg font-bold text-primary">
                  GHS <AnimatedNumber value={calcEarnings * 12} decimals={0} duration={300} />
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Based on avg. order GHS {AVG_ORDER_VALUE} x {tier.rate}% ({tier.name} tier)
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Product Commission Rates ═══ */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Banknote size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Your Earnings Per Product</h2>
          </div>

          <div className="space-y-2">
            {PRODUCTS.map((p) => {
              const commission = p.price * (tier.rate / 100)
              return (
                <div key={p.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">Price: GHS {p.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">GHS {commission.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">per sale</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ WhatsApp Broadcast Templates ═══ */}
        {profile && (
          <WhatsAppTemplates
            partnerType={profile.partner_type}
            referralUrl={referralUrl}
          />
        )}

        {/* ═══ Referrals List ═══ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Referred Users
            </h2>
            {referrals.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {referrals.length}
              </span>
            )}
          </div>

          {isLoadingReferrals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-card border border-dashed border-border rounded-xl">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users size={24} className="text-muted-foreground/50" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">No referrals yet</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Share your referral link with families. When they sign up and create designs, you earn commission.
              </p>
              <button
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <Share2 size={16} />
                Share on WhatsApp
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {displayedReferrals.map((r) => {
                  const estEarnings = (r.designCount || 0) * AVG_ORDER_VALUE * (tier.rate / 100)
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.picture ? (
                          <img src={r.picture} alt="" className="w-9 h-9 rounded-full shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {r.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            Joined {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {r.designCount} design{r.designCount !== 1 ? 's' : ''}
                        </span>
                        {r.designCount > 0 && (
                          <span className="text-xs font-semibold text-primary">
                            ~GHS {estEarnings.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {referrals.length > 5 && (
                <button
                  onClick={() => setShowAllReferrals(!showAllReferrals)}
                  className="w-full mt-3 py-2.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  {showAllReferrals ? (
                    <>Show Less <ChevronUp size={14} /></>
                  ) : (
                    <>View All {referrals.length} Referrals <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* ═══ Partner Support Channel ═══ */}
        <div className="mt-8 bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Partner Support</h2>
            {profile?.partner_type && (
              <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ml-auto">
                Priority Support
              </span>
            )}
          </div>

          <div className="space-y-3">
            <a
              href="https://chat.whatsapp.com/EbJjUflYBNUKDvkgqLiey8"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MessageCircle size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">WhatsApp Partner Group</p>
                <p className="text-[10px] text-muted-foreground">Join our partner community for updates and support</p>
              </div>
            </a>

          </div>
        </div>

        {/* ═══ How It Works ═══ */}
        <div className="mt-8 bg-muted/30 border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">How Partner Earnings Work</h3>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Share your unique referral link with families who need funeral stationery' },
              { step: '2', text: 'When they sign up through your link, they become your referred user' },
              { step: '3', text: 'Every time they purchase a paid design, you earn a commission' },
              { step: '4', text: 'Refer more users to unlock higher commission tiers (up to 40%)' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{item.step}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-4 border-t border-border pt-3">
            Commissions are calculated on net sale price. Payouts are processed monthly via MTN Mobile Money or bank transfer. Minimum payout: GHS 50.
          </p>
        </div>
      </div>
    </div>
  )
}
