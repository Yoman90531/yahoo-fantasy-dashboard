import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/seasons', label: 'Seasons', icon: '📅' },
  { to: '/alltime', label: 'All-Time Stats', icon: '📊' },
  { to: '/headtohead', label: 'Head-to-Head', icon: '⚔️' },
  { to: '/weekly-records', label: 'Weekly Records', icon: '🏆' },
  { to: '/luck-index', label: 'Luck Index', icon: '🎲' },
  { to: '/power-rankings', label: 'Power Rankings', icon: '👑' },
  { to: '/throne-tracker', label: 'Throne Tracker', icon: '🏰' },
  { to: '/awards', label: 'Awards', icon: '🏅' },
  { to: '/scoring-distribution', label: 'Score Distribution', icon: '📦' },
  { to: '/weekly-finish', label: 'Weekly Finishes', icon: '📈' },
  { to: '/manager-eras', label: 'Manager Eras', icon: '🕰️' },
  { to: '/projections', label: 'Projections', icon: '🎯' },
  { to: '/sync', label: 'Sync Data', icon: '🔄' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  // Close drawer on navigation
  const handleNav = () => setOpen(false)

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          onClick={handleNav}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-700 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
            }`
          }
        >
          <span>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 hover:text-white p-1 rounded"
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="5" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="10" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="15" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <div>
          <span className="text-brand-500 font-bold text-sm">Fantasy</span>
          <span className="text-gray-500 text-sm ml-1">Dashboard</span>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel — drawer on mobile, static on desktop */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 shrink-0
          min-h-screen transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Desktop logo / mobile close row */}
        <div className="mb-8 px-3 flex items-center justify-between">
          <div>
            <div className="text-brand-500 font-bold text-lg leading-tight">Fantasy</div>
            <div className="text-gray-400 text-sm">Dashboard</div>
          </div>
          <button
            className="md:hidden text-gray-500 hover:text-white p-1 rounded"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {nav}
      </aside>
    </>
  )
}
