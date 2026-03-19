import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message?: string
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>
  dismissable?: boolean
  autoHide?: number
  timestamp: number
}

interface NotificationState {
  notifications: Notification[]
  expandedId: string | null
  showPopup: boolean

  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  clearAll: () => void
  setExpandedId: (id: string | null) => void
  togglePopup: () => void
}

let counter = 0

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  expandedId: null,
  showPopup: false,

  addNotification: (n) => {
    const id = `notif-${++counter}-${Date.now()}`
    const notification: Notification = {
      ...n,
      id,
      timestamp: Date.now(),
      dismissable: n.dismissable ?? true,
    }

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
    }))

    // Auto-hide timer
    if (n.autoHide && n.autoHide > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, n.autoHide)
    }

    return id
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      expandedId: state.expandedId === id ? null : state.expandedId,
    })),

  clearAll: () =>
    set({ notifications: [], expandedId: null, showPopup: false }),

  setExpandedId: (id) => set({ expandedId: id }),

  togglePopup: () =>
    set((state) => ({ showPopup: !state.showPopup })),
}))
