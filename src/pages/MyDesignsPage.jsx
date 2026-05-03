import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Trash2,
  Cloud,
  Loader2,
  Presentation,
  Mail,
  Gift,
  BookOpenCheck,
  Flag,
  Calculator,
  Grid3X3,
  FolderOpen,
  Printer,
  Package,
} from 'lucide-react'
import { Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useBrochureStore } from '../stores/brochureStore'
import { usePosterStore } from '../stores/posterStore'
import { useInvitationStore } from '../stores/invitationStore'
import { useThankYouStore } from '../stores/thankYouStore'
import { useBookletStore } from '../stores/bookletStore'
import { useBannerStore } from '../stores/bannerStore'
import { useBudgetStore } from '../stores/budgetStore'
import { useCollageStore } from '../stores/collageStore'
import { useCloudDesigns } from '../hooks/useCloudDesigns'
import { haptic } from '../hooks/useHaptic'
import { usePullToRefresh, PullToRefreshIndicator } from '../hooks/usePullToRefresh'
import { loadCloudDesign } from '../utils/syncEngine'
import { usePrintOrderStore } from '../stores/printOrderStore'
import GoogleLoginButton from '../components/auth/GoogleLoginButton'
import UserMenu from '../components/auth/UserMenu'

export default function MyDesignsPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const [loadingCloudId, setLoadingCloudId] = useState(null)

  // Stores
  const store = useBrochureStore()
  const posterStore = usePosterStore()
  const invitationStore = useInvitationStore()
  const thankYouStore = useThankYouStore()
  const bookletStore = useBookletStore()
  const bannerStore = useBannerStore()
  const budgetStore = useBudgetStore()
  const collageStore = useCollageStore()

  // Cloud
  const { cloudDesigns, isLoadingCloud, refreshCloudDesigns } = useCloudDesigns()

  // Print orders
  const printOrders = usePrintOrderStore(s => s.orders)
  const fetchPrintOrders = usePrintOrderStore(s => s.fetchOrders)

  useEffect(() => {
    if (user) fetchPrintOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Pull-to-refresh
  const { pullDistance } = usePullToRefresh(async () => {
    await refreshCloudDesigns()
    if (user) await fetchPrintOrders()
  })

  // Local lists
  const brochures = store.brochuresList
  const posters = posterStore.postersList
  const invitations = invitationStore.invitationsList
  const thankYous = thankYouStore.thankYouList
  const booklets = bookletStore.bookletsList
  const banners = bannerStore.bannersList
  const budgets = budgetStore.budgetsList
  const collages = collageStore.collagesList

  // Load handlers
  const handleLoad = (id) => { store.loadBrochure(id); navigate('/editor') }
  const handleLoadPoster = (id) => { posterStore.loadPoster(id); navigate('/poster-editor') }
  const handleLoadInvitation = (id) => { invitationStore.loadInvitation(id); navigate('/invitation-editor') }
  const handleLoadThankYou = (id) => { thankYouStore.loadThankYou(id); navigate('/thankyou-editor') }
  const handleLoadBooklet = (id) => { bookletStore.loadBooklet(id); navigate('/booklet-editor') }
  const handleLoadBanner = (id) => { bannerStore.loadBanner(id); navigate('/banner-editor') }
  const handleLoadBudget = (id) => { budgetStore.loadBudget(id); navigate('/budget-planner') }
  const handleLoadCollage = (id) => { collageStore.loadCollage(id); navigate('/collage-maker') }

  // Delete handlers
  const handleDelete = (e, id) => { e.stopPropagation(); if (confirm('Delete this brochure?')) { haptic('medium'); store.deleteBrochure(id) } }
  const handleDeletePoster = (e, id) => { e.stopPropagation(); if (confirm('Delete this poster?')) { haptic('medium'); posterStore.deletePoster(id) } }
  const handleDeleteInvitation = (e, id) => { e.stopPropagation(); if (confirm('Delete this invitation?')) { haptic('medium'); invitationStore.deleteInvitation(id) } }
  const handleDeleteThankYou = (e, id) => { e.stopPropagation(); if (confirm('Delete this thank you card?')) { haptic('medium'); thankYouStore.deleteThankYou(id) } }
  const handleDeleteBooklet = (e, id) => { e.stopPropagation(); if (confirm('Delete this booklet?')) { haptic('medium'); bookletStore.deleteBooklet(id) } }
  const handleDeleteBanner = (e, id) => { e.stopPropagation(); if (confirm('Delete this banner?')) { haptic('medium'); bannerStore.deleteBanner(id) } }
  const handleDeleteBudget = (e, id) => { e.stopPropagation(); if (confirm('Delete this budget?')) { haptic('medium'); budgetStore.deleteBudget(id) } }
  const handleDeleteCollage = (e, id) => { e.stopPropagation(); if (confirm('Delete this collage?')) { haptic('medium'); collageStore.deleteCollage(id) } }

  // Merge with cloud
  function mergeWithCloud(localList, productType) {
    if (!user || !cloudDesigns.length) return localList
    const localIds = new Set(localList.map(item => item.id))
    const cloudOnly = cloudDesigns
      .filter(d => d.product_type === productType && !localIds.has(d.id))
      .map(d => ({ id: d.id, name: d.name, updatedAt: d.updated_at, _isCloud: true }))
    return [...localList, ...cloudOnly]
  }

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
    ...mergeWithCloud(brochures, 'brochure').map(d => ({ ...d, _type: 'brochure' })),
    ...mergeWithCloud(posters, 'poster').map(d => ({ ...d, _type: 'poster' })),
    ...mergeWithCloud(invitations, 'invitation').map(d => ({ ...d, _type: 'invitation' })),
    ...mergeWithCloud(thankYous, 'thankYou').map(d => ({ ...d, _type: 'thankYou' })),
    ...mergeWithCloud(booklets, 'booklet').map(d => ({ ...d, _type: 'booklet' })),
    ...mergeWithCloud(banners, 'banner').map(d => ({ ...d, _type: 'banner' })),
    ...mergeWithCloud(budgets, 'budget').map(d => ({ ...d, _type: 'budget' })),
    ...mergeWithCloud(collages, 'collage').map(d => ({ ...d, _type: 'collage' })),
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
        <PullToRefreshIndicator pullDistance={pullDistance} />
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen size={22} className="text-primary" />
              <h1
                className="text-2xl md:text-3xl font-bold text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                My Designs
              </h1>
              {allDesigns.length > 0 && (
                <span className="text-xs text-muted-foreground/80 bg-muted px-2.5 py-1 rounded-full">
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
          {user && (
            <p className="text-sm text-muted-foreground mt-2">
              All your designs across devices, synced to your account.
            </p>
          )}
        </div>

        {/* Designs list */}
        {allDesigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-card border border-dashed border-border rounded-xl">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen size={24} className="text-muted-foreground/50" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">No designs yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Create a brochure, poster, invitation, or any other design. Your saved work will appear here and sync across all your devices.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Start Creating
            </Link>
          </div>
        ) : (
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
        )}

        {/* Print Orders Section */}
        {user && printOrders.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <Package size={18} className="text-amber-500" />
              <h2
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Print Orders
              </h2>
              <span className="text-xs text-muted-foreground/80 bg-muted px-2.5 py-1 rounded-full">
                {printOrders.length}
              </span>
            </div>
            <div className="space-y-2">
              {printOrders.map(order => {
                const fulfillmentColors = {
                  pending: 'bg-amber-500/10 text-amber-500',
                  sent_to_printer: 'bg-blue-500/10 text-blue-500',
                  printing: 'bg-indigo-500/10 text-indigo-500',
                  out_for_delivery: 'bg-cyan-500/10 text-cyan-500',
                  delivered: 'bg-emerald-500/10 text-emerald-500',
                  cancelled: 'bg-red-500/10 text-red-500',
                }
                const paymentColors = {
                  success: 'bg-emerald-500/10 text-emerald-500',
                  pending: 'bg-amber-500/10 text-amber-500',
                  failed: 'bg-red-500/10 text-red-500',
                }
                const formatLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Printer size={18} className="text-amber-500/60 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-card-foreground truncate">{order.design_name || 'Untitled'}</p>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider capitalize">
                            {order.product_type}
                          </span>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                            x{order.quantity}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60">
                          GHS {(order.total_pesewas / 100).toFixed(2)} &middot; {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${paymentColors[order.payment_status] || 'bg-muted text-muted-foreground'}`}>
                        {order.payment_status}
                      </span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${fulfillmentColors[order.fulfillment_status] || 'bg-muted text-muted-foreground'}`}>
                        {formatLabel(order.fulfillment_status)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
