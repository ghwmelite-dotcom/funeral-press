import { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Gift, Loader2 } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'

export default function UsersTab() {
  const { users, fetchUsers, grantCredits, isLoading } = useAdminStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Grant credits dialog
  const [grantOpen, setGrantOpen] = useState(false)
  const [grantUserId, setGrantUserId] = useState(null)
  const [grantUserName, setGrantUserName] = useState('')
  const [grantAmount, setGrantAmount] = useState(1)
  const [grantReason, setGrantReason] = useState('')
  const [granting, setGranting] = useState(false)

  useEffect(() => {
    fetchUsers({ search, filter, page, per_page: 20 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, page])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleFilter = (f) => {
    setFilter(f)
    setPage(1)
  }

  const openGrant = (user) => {
    setGrantUserId(user.id)
    setGrantUserName(user.name || user.email)
    setGrantAmount(1)
    setGrantReason('')
    setGrantOpen(true)
  }

  const handleGrant = async () => {
    setGranting(true)
    try {
      await grantCredits(grantUserId, grantAmount, grantReason)
      setGrantOpen(false)
    } catch { /* ignore */ }
    setGranting(false)
  }

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'partner', label: 'Partners' },
  ]

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Orders</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Designs</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map(user => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate text-sm">{user.name || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground sm:hidden truncate">{user.email}</p>
                      </div>
                      {user.is_partner === 1 && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Partner</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${user.credits_remaining === -1 ? 'text-purple-500' : user.credits_remaining > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {user.credits_remaining === -1 ? 'Unlimited' : user.credits_remaining}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground hidden md:table-cell">{user.order_count}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground hidden md:table-cell">{user.unlock_count}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openGrant(user)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Grant Credits"
                    >
                      <Gift size={12} />
                      <span className="hidden sm:inline">Grant</span>
                    </button>
                  </td>
                </tr>
              ))}
              {users.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {users.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {users.total} user{users.total !== 1 ? 's' : ''} total
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
              {page} / {users.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(users.totalPages, p + 1))}
              disabled={page >= users.totalPages}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Grant Credits Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Credits</DialogTitle>
            <DialogDescription>Add credits to {grantUserName}'s account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Credits to Add</label>
              <input
                type="number"
                min={1}
                max={100}
                value={grantAmount}
                onChange={(e) => setGrantAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Reason (optional)</label>
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="e.g. Promotional grant, support ticket..."
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setGrantOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGrant}
              disabled={granting}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {granting && <Loader2 size={14} className="animate-spin" />}
              Grant {grantAmount} Credit{grantAmount !== 1 ? 's' : ''}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
