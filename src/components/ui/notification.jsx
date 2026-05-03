import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

const NotificationContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const idRef = useRef(0)

  const notify = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {/* Toast container - fixed bottom-right */}
      <div className="fixed bottom-20 sm:bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map((n) => (
          <div key={n.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm animate-notification-in
              ${n.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : ''}
              ${n.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' : ''}
              ${n.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' : ''}
              ${n.type === 'info' ? 'bg-card border-border text-foreground' : ''}
            `}>
            {/* Icon based on type */}
            {n.type === 'success' && <CheckCircle size={16} />}
            {n.type === 'error' && <AlertCircle size={16} />}
            {n.type === 'warning' && <AlertTriangle size={16} />}
            {n.type === 'info' && <Info size={16} />}
            <span className="flex-1">{n.message}</span>
            <button onClick={() => dismiss(n.id)} className="text-current opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
