import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { donationApi } from '../../utils/donationApi.js'
import { formatMinor } from '../../utils/currency.js'
import { DonationKillSwitch } from './DonationKillSwitch.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'succeeded', label: 'Succeeded' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'disputed', label: 'Disputed' },
]

const STATUS_COLOR = {
  pending: 'text-amber-600',
  succeeded: 'text-emerald-600',
  failed: 'text-destructive',
  refunded: 'text-muted-foreground',
  disputed: 'text-amber-600',
}

export function DonationsTab() {
  const [donations, setDonations] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  // Refund dialog state
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState(null)
  const [refundBusy, setRefundBusy] = useState(false)
  const [refundError, setRefundError] = useState(null)

  const load = async (statusFilter) => {
    setLoading(true)
    try {
      const data = await donationApi.adminListDonations({ status: statusFilter || undefined })
      setDonations(data.donations || [])
    } catch (err) {
      console.error('adminListDonations failed:', err)
      setDonations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(filter)
  }, [filter])

  const openRefund = (donation) => {
    setRefundTarget(donation)
    setRefundError(null)
    setRefundOpen(true)
  }

  const confirmRefund = async () => {
    if (!refundTarget) return
    setRefundBusy(true)
    setRefundError(null)
    try {
      await donationApi.adminRefund(refundTarget.id)
      // Optimistic local update
      setDonations((prev) =>
        prev.map((d) => (d.id === refundTarget.id ? { ...d, status: 'refunded' } : d))
      )
      setRefundOpen(false)
      setRefundTarget(null)
    } catch (err) {
      setRefundError(err.message || 'Refund failed')
    } finally {
      setRefundBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Donor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Memorial</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">When</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-foreground">{d.donor_display_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">
                    {d.memorial_id}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                    {formatMinor(d.amount_pesewas, 'GHS')}
                  </td>
                  <td className={`px-4 py-3 text-center hidden md:table-cell ${STATUS_COLOR[d.status] || 'text-muted-foreground'}`}>
                    {d.status}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.status === 'succeeded' && (
                      <button
                        onClick={() => openRefund(d)}
                        className="text-xs text-destructive underline hover:no-underline"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && donations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No donations found
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="inline animate-spin mr-2" size={14} />
                    Loading donations…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund confirmation dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm refund</DialogTitle>
            <DialogDescription>
              {refundTarget && (
                <>
                  Refund {formatMinor(refundTarget.amount_pesewas, 'GHS')} to{' '}
                  {refundTarget.donor_display_name}? This calls Paystack and cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {refundError && <p className="text-destructive text-sm">{refundError}</p>}
          <DialogFooter>
            <button
              onClick={() => setRefundOpen(false)}
              disabled={refundBusy}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmRefund}
              disabled={refundBusy}
              className="px-4 py-2 text-sm bg-destructive text-primary-foreground rounded-lg disabled:opacity-50"
            >
              {refundBusy ? (
                <>
                  <Loader2 size={14} className="inline animate-spin mr-1" />
                  Refunding…
                </>
              ) : (
                'Confirm refund'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DonationKillSwitch />
    </div>
  )
}

export default DonationsTab
