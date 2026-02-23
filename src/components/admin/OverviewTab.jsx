import { useEffect, useState } from 'react'
import { Users, DollarSign, ShoppingCart, Coins, Palette, TrendingUp } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
}

function StatCard({ icon: Icon, label, value, sub, iconColor = 'text-primary' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon size={18} className={iconColor} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  )
}

export default function OverviewTab() {
  const { overview, fetchOverview, isLoading } = useAdminStore()

  useEffect(() => {
    fetchOverview()
  }, [])

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!overview) return null

  const formatGHS = (pesewas) => `GHS ${(pesewas / 100).toFixed(2)}`

  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Users"
          value={<AnimatedNumber value={overview.totalUsers} />}
          sub={`${overview.newUsers7d} new this week`}
        />
        <StatCard
          icon={TrendingUp}
          label="New Users (7d)"
          value={<AnimatedNumber value={overview.newUsers7d} />}
          sub={`${overview.newUsers30d} in last 30d`}
          iconColor="text-emerald-500"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={<AnimatedNumber value={overview.totalRevenue / 100} prefix="GHS " decimals={2} />}
          sub={`${formatGHS(overview.revenue7d)} this week`}
          iconColor="text-amber-500"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue (7d)"
          value={<AnimatedNumber value={overview.revenue7d / 100} prefix="GHS " decimals={2} />}
          sub={`${formatGHS(overview.revenue30d)} in last 30d`}
          iconColor="text-amber-500"
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={ShoppingCart}
          label="Orders by Plan"
          value={
            <div className="flex flex-col gap-0.5 text-sm">
              {Object.entries(overview.ordersByPlan || {}).map(([plan, count]) => (
                <span key={plan} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{plan}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </span>
              ))}
              {Object.keys(overview.ordersByPlan || {}).length === 0 && (
                <span className="text-muted-foreground text-xs">No orders yet</span>
              )}
            </div>
          }
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Coins}
          label="Credits in Circulation"
          value={<AnimatedNumber value={overview.creditsInCirculation} />}
          iconColor="text-purple-500"
        />
        <StatCard
          icon={Palette}
          label="Designs Unlocked"
          value={<AnimatedNumber value={overview.designsUnlocked} />}
          iconColor="text-pink-500"
        />
      </div>
    </div>
  )
}
