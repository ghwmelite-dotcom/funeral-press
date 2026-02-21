import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import { NotificationProvider } from './components/ui/notification'
import { Skeleton } from './components/ui/skeleton'
import { useThemeStore } from './stores/themeStore'

const EditorPage = lazy(() => import('./pages/EditorPage'))
const PreviewPage = lazy(() => import('./pages/PreviewPage'))
const PosterEditorPage = lazy(() => import('./pages/PosterEditorPage'))
const ThemeGalleryPage = lazy(() => import('./pages/ThemeGalleryPage'))
const ProgrammePage = lazy(() => import('./pages/ProgrammePage'))
const MemorialPage = lazy(() => import('./pages/MemorialPage'))
const FlipbookPage = lazy(() => import('./pages/FlipbookPage'))
const MemorialSlideshowPage = lazy(() => import('./pages/MemorialSlideshowPage'))

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

  return (
    <ErrorBoundary>
      <NotificationProvider>
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
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  )
}
