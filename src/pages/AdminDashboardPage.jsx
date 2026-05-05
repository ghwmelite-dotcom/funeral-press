import { useEffect, lazy, Suspense } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Shield, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useAdminStore } from '../stores/adminStore'
import { useThemeStore } from '../stores/themeStore'
import UserMenu from '../components/auth/UserMenu'
import GoogleLoginButton from '../components/auth/GoogleLoginButton'
import NotificationBell from '../components/admin/NotificationBell'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'

const OverviewTab = lazy(() => import('../components/admin/OverviewTab'))
const UsersTab = lazy(() => import('../components/admin/UsersTab'))
const OrdersTab = lazy(() => import('../components/admin/OrdersTab'))
const PartnersTab = lazy(() => import('../components/admin/PartnersTab'))
const DesignsTab = lazy(() => import('../components/admin/DesignsTab'))
const PrintOrdersTab = lazy(() => import('../components/admin/PrintOrdersTab'))
const DonationsTab = lazy(() => import('../components/admin/DonationsTab'))
const FunnelTab = lazy(() => import('../components/admin/FunnelTab'))

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const { activeTab, setActiveTab } = useAdminStore()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    if (!user.isAdmin) { navigate('/'); return }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user?.isAdmin) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
        <NotificationBell />
        {user ? <UserMenu /> : <GoogleLoginButton />}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-lg"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16">
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
            <Shield size={22} className="text-primary" />
            <h1
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Manage users, orders, partners, and platform analytics.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto flex gap-1 overflow-x-auto scrollbar-hide mb-6 bg-muted/50 p-1.5 rounded-lg">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">Orders</TabsTrigger>
            <TabsTrigger value="partners" className="text-xs sm:text-sm">Partners</TabsTrigger>
            <TabsTrigger value="designs" className="text-xs sm:text-sm">Designs</TabsTrigger>
            <TabsTrigger value="print-orders" className="text-xs sm:text-sm">Print Orders</TabsTrigger>
            <TabsTrigger value="donations" className="text-xs sm:text-sm">Donations</TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs sm:text-sm">Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Suspense fallback={<TabLoader />}>
              <OverviewTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="users">
            <Suspense fallback={<TabLoader />}>
              <UsersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="orders">
            <Suspense fallback={<TabLoader />}>
              <OrdersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="partners">
            <Suspense fallback={<TabLoader />}>
              <PartnersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="designs">
            <Suspense fallback={<TabLoader />}>
              <DesignsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="print-orders">
            <Suspense fallback={<TabLoader />}>
              <PrintOrdersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="donations">
            <Suspense fallback={<TabLoader />}>
              <DonationsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="funnel">
            <Suspense fallback={<TabLoader />}>
              <FunnelTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
