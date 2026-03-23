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
  { to: '/sync', label: 'Sync Data', icon: '🔄' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 shrink-0">
      <div className="mb-8 px-3">
        <div className="text-brand-500 font-bold text-lg leading-tight">Fantasy</div>
        <div className="text-gray-400 text-sm">Dashboard</div>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
    </aside>
  )
}
