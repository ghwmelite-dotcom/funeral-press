import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import { NotificationProvider } from './components/ui/notification'
import { Skeleton } from './components/ui/skeleton'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { usePurchaseStore } from './stores/purchaseStore'
import { useGoogleOneTap } from './hooks/useGoogleOneTap'
import CheckoutDialog from './components/editor/CheckoutDialog'
import PrintOrderDialog from './components/editor/PrintOrderDialog'
import BottomNav from './components/layout/BottomNav'
import { EditorSkeleton, GallerySkeleton, DashboardSkeleton, BlogSkeleton, DesignsSkeleton } from './components/ui/PageSkeletons'
import InstallPrompt from './components/pwa/InstallPrompt'
import RouteProgressBar from './components/pwa/RouteProgressBar'
import PageTransition from './components/layout/PageTransition'
import WhatsAppHelp from './components/layout/WhatsAppHelp'

const EditorPage = lazy(() => import('./pages/EditorPage'))
const PreviewPage = lazy(() => import('./pages/PreviewPage'))
const PosterEditorPage = lazy(() => import('./pages/PosterEditorPage'))
const ThemeGalleryPage = lazy(() => import('./pages/ThemeGalleryPage'))
const ProgrammePage = lazy(() => import('./pages/ProgrammePage'))
const MemorialPage = lazy(() => import('./pages/MemorialPage'))
const FlipbookPage = lazy(() => import('./pages/FlipbookPage'))
const MemorialSlideshowPage = lazy(() => import('./pages/MemorialSlideshowPage'))
const InvitationEditorPage = lazy(() => import('./pages/InvitationEditorPage'))
const ThankYouEditorPage = lazy(() => import('./pages/ThankYouEditorPage'))
const BookletEditorPage = lazy(() => import('./pages/BookletEditorPage'))
const BannerEditorPage = lazy(() => import('./pages/BannerEditorPage'))
const BudgetPlannerPage = lazy(() => import('./pages/BudgetPlannerPage'))
const CollageMakerPage = lazy(() => import('./pages/CollageMakerPage'))
const ReminderPage = lazy(() => import('./pages/ReminderPage'))
const MyDesignsPage = lazy(() => import('./pages/MyDesignsPage'))
const PartnerDashboardPage = lazy(() => import('./pages/PartnerDashboardPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const LiveServicePage = lazy(() => import('./pages/LiveServicePage'))
const ReceiptPage = lazy(() => import('./pages/ReceiptPage'))
const QRCodePrintPage = lazy(() => import('./pages/QRCodePrintPage'))
const WreathCardsPage = lazy(() => import('./pages/WreathCardsPage'))
const FuneralBrochureTemplatesPage = lazy(() => import('./pages/seo/FuneralBrochureTemplatesPage'))
const FuneralPosterTemplatesPage = lazy(() => import('./pages/seo/FuneralPosterTemplatesPage'))
const FuneralInvitationTemplatesPage = lazy(() => import('./pages/seo/FuneralInvitationTemplatesPage'))
const FuneralBookletTemplatesPage = lazy(() => import('./pages/seo/FuneralBookletTemplatesPage'))
const GalleryCreatorPage = lazy(() => import('./pages/GalleryCreatorPage'))
const GalleryEditorPage = lazy(() => import('./pages/GalleryEditorPage'))
const GalleryViewPage = lazy(() => import('./pages/GalleryViewPage'))
const AnniversaryTrackerPage = lazy(() => import('./pages/AnniversaryTrackerPage'))
const AsedaEditorPage = lazy(() => import('./pages/AsedaEditorPage'))
const BlogIndexPage = lazy(() => import('./pages/blog/BlogIndexPage'))
const BlogPostPage = lazy(() => import('./pages/blog/BlogPostPage'))
const GuestBookCreatorPage = lazy(() => import('./pages/GuestBookCreatorPage'))
const GuestBookPage = lazy(() => import('./pages/GuestBookPage'))
const ObituaryCreatorPage = lazy(() => import('./pages/ObituaryCreatorPage'))
const ObituaryPage = lazy(() => import('./pages/ObituaryPage'))
const HymnLibraryPage = lazy(() => import('./pages/HymnLibraryPage'))
const VenueDirectoryPage = lazy(() => import('./pages/VenueDirectoryPage'))
const OneWeekEditorPage = lazy(() => import('./pages/OneWeekEditorPage'))
const RegionPage = lazy(() => import('./pages/RegionPage'))
const BrochureDesignerPage = lazy(() => import('./pages/landing/BrochureDesignerPage'))
const PosterMakerPage = lazy(() => import('./pages/landing/PosterMakerPage'))
const MemorialCreatorPage = lazy(() => import('./pages/landing/MemorialCreatorPage'))
const ProgrammeBookletPage = lazy(() => import('./pages/landing/ProgrammeBookletPage'))
const DonatePage = lazy(() => import('./pages/DonatePage.jsx'))
const DonationThanksPage = lazy(() => import('./pages/DonationThanksPage.jsx'))
const FamilyHeadApprovalPage = lazy(() => import('./pages/FamilyHeadApprovalPage.jsx'))
const DonationPrivacyPage = lazy(() => import('./pages/DonationPrivacyPage.jsx'))

function LoadingFallback() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-primary text-2xl mb-3 animate-fade-in">&#10013;</div>
        <div className="text-muted-foreground text-sm tracking-wide animate-fade-in">Loading editor...</div>
        <div className="flex flex-col items-center gap-3 mt-6">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  )
}

