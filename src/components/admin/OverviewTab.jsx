import { useEffect, useState } from 'react'
import { Users, DollarSign, ShoppingCart, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// ─── Constants ───────────────────────────────────────────────────────────────
const GOLD = '#C9A84C'
const BURGUNDY = '#8B2D42'
const GOLD_LIGHT = 'rgba(201,168,76,0.18)'
const PIE_COLORS = [GOLD, BURGUNDY, '#4A7C6F', '#5B4E8A', '#D4845A', '#3A6E8F']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatGHS(pesewas) {
  return `GHS ${(pesewas / 100).toFixed(2)}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />
}

function KpiSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

function ChartSkeleton({ height = 220 }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton style={{ height }} />
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, pctChange, iconColor = 'text-primary' }) {
  const up = pctChange >= 0
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <Icon size={18} className={iconColor} />
        {pctChange !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
            {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(pctChange)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

// ─── Legacy stat card (for overview data) ────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf
    if (value === 0) {
      raf = requestAnimationFrame(() => setDisplay(0))
      return () => cancelAnimationFrame(raf)
    }
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{formatDate(label)}</p>
      <p className="text-[--color-gold]" style={{ color: GOLD }}>Revenue: {formatGHS(payload[0]?.value || 0)}</p>
      <p className="text-muted-foreground">Orders: {payload[1]?.value || 0}</p>
    </div>
  )
}

function TemplatesBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p style={{ color: BURGUNDY }}>Unlocks: {payload[0]?.value || 0}</p>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OverviewTab() {
  const {
    overview, fetchOverview,
    analytics, analyticsRevenue, analyticsTemplates,
    fetchAnalytics,
    analyticsLoading, isLoading,
  } = useAdminStore()

  useEffect(() => {
    fetchOverview()
    fetchAnalytics(30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loading = isLoading && !overview
  const analyticsLoadingState = analyticsLoading && !analytics

  // Prepare revenue chart data
  const revenueChartData = (analyticsRevenue || []).map(row => ({
    date: row.date,
    revenue: row.revenue || 0,
    orders: row.orders || 0,
  }))

  // Prepare pie data for product mix
  const pieData = (analyticsTemplates || []).map(row => ({
    name: row.product_type || 'Unknown',
    value: row.count || 0,
  }))

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {analyticsLoadingState ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : analytics ? (
          <>
            <KpiCard
              icon={Users}
              label="Total Users"
              value={<AnimatedNumber value={analytics.totalUsers} />}
              pctChange={analytics.newUsersPctChange}
              iconColor="text-primary"
            />
            <KpiCard
              icon={DollarSign}
              label="Revenue MTD (GHS)"
              value={<AnimatedNumber value={analytics.revenuePesewas / 100} prefix="GHS " decimals={2} />}
              pctChange={analytics.revenuePctChange}
              iconColor="text-amber-500"
            />
            <KpiCard
              icon={Activity}
              label="Active Subscriptions"
              value={<AnimatedNumber value={analytics.activeSubscriptions} />}
              iconColor="text-emerald-500"
            />
            <KpiCard
              icon={ShoppingCart}
              label="Print Orders (30d)"
              value={<AnimatedNumber value={analytics.printOrders} />}
              pctChange={analytics.printOrdersPctChange}
              iconColor="text-blue-500"
            />
          </>
        ) : overview ? (
          <>
            <KpiCard
              icon={Users}
              label="Total Users"
              value={<AnimatedNumber value={overview.totalUsers} />}
              iconColor="text-primary"
            />
            <KpiCard
              icon={DollarSign}
              label="Revenue (7d)"
              value={<AnimatedNumber value={overview.revenue7d / 100} prefix="GHS " decimals={2} />}
              iconColor="text-amber-500"
            />
            <KpiCard
              icon={Activity}
              label="New Users (30d)"
              value={<AnimatedNumber value={overview.newUsers30d} />}
              iconColor="text-emerald-500"
            />
            <KpiCard
              icon={ShoppingCart}
              label="Designs Unlocked"
              value={<AnimatedNumber value={overview.designsUnlocked} />}
              iconColor="text-blue-500"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        )}
      </div>

      {/* ── Charts Row 1: Revenue AreaChart + Product Mix PieChart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Trend (30 days)</h3>
          {analyticsLoadingState ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #888)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={v => `₵${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #888)' }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={GOLD}
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: GOLD }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Product Type Mix PieChart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Product Mix</h3>
          {analyticsLoadingState ? (
            <Skeleton className="h-[220px] w-full" />
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  outerRadius={72}
                  innerRadius={36}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 2: Top Templates HorizontalBarChart ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Templates by Unlocks</h3>
        {analyticsLoadingState ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (analyticsTemplates || []).length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, (analyticsTemplates || []).length * 32 + 24)}>
            <BarChart
              data={analyticsTemplates || []}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.15)" />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #888)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="product_type"
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground, #888)' }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip content={<TemplatesBarTooltip />} />
              <Bar dataKey="count" fill={BURGUNDY} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
            No unlock data yet
          </div>
        )}
      </div>

      {/* ── Legacy Overview Stats ── */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Credits in Circulation</p>
            <p className="text-xl font-bold text-foreground">
              <AnimatedNumber value={overview.creditsInCirculation} />
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">New Users (7d)</p>
            <p className="text-xl font-bold text-foreground">
              <AnimatedNumber value={overview.newUsers7d} />
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground mb-2">Orders by Plan</p>
            <div className="flex flex-col gap-1">
              {Object.entries(overview.ordersByPlan || {}).map(([plan, count]) => (
                <span key={plan} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{plan}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </span>
              ))}
              {Object.keys(overview.ordersByPlan || {}).length === 0 && (
                <span className="text-muted-foreground text-xs">No orders yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
