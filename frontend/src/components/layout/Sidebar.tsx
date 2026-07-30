import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  BookOpen,
  ClipboardList,
  Crown,
  Dices,
  House,
  Menu,
  Medal,
  Swords,
  X,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  activePrefix: string
  icon: LucideIcon
}

const primaryNavigation: NavItem[] = [
  { to: '/', label: 'League HQ', activePrefix: '/', icon: House },
  { to: '/seasons/archive', label: 'Season Vault', activePrefix: '/seasons', icon: Archive },
  { to: '/managers/all-time', label: 'Manager Rankings', activePrefix: '/managers', icon: Crown },
  { to: '/rivalries', label: 'Rivalries', activePrefix: '/rivalries', icon: Swords },
  { to: '/record-book/weekly', label: 'Record Book', activePrefix: '/record-book', icon: BookOpen },
  { to: '/scoring/trends', label: 'Scoring Lab', activePrefix: '/scoring', icon: BarChart3 },
  { to: '/luck-schedule/luck', label: 'Luck & Schedule', activePrefix: '/luck-schedule', icon: Dices },
  { to: '/postseason/playoffs', label: 'Postseason', activePrefix: '/postseason', icon: Medal },
  { to: '/draft/analysis', label: 'Draft Room', activePrefix: '/draft', icon: ClipboardList },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const isActive = (item: NavItem) =>
    item.activePrefix === '/'
      ? pathname === '/'
      : pathname.startsWith(item.activePrefix)

  const renderLink = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(item)

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={`flex h-10 items-center gap-3 px-3 text-sm transition-colors ${
          active
            ? 'bg-brand-700 text-white font-medium'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
        }`}
      >
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>{item.label}</span>
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
