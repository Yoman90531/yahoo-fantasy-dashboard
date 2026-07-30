import { NavLink, Outlet } from 'react-router-dom'
import PageWrapper, { HubContent } from './PageWrapper'

export interface HubTab {
  label: string
  to: string
}

interface Props {
  title: string
  subtitle: string
  tabs: HubTab[]
}

export default function HubLayout({ title, subtitle, tabs }: Props) {
  return (
    <PageWrapper title={title} subtitle={subtitle}>
      <nav
        aria-label={`${title} views`}
        className="no-scrollbar mb-6 overflow-x-auto border-b border-gray-800"
      >
        <div className="flex min-w-max gap-1">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-brand-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-200'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <HubContent>
        <Outlet />
      </HubContent>
    </PageWrapper>
  )
}
