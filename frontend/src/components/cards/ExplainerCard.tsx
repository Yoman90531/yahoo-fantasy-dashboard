interface Props {
  title?: string
  children: React.ReactNode
}

export default function ExplainerCard({ title = 'How it works', children }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400">
      <span className="text-gray-200 font-medium">{title}: </span>
      {children}
    </div>
  )
}
