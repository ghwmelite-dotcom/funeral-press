import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'

const STATUS_BADGE = {
  success: 'bg-emerald-500/10 text-emerald-500',
  pending: 'bg-amber-500/10 text-amber-500',
  failed: 'bg-red-500/10 text-red-500',
}

export default function OrdersTab() {
  const { orders, fetchOrders, isLoading } = useAdminStore()
  const [status, setStatus] = useState('all')
  const [plan, setPlan] = useState('all')
  const [days, setDays] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchOrders({ status, plan, days, page, per_page: 20 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, plan, days, page])

  const handleFilter = (setter) => (val) => {
    setter(val)
    setPage(1)
  }

  const formatGHS = (pesewas) => `GHS ${(pesewas / 100).toFixed(2)}`

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</label>
          <div className="flex gap-1">
            {['all', 'success', 'pending', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => handleFilter(setStatus)(s)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
                  status === s ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Plan</label>
          <div className="flex gap-1">
            {['all', 'single', 'bundle', 'suite'].map(p => (
              <button
                key={p}
                onClick={() => handleFilter(setPlan)(p)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
                  plan === p ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Timeframe</label>
          <div className="flex gap-1">
            {[{ key: 'all', label: 'All' }, { key: '7', label: '7d' }, { key: '30', label: '30d' }].map(d => (
              <button
                key={d.key}
                onClick={() => handleFilter(setDays)(d.key)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  days === d.key ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">User</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map(order => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">{order.paystack_reference?.slice(0, 20) || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="min-w-0">
                      <p className="text-foreground text-sm truncate">{order.user_name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{order.user_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs capitalize font-medium text-foreground">{order.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatGHS(order.amount_pesewas)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[order.status] || 'bg-muted text-muted-foreground'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {order.paid_at ? new Date(order.paid_at).toLocaleDateString() : order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {orders.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No orders found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {orders.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {orders.total} order{orders.total !== 1 ? 's' : ''} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {orders.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(orders.totalPages, p + 1))}
              disabled={page >= orders.totalPages}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
