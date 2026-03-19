import { useEffect, useState } from 'react'
import { Info, AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useNotificationStore } from '../stores/useNotificationStore'

const typeConfig = {
  info:    { icon: Info,          color: 'text-blue-400',  dot: 'bg-blue-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', dot: 'bg-amber-400' },
  error:   { icon: AlertCircle,   color: 'text-red-400',   dot: 'bg-red-400' },
  success: { icon: CheckCircle,   color: 'text-green-400', dot: 'bg-green-400' },
}

export default function NotificationToast() {
  const notifications = useNotificationStore((s) => s.notifications)
  const removeNotification = useNotificationStore((s) => s.removeNotification)
  const togglePopup = useNotificationStore((s) => s.togglePopup)
  const latest = notifications[0] ?? null

  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)

  useEffect(() => {
    if (latest && latest.id !== currentId) {
      setCurrentId(latest.id)
      // Trigger enter animation
      setVisible(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else if (!latest) {
      setVisible(false)
      setCurrentId(null)
    }
  }, [latest, currentId])

  if (!latest) return null

  const cfg = typeConfig[latest.type]
  const Icon = cfg.icon

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setVisible(false)
    setTimeout(() => removeNotification(latest.id), 200)
  }

  const handleClick = () => {
    togglePopup()
  }

  return (
    <div
      className={`fixed bottom-8 right-4 z-[9999] w-[380px] transition-all duration-200 ease-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        <div className="flex items-start gap-2.5 p-3 pr-8 relative">
          {/* Type icon */}
          <div className={`shrink-0 mt-0.5 ${cfg.color}`}>
            <Icon className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-200 leading-tight">
              {latest.title}
            </p>
            {latest.message && (
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug line-clamp-2">
                {latest.message}
              </p>
            )}

            {/* Action buttons */}
            {latest.actions && latest.actions.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {latest.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      action.onClick()
                    }}
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

          {/* Dismiss button */}
          {latest.dismissable !== false && (
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-0.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
