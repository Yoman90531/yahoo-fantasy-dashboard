import { createContext, useContext } from 'react'

type DataScope = 'regular' | 'playoffs' | 'all'

interface Props {
  title: string
  subtitle?: string
  dataScope?: DataScope
  children: React.ReactNode
}

const scopeLabels: Record<DataScope, { label: string; color: string }> = {
  regular: { label: 'Regular Season Only', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
  playoffs: { label: 'Includes Playoffs', color: 'bg-purple-900/50 text-purple-300 border-purple-800' },
  all: { label: 'All Games', color: 'bg-gray-800/50 text-gray-300 border-gray-700' },
}

const HubContentContext = createContext(false)

export function HubContent({ children }: { children: React.ReactNode }) {
  return <HubContentContext.Provider value>{children}</HubContentContext.Provider>
}

export default function PageWrapper({ title, subtitle, dataScope, children }: Props) {
  const isHubContent = useContext(HubContentContext)

  if (isHubContent) {
    return (
      <section aria-labelledby={`section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2
              id={`section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="text-lg md:text-xl font-bold text-white"
            >
              {title}
            </h2>
            {dataScope && (
              <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full border ${scopeLabels[dataScope].color}`}>
                {scopeLabels[dataScope].label}
              </span>
            )}
          </div>
          {subtitle && <p className="text-gray-400 mt-1 text-xs md:text-sm">{subtitle}</p>}
        </div>
        {children}
      </section>
    )
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto w-full">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
          {dataScope && (
            <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full border ${scopeLabels[dataScope].color}`}>
              {scopeLabels[dataScope].label}
            </span>
          )}
        </div>
        {subtitle && <p className="text-gray-400 mt-1 text-xs md:text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
