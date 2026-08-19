import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { primaryNavigation, type NavigationItem } from '../../config/navigation'

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const isActive = (item: NavigationItem) =>
    item.activePrefix === '/'
      ? pathname === '/'
      : pathname.startsWith(item.activePrefix)

  const renderLink = (item: NavigationItem) => {
    const Icon = item.icon
    const active = isActive(item)

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={`flex h-10 items-center gap-3 rounded-lg border px-3 text-sm transition-colors ${
          active
            ? item.featured
              ? 'border-amber-400/70 bg-gradient-to-r from-amber-500/25 to-orange-500/10 font-semibold text-amber-100 shadow-sm shadow-amber-950/40'
              : 'border-transparent bg-brand-700 text-white font-medium'
            : item.featured
              ? 'border-amber-500/35 bg-amber-950/30 font-medium text-amber-200 hover:border-amber-400/60 hover:bg-amber-950/50'
              : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-100'
        }`}
      >
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto rounded-full border border-amber-500/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-300">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 hover:text-white p-1"
          aria-label="Open menu"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <span className="text-brand-500 font-bold text-sm">GARYS</span>
          <span className="text-gray-500 text-sm ml-1">Fantasy</span>
        </div>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 bg-gray-900 border-r border-gray-800 flex flex-col py-5 px-3 shrink-0
          h-screen overflow-y-auto transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="mb-6 px-3 flex items-center justify-between">
          <div>
            <div className="text-brand-500 font-bold text-lg leading-tight">GARYS</div>
            <div className="text-gray-400 text-sm">Fantasy Dashboard</div>
          </div>
          <button
            className="md:hidden text-gray-500 hover:text-white p-1"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex flex-col gap-1">
          {primaryNavigation.map(renderLink)}
        </nav>
      </aside>
    </>
  )
}
