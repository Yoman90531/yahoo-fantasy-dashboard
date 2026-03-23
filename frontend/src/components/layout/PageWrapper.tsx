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

export default function PageWrapper({ title, subtitle, dataScope, children }: Props) {
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
