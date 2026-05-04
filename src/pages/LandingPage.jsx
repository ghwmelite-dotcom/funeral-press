import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import {
  Plus,
  BookOpen,
  Trash2,
  FileText,
  ArrowRight,
  Eye,
  Palette,
  Printer,
  Image,
  Save,
  Undo2,
  Download,
  Heart,
  Church,
  Flower2,
  Cross,
  Sparkles,
  Share2,
  Globe,
  BookOpenCheck,
  Shield,
  CalendarCheck,
  Presentation,
  Mail,
  Calculator,
  Grid3X3,
  Bell,
  Flag,
  Gift,
  Cloud,
  Loader2,
  TrendingUp,
  Banknote,
  ChevronRight,
  Users,
  QrCode,
  Receipt,
  Calendar,
  HelpCircle,
} from 'lucide-react'
import { Sun, Moon } from 'lucide-react'
import { useBrochureStore } from '../stores/brochureStore'
import { useThemeStore } from '../stores/themeStore'
import { useAuthStore } from '../stores/authStore'
import { events } from '../utils/analytics'
import { SignInPopover } from '../components/auth/SignInPopover'
import UserMenu from '../components/auth/UserMenu'
import MigrationDialog from '../components/auth/MigrationDialog'
import { usePosterStore } from '../stores/posterStore'
import { useInvitationStore } from '../stores/invitationStore'
import { useThankYouStore } from '../stores/thankYouStore'
import { useBookletStore } from '../stores/bookletStore'
import { useBannerStore } from '../stores/bannerStore'
import { useBudgetStore } from '../stores/budgetStore'
import { useCollageStore } from '../stores/collageStore'
import { useOneWeekStore } from '../stores/oneWeekStore'
import { useCloudDesigns } from '../hooks/useCloudDesigns'
import { loadCloudDesign } from '../utils/syncEngine'
import { posterTemplates, posterThemes } from '../utils/posterDefaultData'
import { invitationTemplates, invitationThemes } from '../utils/invitationDefaultData'
import { thankYouTemplates, thankYouThemes } from '../utils/thankYouDefaultData'
import { bookletTemplates, bookletThemes } from '../utils/bookletDefaultData'
import { bannerTemplates, bannerThemes } from '../utils/bannerDefaultData'
import { themes } from '../utils/themes'
import BrochureMockup from '../components/landing/BrochureMockup'
import PosterMockup from '../components/landing/PosterMockup'
import ProgrammeMockup from '../components/landing/ProgrammeMockup'
import FlipbookMockup from '../components/landing/FlipbookMockup'
import SlideshowMockup from '../components/landing/SlideshowMockup'
import MemorialMockup from '../components/landing/MemorialMockup'
import InvitationMockup from '../components/landing/InvitationMockup'
import ThankYouMockup from '../components/landing/ThankYouMockup'
import BookletMockup from '../components/landing/BookletMockup'
import BannerMockup from '../components/landing/BannerMockup'
import BudgetMockup from '../components/landing/BudgetMockup'
import CollageMockup from '../components/landing/CollageMockup'
import ReminderMockup from '../components/landing/ReminderMockup'
import QRCardsMockup from '../components/landing/QRCardsMockup'
import ReceiptMockup from '../components/landing/ReceiptMockup'
import WreathCardMockup from '../components/landing/WreathCardMockup'
import OneWeekMockup from '../components/landing/OneWeekMockup'
import ExampleBrochureDialog from '../components/landing/ExampleBrochureDialog'
import ThemePreviewCard from '../components/landing/ThemePreviewCard'
import LoadSharedDialog from '../components/layout/LoadSharedDialog'
import PartnerBanner from '../components/landing/PartnerBanner'
import FAQSection from '../components/seo/FAQSection'
import { captureReferralCode } from '../utils/referralTracker'

const FEATURES = [
  { icon: Palette, title: '9 Premium Themes', desc: 'From classic Black & Gold to bold Kente Gold — 9 beautiful themes' },
  { icon: Sparkles, title: 'AI Tribute Writer', desc: 'Let AI help you write heartfelt tributes, biography, and acknowledgements' },
  { icon: Eye, title: 'Live Preview', desc: 'See your brochure update in real-time as you type and edit' },
  { icon: Printer, title: 'Print Materials', desc: 'QR cards, donation receipts, and wreath cards — all from one editor' },
  { icon: Image, title: 'Photo Magic', desc: 'Enhance photos with filters, brightness, contrast, and background removal' },
  { icon: BookOpenCheck, title: 'Interactive Flipbook', desc: 'View your brochure as a beautiful page-flip animation' },
  { icon: QrCode, title: 'QR Code Cards', desc: 'Generate printable QR cards linking to your memorial and live service' },
  { icon: Flower2, title: 'Wreath Cards', desc: 'Design elegant gold-bordered message cards for funeral wreaths' },
  { icon: Receipt, title: 'Donation Receipts', desc: 'Print numbered acknowledgement receipt booklets for funeral donations' },
  { icon: Globe, title: 'Online Memorial', desc: 'Publish an online memorial page with QR code for the brochure' },
  { icon: Share2, title: 'Share & Collaborate', desc: 'Share via WhatsApp or collaborate with a 6-character share code' },
  { icon: Cloud, title: 'Cloud Sync', desc: 'Your designs auto-save and sync across devices when logged in' },
]

const TEMPLATES = [
  {
    id: 'full-service',
    icon: Church,
    title: 'Full Service',
    desc: 'Complete funeral brochure with order of service, tributes, biography, photo gallery, and acknowledgements.',
  },
  {
    id: 'simple-memorial',
    icon: Flower2,
    title: 'Simple Memorial',
    desc: 'A streamlined brochure with cover, tribute, and back cover — perfect for a smaller ceremony.',
  },
  {
    id: 'graveside-only',
    icon: Cross,
    title: 'Graveside Only',
    desc: 'A minimal brochure designed for graveside services with essential details and a personal touch.',
  },
]

const HERO_PRODUCTS = [
  { label: 'Brochures', mockup: 'brochure', route: '/editor' },
  { label: 'Posters', mockup: 'poster', route: '/poster-editor' },
  { label: 'Invitations', mockup: 'invitation', route: '/invitation-editor' },
  { label: 'Thank You Cards', mockup: 'thankYou', route: '/thankyou-editor' },
  { label: 'Booklets', mockup: 'booklet', route: '/booklet-editor' },
  { label: 'Collages', mockup: 'collage', route: '/collage-maker' },
  { label: 'One-Week Posters', mockup: 'oneweek', route: '/oneweek-editor' },
]

