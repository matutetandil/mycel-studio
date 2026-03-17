import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  separator?: boolean
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null)

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

        // Item with submenu
        if (item.submenu) {
          return (
            <SubmenuItem
              key={i}
              item={item}
              isOpen={openSubmenu === i}
              onOpen={() => setOpenSubmenu(i)}
              onClose={() => setOpenSubmenu(null)}
              onCloseAll={onClose}
            />
          )
        }

        return (
          <button
            key={i}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            onMouseEnter={() => setOpenSubmenu(null)}
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

function SubmenuItem({
  item,
  isOpen,
  onOpen,
  onClose: _onClose,
  onCloseAll,
}: {
  item: ContextMenuItem
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onCloseAll: () => void
}) {
  const itemRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [submenuPos, setSubmenuPos] = useState<{ left: number; top: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect()
      let left = rect.right + 2
      const top = rect.top

      // Flip to left if overflowing
      if (left + 200 > window.innerWidth) {
        left = rect.left - 200 - 2
      }

      setSubmenuPos({ left, top })
    }
  }, [isOpen])

  // Focus search input when submenu opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const filteredItems = item.submenu?.filter(sub =>
    !searchQuery || sub.label.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Show search if submenu has many items
  const showSearch = (item.submenu?.length || 0) > 10

  return (
    <div
      ref={itemRef}
      onMouseEnter={onOpen}
      className="relative"
    >
      <div
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-700 cursor-default"
      >
        {item.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>}
        <span className="flex-1">{item.label}</span>
        <ChevronRight className="w-3 h-3 text-neutral-500" />
      </div>

      {isOpen && submenuPos && (
        <div
          ref={submenuRef}
          className="fixed z-[10000] min-w-[180px] max-h-[320px] bg-neutral-800 border border-neutral-700 rounded-md shadow-xl py-1 text-sm flex flex-col"
          style={{ left: submenuPos.left, top: submenuPos.top }}
        >
          {showSearch && (
            <div className="px-2 py-1 border-b border-neutral-700">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter..."
                className="w-full bg-neutral-900 text-neutral-300 text-xs px-2 py-1 rounded border border-neutral-600 outline-none placeholder-neutral-600"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1">
            {filteredItems.map((sub, j) => {
              if (sub.separator) {
                return <div key={j} className="border-t border-neutral-700 my-1" />
              }
              return (
                <button
                  key={j}
                  onClick={() => {
                    sub.onClick()
                    onCloseAll()
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-1.5 text-left
                    ${sub.danger
                      ? 'text-red-400 hover:bg-red-900/30'
                      : 'text-neutral-300 hover:bg-neutral-700'}
                  `}
                >
                  {sub.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{sub.icon}</span>}
                  <span>{sub.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
