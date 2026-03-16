import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      ref.current.style.left = `${x - rect.width}px`
    }
    if (rect.bottom > window.innerHeight) {
      ref.current.style.top = `${y - rect.height}px`
    }
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[160px] bg-neutral-800 border border-neutral-700 rounded-md shadow-xl py-1 text-sm"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="border-t border-neutral-700 my-1" />
        }
        return (
          <button
            key={i}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={`
              w-full flex items-center gap-2 px-3 py-1.5 text-left
              ${item.danger
                ? 'text-red-400 hover:bg-red-900/30'
                : 'text-neutral-300 hover:bg-neutral-700'}
            `}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