function RouteSkeleton() {
  const location = useLocation()
  const path = location.pathname

  if (path.includes('editor') || path === '/collage-maker') return <EditorSkeleton />
  if (path === '/my-designs') return <DesignsSkeleton />
  if (path === '/admin' || path === '/partner-dashboard') return <DashboardSkeleton />
  if (path.startsWith('/blog')) return <BlogSkeleton />
  if (path.includes('template')) return <GallerySkeleton />
  if (path === '/themes') return <GallerySkeleton />
  return <LoadingFallback />
}

export default function App() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Hydrate auth state from localStorage on app start
  useEffect(() => {
    useAuthStore.getState().hydrate()
    // If logged in, fetch purchase status and refresh user data
    if (useAuthStore.getState().isLoggedIn()) {
      usePurchaseStore.getState().fetchStatus()
      useAuthStore.getState().refreshUser()
    }
  }, [])

  // Initialize Google One Tap
  useGoogleOneTap()

  return (
    <HelmetProvider>
    <ErrorBoundary>
      <NotificationProvider>
        <CheckoutDialog />
        <PrintOrderDialog />
        <BrowserRouter>
          <RouteProgressBar />
          <Suspense fallback={<RouteSkeleton />}>
            <PageTransition>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/poster-editor" element={<PosterEditorPage />} />
              <Route path="/oneweek-editor" element={<OneWeekEditorPage />} />
              <Route path="/themes" element={<ThemeGalleryPage />} />
              <Route path="/programme" element={<ProgrammePage />} />
              <Route path="/memorial/:id" element={<MemorialPage />} />
              <Route path="/flipbook" element={<FlipbookPage />} />
              <Route path="/slideshow" element={<MemorialSlideshowPage />} />
              <Route path="/invitation-editor" element={<InvitationEditorPage />} />
              <Route path="/thankyou-editor" element={<ThankYouEditorPage />} />
              <Route path="/booklet-editor" element={<BookletEditorPage />} />
              <Route path="/banner-editor" element={<BannerEditorPage />} />
              <Route path="/budget-planner" element={<BudgetPlannerPage />} />
              <Route path="/collage-maker" element={<CollageMakerPage />} />
              <Route path="/reminders" element={<ReminderPage />} />
              <Route path="/anniversaries" element={<AnniversaryTrackerPage />} />
              <Route path="/aseda-editor" element={<AsedaEditorPage />} />
              <Route path="/my-designs" element={<MyDesignsPage />} />
              <Route path="/partner-dashboard" element={<PartnerDashboardPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/live-service/:id" element={<LiveServicePage />} />
              <Route path="/receipt" element={<ReceiptPage />} />
              <Route path="/qr-cards" element={<QRCodePrintPage />} />
              <Route path="/wreath-cards" element={<WreathCardsPage />} />
              <Route path="/funeral-brochure-templates" element={<FuneralBrochureTemplatesPage />} />
              <Route path="/funeral-poster-templates" element={<FuneralPosterTemplatesPage />} />
              <Route path="/funeral-invitation-templates" element={<FuneralInvitationTemplatesPage />} />
              <Route path="/funeral-booklet-templates" element={<FuneralBookletTemplatesPage />} />
              <Route path="/gallery-creator" element={<GalleryCreatorPage />} />
              <Route path="/gallery-editor/:slug" element={<GalleryEditorPage />} />
              <Route path="/gallery/:slug" element={<GalleryViewPage />} />
              <Route path="/guest-book-creator" element={<GuestBookCreatorPage />} />
              <Route path="/guest-book/:slug" element={<GuestBookPage />} />
              <Route path="/obituary-creator" element={<ObituaryCreatorPage />} />
              <Route path="/obituary/:slug" element={<ObituaryPage />} />
              <Route path="/hymns" element={<HymnLibraryPage />} />
              <Route path="/venues" element={<VenueDirectoryPage />} />
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/funeral-services/:region" element={<RegionPage />} />
              <Route path="/funeral-brochure-designer" element={<BrochureDesignerPage />} />
              <Route path="/funeral-poster-maker" element={<PosterMakerPage />} />
              <Route path="/memorial-page-creator" element={<MemorialCreatorPage />} />
              <Route path="/funeral-programme-booklet" element={<ProgrammeBookletPage />} />
              <Route path="/m/:slug/donate" element={<DonatePage />} />
              <Route path="/m/:slug/donation-thanks" element={<DonationThanksPage />} />
              <Route path="/approve/:token" element={<FamilyHeadApprovalPage />} />
              <Route path="/privacy/donations" element={<DonationPrivacyPage />} />
            </Routes>
            </PageTransition>
          </Suspense>
          <InstallPrompt />
          <WhatsAppHelp />
          <BottomNav />
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
    </HelmetProvider>
  )
}
