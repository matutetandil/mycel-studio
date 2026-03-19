import { useEffect, useRef } from 'react'
import { Info, AlertTriangle, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useNotificationStore, type Notification } from '../stores/useNotificationStore'

const typeConfig = {
  info:    { icon: Info,          color: 'text-blue-400',  bg: 'bg-blue-400/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  error:   { icon: AlertCircle,   color: 'text-red-400',   bg: 'bg-red-400/10' },
  success: { icon: CheckCircle,   color: 'text-green-400', bg: 'bg-green-400/10' },
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function NotificationItem({ notification }: { notification: Notification }) {
  const removeNotification = useNotificationStore((s) => s.removeNotification)
  const cfg = typeConfig[notification.type]
  const Icon = cfg.icon

  return (
    <div className={`flex items-start gap-2.5 p-3 border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/50 ${cfg.bg}`}>
      <div className={`shrink-0 mt-0.5 ${cfg.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-neutral-200 leading-tight truncate">
            {notification.title}
          </p>
          <span className="text-[10px] text-neutral-500 whitespace-nowrap shrink-0">
            {timeAgo(notification.timestamp)}
          </span>
        </div>
        {notification.message && (
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
            {notification.message}
          </p>
        )}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            {notification.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick()}
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  action.primary
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {notification.dismissable !== false && (
        <button
          onClick={() => removeNotification(notification.id)}
          className="shrink-0 p-0.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-neutral-300"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default function NotificationPopup() {
  const showPopup = useNotificationStore((s) => s.showPopup)
  const notifications = useNotificationStore((s) => s.notifications)
  const clearAll = useNotificationStore((s) => s.clearAll)
  const togglePopup = useNotificationStore((s) => s.togglePopup)
  const expandedId = useNotificationStore((s) => s.expandedId)
  const setExpandedId = useNotificationStore((s) => s.setExpandedId)
  const popupRef = useRef<HTMLDivElement>(null)

  // Navigate to a specific notification by index
  const currentIndex = expandedId
    ? notifications.findIndex((n) => n.id === expandedId)
    : 0
  const safeIndex = currentIndex >= 0 ? currentIndex : 0

  const goPrev = () => {
    if (safeIndex > 0) {
      setExpandedId(notifications[safeIndex - 1].id)
    }
  }
  const goNext = () => {
    if (safeIndex < notifications.length - 1) {
      setExpandedId(notifications[safeIndex + 1].id)
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!showPopup) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        // Check if click is on the bell icon (don't close, togglePopup handles it)
        const target = e.target as HTMLElement
        if (target.closest('[data-notification-bell]')) return
        togglePopup()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') togglePopup()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [showPopup, togglePopup])

  if (!showPopup) return null

  return (
    <div
      ref={popupRef}
      className="fixed bottom-8 right-4 z-[9998] w-[400px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 bg-neutral-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-200">Notifications</span>
          {notifications.length > 0 && (
            <span className="text-[10px] text-neutral-500">
              {safeIndex + 1} / {notifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            disabled={safeIndex <= 0}
            className="p-0.5 hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-default text-neutral-400 hover:text-neutral-200"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goNext}
            disabled={safeIndex >= notifications.length - 1}
            className="p-0.5 hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-default text-neutral-400 hover:text-neutral-200"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-0.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-200 ml-1"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={togglePopup}
            className="p-0.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-200 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))
        )}
      </div>
    </div>
  )
}
