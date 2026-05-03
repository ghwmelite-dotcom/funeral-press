import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { useAdminStore } from '../../stores/adminStore'

const PAYMENT_BADGE = {
  success: 'bg-emerald-500/10 text-emerald-500',
  pending: 'bg-amber-500/10 text-amber-500',
  failed: 'bg-red-500/10 text-red-500',
}

const FULFILLMENT_BADGE = {
  pending: 'bg-amber-500/10 text-amber-500',
  sent_to_printer: 'bg-blue-500/10 text-blue-500',
  printing: 'bg-indigo-500/10 text-indigo-500',
  out_for_delivery: 'bg-cyan-500/10 text-cyan-500',
  delivered: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-red-500/10 text-red-500',
}

const FULFILLMENT_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent_to_printer', label: 'Sent to Printer' },
  { value: 'printing', label: 'Printing' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

function formatLabel(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function PrintOrdersTab() {
  const { printOrders, fetchPrintOrders, updatePrintOrder, isLoading } = useAdminStore()
  const [fulfillment, setFulfillment] = useState('all')
  const [payment, setPayment] = useState('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const [editingNotes, setEditingNotes] = useState({})
  const [editingRef, setEditingRef] = useState({})
  const [editingDelivery, setEditingDelivery] = useState({})
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    fetchPrintOrders({ fulfillment, payment, page, per_page: 20 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillment, payment, page])

  const handleFilter = (setter) => (val) => {
    setter(val)
    setPage(1)
  }

  const formatGHS = (pesewas) => `GHS ${(pesewas / 100).toFixed(2)}`

  const handleStatusUpdate = async (orderId, newStatus) => {
    await updatePrintOrder(orderId, { fulfillment_status: newStatus })
  }

  const handleSaveNotes = async (orderId) => {
    await updatePrintOrder(orderId, { admin_notes: editingNotes[orderId] })
  }

  const handleSaveRef = async (orderId) => {
    await updatePrintOrder(orderId, { printer_reference: editingRef[orderId] })
  }

  const handleSaveDelivery = async (orderId) => {
    await updatePrintOrder(orderId, { estimated_delivery: editingDelivery[orderId] })
  }

  const copyForPrinter = (order) => {
    const text = [
      `ORDER: ${order.id.slice(0, 8)}`,
      `Product: ${order.product_type} ${order.print_size || ''} (${order.paper_quality})`,
      `Quantity: ${order.quantity}`,
      `Design: ${order.design_name}`,
      `---`,
      `Deliver to: ${order.recipient_name}`,
      `Phone: ${order.recipient_phone}`,
      `Region: ${formatLabel(order.delivery_region)}`,
      `City: ${order.delivery_city}`,
      order.delivery_area ? `Area: ${order.delivery_area}` : null,
      order.delivery_landmark ? `Landmark: ${order.delivery_landmark}` : null,
      `---`,
      `Total: ${formatGHS(order.total_pesewas)}`,
      `Payment: ${order.payment_status}`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text)
    setCopied(order.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fulfillment</label>
          <div className="flex gap-1 flex-wrap">
            {['all', 'pending', 'sent_to_printer', 'printing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => handleFilter(setFulfillment)(s)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  fulfillment === s ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {s === 'all' ? 'All' : formatLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Payment</label>
          <div className="flex gap-1">
            {['all', 'success', 'pending', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => handleFilter(setPayment)(s)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
                  payment === s ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {s}
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
                <th className="w-8 px-2"></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Product</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Payment</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Fulfillment</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {printOrders.data.map(order => (
                <>
                  <tr
                    key={order.id}
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-2">
                      {expandedId === order.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">{order.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="min-w-0">
                        <p className="text-foreground text-sm truncate">{order.user_name || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{order.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize font-medium text-foreground">{order.product_type}</span>
                      <span className="block text-[10px] text-muted-foreground">{order.print_size && `${order.print_size} · `}{order.paper_quality}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-foreground">{order.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatGHS(order.total_pesewas)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[order.payment_status] || 'bg-muted text-muted-foreground'}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${FULFILLMENT_BADGE[order.fulfillment_status] || 'bg-muted text-muted-foreground'}`}>
                        {formatLabel(order.fulfillment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr key={`${order.id}-detail`} className="border-b border-border bg-muted/20">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Delivery info */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Delivery</p>
                            <div className="space-y-1 text-muted-foreground">
                              <p><span className="text-foreground font-medium">{order.recipient_name}</span></p>
                              <p
                                className="cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.recipient_phone); setCopied(`phone-${order.id}`); setTimeout(() => setCopied(null), 2000) }}
                              >
                                {order.recipient_phone}
                                {copied === `phone-${order.id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </p>
                              <p>{formatLabel(order.delivery_region)}, {order.delivery_city}</p>
                              {order.delivery_area && <p>Area: {order.delivery_area}</p>}
                              {order.delivery_landmark && <p>Landmark: {order.delivery_landmark}</p>}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyForPrinter(order) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors mt-2"
                            >
                              {copied === order.id ? <Check size={12} /> : <Copy size={12} />}
                              {copied === order.id ? 'Copied!' : 'Copy for Printer'}
                            </button>
                          </div>

                          {/* Admin controls */}
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">Status</label>
                              <select
                                value={order.fulfillment_status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                              >
                                {FULFILLMENT_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">Printer Reference</label>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editingRef[order.id] ?? order.printer_reference ?? ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditingRef(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  placeholder="e.g. JOB-001"
                                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveRef(order.id) }}
                                  className="px-2 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">Estimated Delivery</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={editingDelivery[order.id] ?? order.estimated_delivery ?? ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditingDelivery(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveDelivery(order.id) }}
                                  className="px-2 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">Admin Notes</label>
                              <div className="flex gap-1">
                                <textarea
                                  value={editingNotes[order.id] ?? order.admin_notes ?? ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditingNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  rows={2}
                                  placeholder="Internal notes..."
                                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveNotes(order.id) }}
                                  className="px-2 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 self-end"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {printOrders.data.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No print orders found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {printOrders.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {printOrders.total} order{printOrders.total !== 1 ? 's' : ''} total
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
              {page} / {printOrders.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(printOrders.totalPages, p + 1))}
              disabled={page >= printOrders.totalPages}
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
