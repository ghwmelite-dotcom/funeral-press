import { useEffect, useState } from 'react'
import { Users, UserPlus, UserMinus, Loader2, Check } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'

function PartnerTypeBadge({ partnerType }) {
  if (partnerType === 'church') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Church
      </span>
    )
  }
  if (partnerType === 'funeral_home') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Funeral Home
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      Individual
    </span>
  )
}

function PartnerTypeSelector({ partner, onSave }) {
  const [saving, setSaving] = useState(false)

  const handleChange = async (e) => {
    const val = e.target.value === '' ? null : e.target.value
    setSaving(true)
    try {
      await onSave(partner.id, val)
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <select
      value={partner.partner_type || ''}
      onChange={handleChange}
      disabled={saving}
      className="px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
    >
      <option value="">Individual</option>
      <option value="church">Church</option>
      <option value="funeral_home">Funeral Home</option>
    </select>
  )
}

const TIER_RATES = { default: 10 }

function CommissionOverrideInput({ partner, onSave }) {
  const currentRate = partner.partner_commission_override != null
    ? partner.partner_commission_override
    : TIER_RATES.default
  const [value, setValue] = useState(String(currentRate))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const rate = parseFloat(value)
    if (isNaN(rate) || rate < 0 || rate > 100) return
    setSaving(true)
    try {
      await onSave(partner.id, rate)
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        min="0"
        max="100"
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-14 px-1.5 py-0.5 text-xs bg-muted border border-border rounded text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <span className="text-[10px] text-muted-foreground">%</span>
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        <span className="ml-0.5">Set</span>
      </button>
    </div>
  )
}

export default function PartnersTab() {
  const { partners, fetchPartners, fetchUsers, users, promotePartner, demotePartner, setCommissionOverride, setPartnerType, isLoading } = useAdminStore()

  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteSearch, setPromoteSearch] = useState('')
  const [promoteUserId, setPromoteUserId] = useState('')
  const [promoteName, setPromoteName] = useState('')
  const [promoting, setPromoting] = useState(false)

  const [demoteTarget, setDemoteTarget] = useState(null)
  const [demoting, setDemoting] = useState(false)

  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetchPartners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenPromote = () => {
    setPromoteSearch('')
    setPromoteUserId('')
    setPromoteName('')
    setPromoteOpen(true)
    fetchUsers({ per_page: 100 })
  }

  const handlePromote = async () => {
    if (!promoteUserId || !promoteName) return
    setPromoting(true)
    try {
      await promotePartner(promoteUserId, promoteName)
      setPromoteOpen(false)
    } catch { /* ignore */ }
    setPromoting(false)
  }

  const handleDemote = async () => {
    if (!demoteTarget) return
    setDemoting(true)
    try {
      await demotePartner(demoteTarget)
      setDemoteTarget(null)
    } catch { /* ignore */ }
    setDemoting(false)
  }

  const filteredUsers = promoteSearch
    ? users.data.filter(u => !u.is_partner && (u.name?.toLowerCase().includes(promoteSearch.toLowerCase()) || u.email?.toLowerCase().includes(promoteSearch.toLowerCase())))
    : users.data.filter(u => !u.is_partner)

  const formatGHS = (pesewas) => `GHS ${(pesewas / 100).toFixed(2)}`

  const filteredPartners = typeFilter === 'all'
    ? partners
    : typeFilter === 'individual'
      ? partners.filter(p => !p.partner_type)
      : partners.filter(p => p.partner_type === typeFilter)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}</p>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1 text-xs bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Partners</option>
            <option value="church">Churches</option>
            <option value="funeral_home">Funeral Homes</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <button
          onClick={handleOpenPromote}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus size={12} />
          Promote User
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Partner</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Code</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Referrals</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Earned</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Commission</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium text-sm">{p.partner_name || p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PartnerTypeSelector partner={p} onSave={setPartnerType} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{p.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{p.referral_code}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-foreground">{p.referral_count}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground hidden md:table-cell">
                    {formatGHS(p.total_earned)}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <CommissionOverrideInput partner={p} onSave={setCommissionOverride} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDemoteTarget(p.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <UserMinus size={12} />
                      <span className="hidden sm:inline">Demote</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No partners yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Promote User to Partner</DialogTitle>
            <DialogDescription>Select a user and give them a partner name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Search User</label>
              <input
                type="text"
                value={promoteSearch}
                onChange={(e) => setPromoteSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {promoteSearch && (
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                {filteredUsers.slice(0, 10).map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setPromoteUserId(u.id); setPromoteName(u.name || '') }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      promoteUserId === u.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate">{u.name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
                )}
              </div>
            )}
            {promoteUserId && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Partner Name</label>
                <input
                  type="text"
                  value={promoteName}
                  onChange={(e) => setPromoteName(e.target.value)}
                  placeholder="e.g. Accra Funeral Services"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setPromoteOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePromote}
              disabled={!promoteUserId || !promoteName || promoting}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {promoting && <Loader2 size={14} className="animate-spin" />}
              Promote
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demote Confirmation Dialog */}
      <Dialog open={!!demoteTarget} onOpenChange={() => setDemoteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Demote Partner</DialogTitle>
            <DialogDescription>This will remove their partner status. They will lose their referral code and commission earnings. This action can be reversed later.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDemoteTarget(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDemote}
              disabled={demoting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {demoting && <Loader2 size={14} className="animate-spin" />}
              Demote
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