const LANDING_FAQS = [
  {
    question: 'What is FuneralPress?',
    answer: 'FuneralPress is an online funeral design and planning platform built for families in Ghana and across Africa. It lets you design funeral brochures, posters, invitations, booklets, thank-you cards, banners, and memorial pages — all from your phone or computer, with no design skills required.',
  },
  {
    question: 'How much does FuneralPress cost?',
    answer: 'You can start designing for free. A single design download costs GHS 35, a bundle of 3 designs is GHS 75, and unlimited designs cost GHS 120. All plans include print-ready PDF export, cloud sync, and access to every template.',
  },
  {
    question: 'Can I design a funeral brochure on my phone?',
    answer: 'Yes. FuneralPress is fully mobile-responsive and works as an installable app on both Android and iPhone. You can design, preview, and download your brochure directly from your phone browser.',
  },
  {
    question: 'How do I print my funeral brochure or poster?',
    answer: 'Download your design as a high-resolution, print-ready PDF, then take it to any printing shop. You can also use our integrated print-and-deliver service for doorstep delivery within Ghana.',
  },
  {
    question: 'Do you have templates for my church denomination?',
    answer: 'Yes. FuneralPress offers denomination-specific templates for Methodist, Catholic, Presbyterian, Pentecostal, Charismatic, Anglican, and SDA (Seventh-day Adventist) funeral services, each following the correct liturgical order.',
  },
  {
    question: 'Can I share my design digitally on WhatsApp?',
    answer: 'Absolutely. Every design can be downloaded as a PDF or image and shared instantly via WhatsApp, Facebook, email, or any messaging platform. You can also generate a 6-character share code so others can view or collaborate on your design.',
  },
  {
    question: 'What is the AI Tribute Writer?',
    answer: 'The AI Tribute Writer is a built-in tool that helps you write heartfelt tributes, biographies, and acknowledgement messages for your funeral brochure. Simply provide a few details about the deceased and the AI generates a moving tribute you can edit and personalise.',
  },
  {
    question: 'Is my data safe on FuneralPress?',
    answer: 'Yes. Your designs are encrypted and stored securely in the cloud. You sign in with your Google account, and your designs auto-save and sync across all your devices. Only you can access your designs.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const getReferralLink = useAuthStore((s) => s.getReferralLink)
  const store = useBrochureStore()
  const brochures = store.brochuresList
  const posterStore = usePosterStore()
  const posters = posterStore.postersList
  const invitationStore = useInvitationStore()
  const invitations = invitationStore.invitationsList
  const thankYouStore = useThankYouStore()
  const thankYous = thankYouStore.thankYouList
  const bookletStore = useBookletStore()
  const booklets = bookletStore.bookletsList
  const bannerStore = useBannerStore()
  const banners = bannerStore.bannersList
  const budgetStore = useBudgetStore()
  const budgets = budgetStore.budgetsList
  const collageStore = useCollageStore()
  const collages = collageStore.collagesList
  const oneWeekStore = useOneWeekStore()
  const { cloudDesigns, isLoadingCloud } = useCloudDesigns()
  const [loadingCloudId, setLoadingCloudId] = useState(null)
  const [exampleOpen, setExampleOpen] = useState(false)
  const [loadSharedOpen, setLoadSharedOpen] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [themeTab, setThemeTab] = useState('brochure')
  const [heroIdx, setHeroIdx] = useState(0)
  const [heroAnimating, setHeroAnimating] = useState(false)
  const heroTimerRef = useRef(null)

  // Hero product rotation
  useEffect(() => {
    heroTimerRef.current = setInterval(() => {
      setHeroAnimating(true)
      setTimeout(() => {
        setHeroIdx(prev => (prev + 1) % HERO_PRODUCTS.length)
        setHeroAnimating(false)
      }, 400)
    }, 3500)
    return () => clearInterval(heroTimerRef.current)
  }, [])

  const heroMockups = {
    brochure: <BrochureMockup themeKey="blackGold" className="text-[10px]" />,
    poster: <PosterMockup themeKey="midnightBlack" className="text-[10px]" />,
    invitation: <InvitationMockup themeKey="burgundyGold" className="text-[10px]" />,
    thankYou: <ThankYouMockup themeKey="ivoryGold" className="text-[10px]" />,
    booklet: <BookletMockup themeKey="blackGold" className="text-[10px]" />,
    collage: <CollageMockup className="text-[10px]" />,
    oneweek: <OneWeekMockup themeKey="burgundyGold" className="text-[10px]" />,
  }

  // Detect ?share= query parameter
  useEffect(() => {
    const code = searchParams.get('share')
    if (code && code.length === 6) {
      setShareCode(code)
      setLoadSharedOpen(true)
    }
  }, [searchParams])

  // Detect ?ref= query parameter (partner referral)
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      captureReferralCode(ref)
    }
  }, [searchParams])

  // Partner banner: fetch partner data when ?ref= or ?partner= is present
  const [partnerData, setPartnerData] = useState(null)
  useEffect(() => {
    const code = searchParams.get('ref') || searchParams.get('partner')
    if (!code) return
    const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'
    fetch(`${API_BASE}/partner/public/${code}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setPartnerData(data) })
      .catch(() => {})
  }, [searchParams])

  const handleNew = () => {
    store.newBrochure()
    navigate('/editor')
  }

  const handleLoad = (id) => {
    store.loadBrochure(id)
    navigate('/editor')
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirm('Delete this brochure?')) {
      store.deleteBrochure(id)
    }
  }

  const handleThemeSelect = (themeKey) => {
    store.newBrochure()
    store.updateField('theme', themeKey)
    navigate('/editor')
  }

  const handleTemplateSelect = () => {
    store.newBrochure()
    navigate('/editor')
  }

  const handlePosterThemeSelect = (themeKey) => {
    posterStore.newPoster()
    posterStore.updateField('posterTheme', themeKey)
    navigate('/poster-editor')
  }

  const handleNewPoster = () => {
    posterStore.newPoster()
    navigate('/poster-editor')
  }

  const handlePosterTemplate = (key) => {
    const template = posterTemplates[key]
    if (!template) return
    posterStore.loadTemplate(template.data)
    navigate('/poster-editor')
  }

  const handleLoadPoster = (id) => {
    posterStore.loadPoster(id)
    navigate('/poster-editor')
  }

  const handleDeletePoster = (e, id) => {
    e.stopPropagation()
    if (confirm('Delete this poster?')) {
      posterStore.deletePoster(id)
    }
  }

  const handleNewInvitation = () => {
    invitationStore.newInvitation()
    navigate('/invitation-editor')
  }

  const handleInvitationTemplate = (key) => {
    const template = invitationTemplates[key]
    if (!template) return
    invitationStore.loadTemplate(template.data)
    navigate('/invitation-editor')
  }

  const handleLoadInvitation = (id) => {
    invitationStore.loadInvitation(id)
    navigate('/invitation-editor')
  }

  const handleDeleteInvitation = (e, id) => {
    e.stopPropagation()
    if (confirm('Delete this invitation?')) {
      invitationStore.deleteInvitation(id)
    }
  }

  const handleInvitationThemeSelect = (themeKey) => {
    invitationStore.newInvitation()
    invitationStore.updateField('invitationTheme', themeKey)
    navigate('/invitation-editor')
  }

  // Thank You Card handlers
  const handleNewThankYou = () => { thankYouStore.newThankYou(); navigate('/thankyou-editor') }
  const handleThankYouTemplate = (key) => { const t = thankYouTemplates[key]; if (t) { thankYouStore.loadTemplate(t.data); navigate('/thankyou-editor') } }
  const handleLoadThankYou = (id) => { thankYouStore.loadThankYou(id); navigate('/thankyou-editor') }
  const handleDeleteThankYou = (e, id) => { e.stopPropagation(); if (confirm('Delete this thank you card?')) thankYouStore.deleteThankYou(id) }
  const handleThankYouThemeSelect = (themeKey) => { thankYouStore.newThankYou(); thankYouStore.updateField('thankYouTheme', themeKey); navigate('/thankyou-editor') }

  // Booklet handlers
  const handleNewBooklet = () => { bookletStore.newBooklet(); navigate('/booklet-editor') }
  const handleBookletTemplate = (key) => { const t = bookletTemplates[key]; if (t) { bookletStore.loadTemplate(t.data); navigate('/booklet-editor') } }
  const handleLoadBooklet = (id) => { bookletStore.loadBooklet(id); navigate('/booklet-editor') }
  const handleDeleteBooklet = (e, id) => { e.stopPropagation(); if (confirm('Delete this booklet?')) bookletStore.deleteBooklet(id) }
  const handleBookletThemeSelect = (themeKey) => { bookletStore.newBooklet(); bookletStore.updateField('bookletTheme', themeKey); navigate('/booklet-editor') }

  // Banner handlers
  const handleNewBanner = () => { bannerStore.newBanner(); navigate('/banner-editor') }
  const handleBannerTemplate = (key) => { const t = bannerTemplates[key]; if (t) { bannerStore.loadTemplate(t.data); navigate('/banner-editor') } }
  const handleLoadBanner = (id) => { bannerStore.loadBanner(id); navigate('/banner-editor') }
  const handleDeleteBanner = (e, id) => { e.stopPropagation(); if (confirm('Delete this banner?')) bannerStore.deleteBanner(id) }
  const handleBannerThemeSelect = (themeKey) => { bannerStore.newBanner(); bannerStore.updateField('bannerTheme', themeKey); navigate('/banner-editor') }

  // One-Week handlers
  const handleNewOneWeek = () => { oneWeekStore.newDesign(); navigate('/oneweek-editor') }

  // Budget handlers
  const handleNewBudget = () => { budgetStore.newBudget(); navigate('/budget-planner') }
  const handleLoadBudget = (id) => { budgetStore.loadBudget(id); navigate('/budget-planner') }
  const handleDeleteBudget = (e, id) => { e.stopPropagation(); if (confirm('Delete this budget?')) budgetStore.deleteBudget(id) }

  // Collage handlers
  const handleLoadCollage = (id) => { collageStore.loadCollage(id); navigate('/collage-maker') }
  const handleDeleteCollage = (e, id) => { e.stopPropagation(); if (confirm('Delete this collage?')) collageStore.deleteCollage(id) }

  // ─── Cloud designs merge ─────────────────────────────────────────────────
  function mergeWithCloud(localList, productType) {
    if (!user || !cloudDesigns.length) return localList
    const localIds = new Set(localList.map(item => item.id))
    const cloudOnly = cloudDesigns
      .filter(d => d.product_type === productType && !localIds.has(d.id))
      .map(d => ({ id: d.id, name: d.name, updatedAt: d.updated_at, _isCloud: true }))
    return [...localList, ...cloudOnly]
  }

  const mergedBrochures = mergeWithCloud(brochures, 'brochure')
  const mergedPosters = mergeWithCloud(posters, 'poster')
  const mergedInvitations = mergeWithCloud(invitations, 'invitation')
  const mergedThankYous = mergeWithCloud(thankYous, 'thankYou')
  const mergedBooklets = mergeWithCloud(booklets, 'booklet')
  const mergedBanners = mergeWithCloud(banners, 'banner')
  const mergedBudgets = mergeWithCloud(budgets, 'budget')
  const mergedCollages = mergeWithCloud(collages, 'collage')

  // ─── Unified "My Designs" list ───────────────────────────────────────────
  const PRODUCT_META = {
    brochure: { icon: FileText, label: 'Brochure', fallback: 'Untitled Brochure', load: handleLoad, del: handleDelete },
    poster: { icon: Presentation, label: 'Poster', fallback: 'Untitled Poster', load: handleLoadPoster, del: handleDeletePoster },
    invitation: { icon: Mail, label: 'Invitation', fallback: 'Untitled Invitation', load: handleLoadInvitation, del: handleDeleteInvitation },
    thankYou: { icon: Gift, label: 'Thank You', fallback: 'Untitled Thank You Card', load: handleLoadThankYou, del: handleDeleteThankYou },
    booklet: { icon: BookOpenCheck, label: 'Booklet', fallback: 'Untitled Booklet', load: handleLoadBooklet, del: handleDeleteBooklet },
    banner: { icon: Flag, label: 'Banner', fallback: 'Untitled Banner', load: handleLoadBanner, del: handleDeleteBanner },
    budget: { icon: Calculator, label: 'Budget', fallback: 'Untitled Budget', load: handleLoadBudget, del: handleDeleteBudget },
    collage: { icon: Grid3X3, label: 'Collage', fallback: 'Untitled Collage', load: handleLoadCollage, del: handleDeleteCollage },
  }

  const allDesigns = [
    ...mergedBrochures.map(d => ({ ...d, _type: 'brochure' })),
    ...mergedPosters.map(d => ({ ...d, _type: 'poster' })),
    ...mergedInvitations.map(d => ({ ...d, _type: 'invitation' })),
    ...mergedThankYous.map(d => ({ ...d, _type: 'thankYou' })),
    ...mergedBooklets.map(d => ({ ...d, _type: 'booklet' })),
    ...mergedBanners.map(d => ({ ...d, _type: 'banner' })),
    ...mergedBudgets.map(d => ({ ...d, _type: 'budget' })),
    ...mergedCollages.map(d => ({ ...d, _type: 'collage' })),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  const handleLoadCloudDesign = async (id, productType) => {
    setLoadingCloudId(id)
    try {
      const design = await loadCloudDesign(id)
      const data = typeof design.data === 'string' ? JSON.parse(design.data) : design.data
      const storeMap = {
        brochure: { s: store, route: '/editor' },
        poster: { s: posterStore, route: '/poster-editor' },
        invitation: { s: invitationStore, route: '/invitation-editor' },
        thankYou: { s: thankYouStore, route: '/thankyou-editor' },
        booklet: { s: bookletStore, route: '/booklet-editor' },
        banner: { s: bannerStore, route: '/banner-editor' },
        budget: { s: budgetStore, route: '/budget-planner' },
        collage: { s: collageStore, route: '/collage-maker' },
      }
      const target = storeMap[productType]
      if (!target) return
      target.s.loadFromCloudData(id, data, design.name)
      navigate(target.route)
    } catch (err) {
      console.error('Failed to load cloud design:', err)
    } finally {
      setLoadingCloudId(null)
    }
  }

  const hasBrochureData = store.fullName && store.fullName !== ''

  const handleOpenProgramme = () => {
    if (!hasBrochureData && brochures.length > 0) {
      store.loadBrochure(brochures[0].id)
    }
    navigate('/programme')
  }

  const handleOpenFlipbook = () => {
    if (!hasBrochureData && brochures.length > 0) {
      store.loadBrochure(brochures[0].id)
    }
    navigate('/flipbook')
  }

  const handleOpenSlideshow = () => {
    if (!hasBrochureData && brochures.length > 0) {
      store.loadBrochure(brochures[0].id)
    }
    navigate('/slideshow')
  }

  const handleOpenMemorial = () => {
    if (!hasBrochureData && brochures.length > 0) {
      store.loadBrochure(brochures[0].id)
    }
    navigate('/editor')
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <PageMeta
        title="FuneralPress — Ghana's All-in-One Funeral Design Platform"
        description="Design funeral brochures, posters, invitations, and memorial pages online. Ghana's most trusted funeral planning platform. Start designing free today."
        path="/"
        faqs={LANDING_FAQS}
      />
      {/* Partner banner (shown when ?ref=CODE or ?partner=CODE) */}
      {partnerData && <PartnerBanner partner={partnerData} />}

      {/* Top-right controls */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
        {user ? <UserMenu /> : <SignInPopover />}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-lg"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Migration dialog (shown on first login with existing local designs) */}
      <MigrationDialog />

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 sm:pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12 mb-12 lg:mb-20">
          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <BookOpen size={14} className="text-primary" />
              <span className="text-xs text-primary tracking-wide">FuneralPress</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Create Beautiful Memorial<br className="hidden sm:block" />
              <span className="relative inline-block overflow-hidden h-[1.2em] align-bottom">
                {HERO_PRODUCTS.map((p, i) => (
                  <span
                    key={p.label}
                    className="absolute left-0 text-primary whitespace-nowrap"
                    style={{
                      transition: 'all 0.4s ease',
                      transform: i === heroIdx
                        ? (heroAnimating ? 'translateY(-110%)' : 'translateY(0)')
                        : i === (heroIdx + 1) % HERO_PRODUCTS.length
                          ? (heroAnimating ? 'translateY(0)' : 'translateY(110%)')
                          : 'translateY(110%)',
                      opacity: i === heroIdx
                        ? (heroAnimating ? 0 : 1)
                        : i === (heroIdx + 1) % HERO_PRODUCTS.length
                          ? (heroAnimating ? 1 : 0)
                          : 0,
                    }}
                  >
                    {p.label}
                  </span>
                ))}
                {/* Invisible spacer for width */}
                <span className="invisible">Thank You Cards</span>
              </span>
            </h1>

            <p className="text-muted-foreground text-lg max-w-2xl mb-8 leading-relaxed">
              Design premium funeral brochures, posters, invitations, booklets, collages, and more
              with our elegant editor. Choose from professional themes — then download as a print-ready PDF.
            </p>

            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <Plus size={18} />
                Start Creating
              </button>
              <button
                onClick={() => setExampleOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-accent text-card-foreground hover:text-foreground border border-input font-medium rounded-lg transition-colors text-sm"
              >
                <Eye size={18} />
                See Example
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 sm:gap-6 mt-6 justify-center lg:justify-start text-muted-foreground">
              <div className="flex items-center gap-1.5 text-sm">
                <Users size={14} className="text-primary" />
                <span className="font-semibold text-foreground">500+</span>
                <span className="hidden sm:inline">families served</span>
                <span className="sm:hidden">families</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-sm">
                <FileText size={14} className="text-primary" />
                <span className="font-semibold text-foreground">2,000+</span>
                <span className="hidden sm:inline">designs created</span>
                <span className="sm:hidden">designs</span>
              </div>
            </div>

            {/* Product type pills */}
            <div className="flex flex-wrap items-center gap-2 mt-6 justify-center lg:justify-start">
              {HERO_PRODUCTS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => {
                    clearInterval(heroTimerRef.current)
                    setHeroAnimating(true)
                    setTimeout(() => {
                      setHeroIdx(i)
                      setHeroAnimating(false)
                    }, 400)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${
                    i === heroIdx
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: rotating mockup showcase */}
          <div className="flex-shrink-0 w-full max-w-[280px] lg:max-w-[300px] relative" style={{ minHeight: 380 }}>
            {HERO_PRODUCTS.map((p, i) => (
              <div
                key={p.mockup}
                className="absolute inset-0 transition-all duration-500 ease-out"
                style={{
                  opacity: i === heroIdx ? 1 : 0,
                  transform: i === heroIdx
                    ? 'scale(1) rotate(0deg)'
                    : i < heroIdx
                      ? 'scale(0.92) rotate(-3deg)'
                      : 'scale(0.92) rotate(3deg)',
                  zIndex: i === heroIdx ? 10 : 1,
                  pointerEvents: i === heroIdx ? 'auto' : 'none',
                }}
              >
                <div className="rounded-xl overflow-hidden shadow-2xl shadow-primary/10 ring-1 ring-border">
                  {heroMockups[p.mockup]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Partner Program — Premium Section ═══ */}
        <div className="relative mb-12 lg:mb-20">
          {/* Animated border glow */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-primary via-amber-400 to-primary bg-[length:200%_100%] animate-shimmer opacity-60" />

          <div className="relative overflow-hidden rounded-3xl bg-card animate-glow-breathe">
            {/* Layered background atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-amber-500/[0.05]" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500/8 via-amber-500/3 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />

            {/* Shimmer sweep overlay */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer-sweep" />
            </div>

            {/* Diamond pattern */}
            <div className="absolute inset-0 opacity-[0.025]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20z' fill='%23fff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px',
            }} />

            <div className="relative px-4 py-8 sm:px-8 sm:py-12 md:px-14 md:py-16">
              {/* Top badge row */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-8 animate-float-up">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-primary/15 via-amber-500/10 to-primary/15 border border-primary/25 rounded-full backdrop-blur-sm">
                  <div className="relative w-2 h-2">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />
                  </div>
                  <span className="text-[11px] text-primary uppercase tracking-[0.2em] font-bold">Partner Program</span>
                  <span className="text-[9px] text-emerald-400 font-semibold px-1.5 py-0.5 bg-emerald-400/10 rounded-full">LIVE</span>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
                {/* Left: headline + text + CTA */}
                <div className="flex-1 text-center lg:text-left">
                  <h2
                    className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5 leading-[1.15] animate-float-up"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", animationDelay: '100ms' }}
                  >
                    Refer Families,{' '}
                    <span className="relative inline-block">
                      <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-primary bg-[length:200%_100%] animate-shimmer">
                        Earn 40%
                      </span>
                    </span>
                    <br className="hidden sm:block" />
                    <span className="text-muted-foreground text-[0.6em] font-normal">on every design they purchase</span>
                  </h2>

                  <p className="text-muted-foreground text-sm sm:text-base max-w-lg mb-10 leading-relaxed animate-float-up" style={{ animationDelay: '200ms' }}>
                    Funeral homes, event planners, and community leaders — share your unique link and earn tiered commissions
                    with monthly payouts to your mobile money.
                  </p>

                  {/* Big stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 animate-float-up" style={{ animationDelay: '300ms' }}>
                    {[
                      { value: '40%', label: 'Max Commission', icon: TrendingUp, color: 'text-primary', glow: 'shadow-primary/20' },
                      { value: 'GHS 19+', label: 'Per Referral', icon: Banknote, color: 'text-emerald-400', glow: 'shadow-emerald-400/20' },
                      { value: '4 Tiers', label: 'To Climb', icon: Users, color: 'text-amber-400', glow: 'shadow-amber-400/20' },
                    ].map((stat) => {
                      const StatIcon = stat.icon
                      return (
                        <div key={stat.label} className={`relative group/stat flex flex-col items-center lg:items-start gap-1 p-4 rounded-2xl border border-border/60 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-lg ${stat.glow}`}>
                          <StatIcon size={18} className={`${stat.color} mb-1`} />
                          <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{stat.value}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* CTA area */}
                  <div className="animate-float-up" style={{ animationDelay: '400ms' }}>
                    {user?.isPartner ? (
                      <button
                        onClick={() => navigate('/partner-dashboard')}
                        className="group/btn relative inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-white font-semibold rounded-xl transition-all text-sm shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
                      >
                        <Users size={16} />
                        View Partner Dashboard
                        <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    ) : user ? (
                      <p className="text-sm text-muted-foreground">
                        Interested in becoming a partner?{' '}
                        <a href="https://chat.whatsapp.com/EbJjUflYBNUKDvkgqLiey8" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Contact us on WhatsApp</a>
                      </p>
                    ) : (
                      <div className="flex flex-col items-center lg:items-start gap-3">
                        <p className="text-xs text-muted-foreground">Sign in to apply as a partner</p>
                        <SignInPopover />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Premium tier card stack */}
                <div className="shrink-0 w-full max-w-xs lg:w-64">
                  <div className="space-y-3">
                    {[
                      { name: 'Starter', emoji: '', range: '0–5 referrals', rate: '30%', gradient: 'from-zinc-500 to-zinc-400', ring: 'ring-zinc-400/20', barW: '60%', delay: '200ms' },
                      { name: 'Growing', emoji: '', range: '6–20 referrals', rate: '33%', gradient: 'from-blue-500 to-blue-400', ring: 'ring-blue-400/20', barW: '72%', delay: '300ms' },
                      { name: 'Pro', emoji: '', range: '21–50 referrals', rate: '37%', gradient: 'from-amber-500 to-amber-400', ring: 'ring-amber-400/20', barW: '86%', delay: '400ms' },
                      { name: 'Elite', emoji: '', range: '51+ referrals', rate: '40%', gradient: 'from-purple-500 via-pink-500 to-amber-400', ring: 'ring-purple-400/30', barW: '100%', delay: '500ms' },
                    ].map((tier) => (
                      <div
                        key={tier.name}
                        className={`group/tier relative flex items-center gap-4 px-5 py-4 rounded-2xl border border-border/50 bg-background/40 backdrop-blur-sm ring-1 ${tier.ring} hover:ring-2 transition-all duration-300 animate-float-up hover:-translate-y-0.5 hover:shadow-lg`}
                        style={{ animationDelay: tier.delay }}
                      >
                        {/* Tier icon */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-white text-sm shadow-lg shrink-0`}>
                          {tier.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-foreground">{tier.name}</span>
                            <span className={`text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${tier.gradient}`}>{tier.rate}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${tier.gradient} transition-all duration-1000 ease-out`}
                              style={{ width: tier.barW }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">{tier.range}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom perks bar */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-10 pt-7 border-t border-border/30 animate-float-up" style={{ animationDelay: '500ms' }}>
                {[
                  { icon: Share2, text: 'Unique referral link' },
                  { icon: Eye, text: 'Real-time tracking dashboard' },
                  { icon: Banknote, text: 'Monthly MoMo payouts' },
                  { icon: Shield, text: 'Dedicated partner support' },
                ].map(({ icon: PerkIcon, text }) => (
                  <span key={text} className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-full px-3.5 py-1.5">
                    <PerkIcon size={12} className="text-primary/70" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {user && (
          <div className="bg-card border border-border rounded-xl p-6 mb-12 text-center max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Share2 size={18} className="text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Share FuneralPress</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Help a family in need — share your personal referral link
            </p>
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <input
                readOnly
                value={getReferralLink() || 'https://funeralpress.org'}
                className="flex-1 px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground truncate"
              />
              <button
                onClick={() => {
                  const link = getReferralLink()
                  if (link) {
                    navigator.clipboard.writeText(link)
                    events.referralLinkShared('copy')
                  }
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* My Designs */}
        {allDesigns.length > 0 && (
          <div className="mb-12 lg:mb-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Save size={16} className="text-primary" />
                <h2
                  className="text-lg font-bold text-foreground"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  My Designs
                </h2>
                {allDesigns.length > 0 && (
                  <span className="text-xs text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full">
                    {allDesigns.length}
                  </span>
                )}
              </div>
              {isLoadingCloud && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" /> Syncing...
                </span>
              )}
            </div>

            <div className="space-y-2">
              {allDesigns.map((item) => {
                const meta = PRODUCT_META[item._type]
                if (!meta) return null
                const Icon = meta.icon
                return (
                  <div
                    key={`${item._type}-${item.id}`}
                    onClick={() => item._isCloud ? handleLoadCloudDesign(item.id, item._type) : meta.load(item.id)}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-lg cursor-pointer hover:border-input hover:bg-card/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={18} className="text-primary/60 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-card-foreground truncate">{item.name || meta.fallback}</p>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          {item._isCloud && <Cloud size={12} className="text-primary/60" />}
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {loadingCloudId === item.id ? (
                        <Loader2 size={16} className="animate-spin text-primary" />
                      ) : (
                        <>
                          {!item._isCloud && (
                            <button
                              onClick={(e) => meta.del(e, item.id)}
                              className="p-2 text-muted-foreground/60 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <ArrowRight size={16} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Choose Your Product */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Complete Memorial Suite</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              What Would You Like to Create?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Brochure Card */}
            <button
              onClick={handleNew}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <BrochureMockup themeKey="blackGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Funeral Brochure
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Multi-page A4 brochure with cover, order of service, tributes, biography, and photo gallery.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Brochure <ArrowRight size={10} />
              </span>
            </button>

            {/* Poster Card */}
            <button
              onClick={handleNewPoster}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <PosterMockup themeKey="royalBlue" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Obituary Poster
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Single-page A3 poster with photo, family announcement, funeral arrangements, and family details.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Poster <ArrowRight size={10} />
              </span>
            </button>

            {/* One-Week Celebration Card */}
            <button
              onClick={handleNewOneWeek}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <OneWeekMockup themeKey="burgundyGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                One-Week Poster
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Announce one-week observance celebrations with a stunning poster featuring portrait, event details, and age badge.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Poster <ArrowRight size={10} />
              </span>
            </button>

            {/* Programme Card */}
            <button
              onClick={handleOpenProgramme}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <ProgrammeMockup themeKey="blackGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Live Programme
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Real-time countdown, order of service tracker, and interactive checklist for the day of the funeral.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                View Programme <ArrowRight size={10} />
              </span>
            </button>

            {/* Flipbook Card */}
            <button
              onClick={handleOpenFlipbook}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <FlipbookMockup themeKey="blackGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Interactive Flipbook
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                View your brochure as a beautiful page-turning flipbook with realistic animations.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Open Flipbook <ArrowRight size={10} />
              </span>
            </button>

            {/* Slideshow Card */}
            <button
              onClick={handleOpenSlideshow}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <SlideshowMockup themeKey="blackGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Memorial Slideshow
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Cinematic slideshow with music, transitions, and video recording for memorial tributes.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Play Slideshow <ArrowRight size={10} />
              </span>
            </button>

            {/* Memorial Page Card */}
            <button
              onClick={handleOpenMemorial}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <MemorialMockup themeKey="blackGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Online Memorial
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Publish a public memorial page with a shareable link and QR code for the brochure.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Memorial <ArrowRight size={10} />
              </span>
            </button>

            {/* Invitation Card */}
            <button
              onClick={handleNewInvitation}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <InvitationMockup themeKey="burgundyGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Invitation Card
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Elegant A4 invitation card with event details, RSVP, dress code, and 10 beautiful themes.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Invitation <ArrowRight size={10} />
              </span>
            </button>

            {/* Thank You Card */}
            <button
              onClick={handleNewThankYou}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <ThankYouMockup themeKey="ivoryGold" className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Thank You Card
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Express gratitude to funeral attendees with an elegant thank you card in 8 beautiful themes.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Card <ArrowRight size={10} />
              </span>
            </button>

            {/* Programme Booklet */}
            <button
              onClick={handleNewBooklet}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <BookletMockup themeKey={Object.keys(bookletThemes)[0]} className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Programme Booklet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                A5 multi-page programme with order of service, hymns, scripture readings, and back cover.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Booklet <ArrowRight size={10} />
              </span>
            </button>

            {/* Memorial Banner */}
            <button
              onClick={handleNewBanner}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[80px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <BannerMockup themeKey="royalBlue" className="text-[6px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Memorial Banner
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Tall roll-up banner for funeral venues with photo, scripture, and memorial details.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Banner <ArrowRight size={10} />
              </span>
            </button>

            {/* Budget Planner */}
            <button
              onClick={handleNewBudget}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <BudgetMockup className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Budget Planner
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Track funeral expenses, contributions, and donations with category breakdown and CSV export.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Plan Budget <ArrowRight size={10} />
              </span>
            </button>

            {/* Photo Collage */}
            <button
              onClick={() => navigate('/collage-maker')}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <CollageMockup className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Photo Collage
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Create beautiful photo collages with 7 layout templates including heart, cross, and grid formats.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Make Collage <ArrowRight size={10} />
              </span>
            </button>

            {/* Anniversary Reminder */}
            <button
              onClick={() => navigate('/reminders')}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <ReminderMockup className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Anniversary Reminders
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Track birthdays, death anniversaries, and custom memorial dates with browser notifications.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                View Reminders <ArrowRight size={10} />
              </span>
            </button>

            {/* QR Code Cards */}
            <button
              onClick={() => navigate('/qr-cards')}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[140px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <QRCardsMockup className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                QR Code Cards
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Generate elegant A4 QR code cards linking to your memorial page and live order of service.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Cards <ArrowRight size={10} />
              </span>
            </button>

            {/* Donation Receipt */}
            <button
              onClick={() => navigate('/receipt')}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[160px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <ReceiptMockup className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Donation Receipts
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Print numbered acknowledgement receipt booklets for funeral donations with cover page.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Create Booklet <ArrowRight size={10} />
              </span>
            </button>

            {/* Wreath Cards */}
            <button
              onClick={() => navigate('/wreath-cards')}
              className="group text-left p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
            >
              <div className="w-full max-w-[160px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg ring-1 ring-border">
                <WreathCardMockup className="text-[8px]" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Wreath Cards
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Create elegant message cards for funeral wreaths with custom messages and gold-bordered design.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                Design Cards <ArrowRight size={10} />
              </span>
            </button>
          </div>
        </div>

        {/* New Services */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">New Services</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Beyond Design
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Complete funeral planning tools — from guest books to hymn libraries.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { icon: BookOpen, label: 'Guest Book', desc: 'Digital condolence book for guests to sign and leave messages', route: '/guest-book-creator', badge: '1 credit' },
              { icon: Globe, label: 'Obituary Page', desc: 'Shareable obituary with funeral details, countdown, and biography', route: '/obituary-creator', badge: '1 credit' },
              { icon: Image, label: 'Photo Gallery', desc: 'Upload and share funeral photos in a beautiful gallery', route: '/gallery-creator', badge: '1 credit' },
              { icon: Church, label: 'Hymn Library', desc: '25+ funeral hymns with full lyrics in English and Twi', route: '/hymns', badge: 'Free' },
              { icon: Flag, label: 'Venue Directory', desc: 'Find churches, mortuaries, and funeral grounds in Ghana', route: '/venues', badge: 'Free' },
              { icon: Bell, label: 'Anniversaries', desc: 'Track memorial dates with reminders and calendar export', route: '/anniversaries', badge: 'Free' },
              { icon: Grid3X3, label: 'Aseda Labels', desc: 'Design funeral cloth labels with Kente borders and more', route: '/aseda-editor', badge: 'Free' },
              { icon: Calendar, label: 'One-Week Poster', desc: 'Design stunning one-week observation/celebration announcement posters', route: '/oneweek-editor', badge: '1 credit' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className="group text-left p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-primary" />
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${item.badge === 'Free' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Template Selection */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Get Started Quickly</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Choose a Template
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Pick a starting point and customize every detail in the editor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon
              return (
                <button
                  key={tmpl.id}
                  onClick={handleTemplateSelect}
                  className="group flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {tmpl.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tmpl.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                    Use Template <ArrowRight size={10} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Poster Templates */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Obituary Posters</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Poster Templates
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Choose a poster style and fill in the details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(posterTemplates).map(([key, tpl]) => {
              const iconMap = { BookOpen, Heart, Shield, Church }
              const Icon = iconMap[tpl.icon] || BookOpen
              return (
                <button
                  key={key}
                  onClick={() => handlePosterTemplate(key)}
                  className="group flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                    Use Template <ArrowRight size={10} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Invitation Templates */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Invitation Cards</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Invitation Templates
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Choose an invitation style and fill in the event details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(invitationTemplates).map(([key, tpl]) => {
              const iconMap = { BookOpen, Church, Shield }
              const Icon = iconMap[tpl.icon] || Mail
              return (
                <button
                  key={key}
                  onClick={() => handleInvitationTemplate(key)}
                  className="group flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">
                    Use Template <ArrowRight size={10} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Thank You Templates */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Thank You Cards</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Thank You Templates</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">Choose a thank you style for funeral attendees.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(thankYouTemplates).map(([key, tpl]) => {
              const iconMap = { BookOpen, Church, Heart }
              const Icon = iconMap[tpl.icon] || Gift
              return (
                <button key={key} onClick={() => handleThankYouTemplate(key)} className="group flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-200">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"><Icon size={22} className="text-primary" /></div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">Use Template <ArrowRight size={10} /></span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Booklet Templates */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Programme Booklets</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Booklet Templates</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">Choose a programme style with order of service and hymns.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(bookletTemplates).map(([key, tpl]) => {
              const iconMap = { Church, BookOpen, Heart }
              const Icon = iconMap[tpl.icon] || BookOpenCheck
              return (
                <button key={key} onClick={() => handleBookletTemplate(key)} className="group flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-200">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"><Icon size={22} className="text-primary" /></div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">Use Template <ArrowRight size={10} /></span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Banner Templates */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Memorial Banners</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Banner Templates</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">Choose a roll-up banner style for the funeral venue.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(bannerTemplates).map(([key, tpl]) => {
              const iconMap = { Heart, Sparkles, BookOpen }
              const Icon = iconMap[tpl.icon] || Flag
              return (
                <button key={key} onClick={() => handleBannerTemplate(key)} className="group flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-200">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"><Icon size={22} className="text-primary" /></div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary/70 group-hover:text-primary transition-colors uppercase tracking-wider font-medium">Use Template <ArrowRight size={10} /></span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Features */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Everything You Need</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Powerful Features
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="p-5 bg-card border border-border rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Load Shared Brochure */}
        <div className="mb-12 lg:mb-20">
          <div className="text-center mb-6">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Collaboration</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Have a Share Code?
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Someone shared a brochure with you? Enter the 6-character code to load it.
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => setLoadSharedOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-accent text-card-foreground hover:text-foreground border border-input font-medium rounded-lg transition-colors text-sm"
            >
              <Download size={18} />
              Load Shared Brochure
            </button>
          </div>
        </div>

        {/* Choose Your Theme */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <p className="text-xs text-primary/80 uppercase tracking-wider mb-2 font-medium">Personalize Your Design</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Choose Your Theme
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Each theme is carefully crafted for a dignified, professional look. Pick one to get started.
            </p>
          </div>

          {/* Tab Toggle — scrollable pill bar */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-muted/60 border border-border rounded-full p-1 overflow-x-auto max-w-full">
              {[
                { key: 'brochure', label: 'Brochure' },
                { key: 'poster', label: 'Poster' },
                { key: 'invitation', label: 'Invitation' },
                { key: 'thankYou', label: 'Thank You' },
                { key: 'booklet', label: 'Booklet' },
                { key: 'banner', label: 'Banner' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setThemeTab(tab.key)}
                  className={`relative z-10 px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 whitespace-nowrap shrink-0 ${
                    themeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brochure Themes Grid */}
          {themeTab === 'brochure' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.keys(themes).map((key) => (
                <ThemePreviewCard
                  key={key}
                  themeKey={key}
                  onClick={() => handleThemeSelect(key)}
                />
              ))}
            </div>
          )}

          {/* Poster Themes Grid */}
          {themeTab === 'poster' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.keys(posterThemes).map((key) => {
                const t = posterThemes[key]
                return (
                  <button
                    key={key}
                    onClick={() => handlePosterThemeSelect(key)}
                    className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 text-left w-full"
                  >
                    <div className="p-4 pb-3 flex items-center justify-center">
                      <div className="w-full max-w-[180px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-border/50">
                        <PosterMockup themeKey={key} className="text-[8px]" />
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.headerBg }} title="Header" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.accent }} title="Accent" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.detailsBg }} title="Details" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Invitation Themes Grid */}
          {themeTab === 'invitation' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.keys(invitationThemes).map((key) => {
                const t = invitationThemes[key]
                return (
                  <button
                    key={key}
                    onClick={() => handleInvitationThemeSelect(key)}
                    className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 text-left w-full"
                  >
                    <div className="p-4 pb-3 flex items-center justify-center">
                      <div className="w-full max-w-[180px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-border/50">
                        <InvitationMockup themeKey={key} className="text-[8px]" />
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.headerBg }} title="Header" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.accent }} title="Accent" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.detailsBg }} title="Details" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Thank You Themes Grid */}
          {themeTab === 'thankYou' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.keys(thankYouThemes).map((key) => {
                const t = thankYouThemes[key]
                return (
                  <button
                    key={key}
                    onClick={() => handleThankYouThemeSelect(key)}
                    className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 text-left w-full"
                  >
                    <div className="p-4 pb-3 flex items-center justify-center">
                      <div className="w-full max-w-[180px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-border/50">
                        <ThankYouMockup themeKey={key} className="text-[8px]" />
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.headerBg }} title="Header" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.accent }} title="Accent" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.bodyBg }} title="Body" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Booklet Themes Grid */}
          {themeTab === 'booklet' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.keys(bookletThemes).map((key) => {
                const t = bookletThemes[key]
                return (
                  <button
                    key={key}
                    onClick={() => handleBookletThemeSelect(key)}
                    className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 text-left w-full"
                  >
                    <div className="p-4 pb-3 flex items-center justify-center">
                      <div className="w-full max-w-[180px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-border/50">
                        <BookletMockup themeKey={key} className="text-[8px]" />
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.headerBg }} title="Header" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.accent }} title="Accent" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.bodyBg }} title="Body" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Banner Themes Grid */}
          {themeTab === 'banner' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.keys(bannerThemes).map((key) => {
                const t = bannerThemes[key]
                return (
                  <button
                    key={key}
                    onClick={() => handleBannerThemeSelect(key)}
                    className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 text-left w-full"
                  >
                    <div className="p-4 pb-3 flex items-center justify-center">
                      <div className="w-full max-w-[80px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-border/50">
                        <BannerMockup themeKey={key} className="text-[6px]" />
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.headerBg }} title="Header" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.accent }} title="Accent" />
                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60" style={{ backgroundColor: t.detailsBg }} title="Details" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="text-center mt-6">
            <Link
              to="/themes"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/90 transition-colors"
            >
              See All Themes <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Funeral Planning Guides */}
      <div className="py-20 px-4 sm:px-6 bg-primary/5 border-y border-primary/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
              <BookOpen size={14} />
              Free Resources
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Funeral Planning Guides</h2>
            <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto">Practical step-by-step resources for planning dignified funerals in Ghana</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'How to Design a Funeral Brochure in Ghana', slug: 'how-to-design-funeral-brochure-ghana', desc: 'Step-by-step guide to creating a beautiful memorial brochure with photos, tributes, and order of service.', icon: FileText },
              { title: 'Methodist Funeral Order of Service', slug: 'methodist-funeral-order-of-service', desc: 'Complete programme template with hymns, Scripture readings, and traditional Methodist funeral liturgy.', icon: Church },
              { title: 'Catholic Requiem Mass Programme', slug: 'catholic-requiem-mass-programme', desc: 'Full guide to the Catholic funeral mass structure including readings, prayers, and hymns.', icon: Cross },
              { title: 'Funeral Printing Costs in Ghana (2026)', slug: 'funeral-printing-cost-ghana', desc: 'What to expect for brochure, poster, and booklet printing. Tips to save money on funeral materials.', icon: Printer },
              { title: 'Presbyterian Funeral Service Programme', slug: 'presbyterian-funeral-service-programme', desc: 'Order of worship template for Presbyterian funerals with hymns, readings, and sermon guide.', icon: BookOpenCheck },
            ].map((post) => {
              const Icon = post.icon
              return (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group block bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-4 group-hover:gap-2 transition-all">
                    Read guide <ArrowRight size={14} />
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="text-center mt-10">
            <Link to="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition-colors shadow-md">
              View All Guides <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
              <HelpCircle size={14} />
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto">Everything you need to know about designing funeral materials with FuneralPress</p>
          </div>
          <FAQSection faqs={LANDING_FAQS} />
        </div>
      </div>

      {/* Example brochure dialog */}
      <ExampleBrochureDialog open={exampleOpen} onOpenChange={setExampleOpen} />
      <LoadSharedDialog
        open={loadSharedOpen}
        onOpenChange={(open) => {
          setLoadSharedOpen(open)
          if (!open && shareCode) {
            navigate('/editor')
          }
        }}
        initialCode={shareCode}
      />
    </div>
  )
}
