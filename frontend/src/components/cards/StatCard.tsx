interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export default function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div className={`rounded-xl p-3 md:p-5 border ${accent ? 'bg-brand-900 border-brand-700' : 'bg-gray-900 border-gray-800'}`}>
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 leading-tight">{label}</div>
      <div className={`text-lg md:text-2xl font-bold leading-tight ${accent ? 'text-brand-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1 leading-tight">{sub}</div>}
    </div>
  )
}
