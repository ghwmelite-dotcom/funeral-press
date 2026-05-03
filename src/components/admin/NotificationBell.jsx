import { useEffect, useState, useRef } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import useNotificationStore from '../../stores/notificationStore'

const TYPE_LABELS = {
  signup: 'Signup',
  payment: 'Payment',
  print_order: 'Print Order',
  partner_app: 'Partner',
  guest_book_sign: 'Guest Book',
  memorial_created: 'Memorial',
  live_service_created: 'Live Service',
  design_saved: 'Design',
  image_uploaded: 'Image',
  obituary_created: 'Obituary',
  gallery_created: 'Gallery',
  brochure_shared: 'Share',
  referral_tracked: 'Referral',
}

const TYPE_COLORS = {
  signup: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  payment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  print_order: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  partner_app: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  guest_book_sign: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  memorial_created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  live_service_created: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllRead, filter, setFilter } = useNotificationStore()

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(() => fetchNotifications(), 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const formatTime = (ts) => {
    const d = new Date(ts + 'Z')
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 max-h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setFilter('')}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap ${!filter ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              All
            </button>
            {['signup', 'payment', 'print_order', 'partner_app', 'memorial_created'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-2 py-1 rounded text-xs whitespace-nowrap ${filter === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-3 border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      </div>
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatTime(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
