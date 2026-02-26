import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
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
    <ErrorBoundary>
      <NotificationProvider>
        <CheckoutDialog />
        <PrintOrderDialog />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/poster-editor" element={<PosterEditorPage />} />
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
              <Route path="/my-designs" element={<MyDesignsPage />} />
              <Route path="/partner-dashboard" element={<PartnerDashboardPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/live-service/:id" element={<LiveServicePage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  )
}
