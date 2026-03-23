interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function PageWrapper({ title, subtitle, children }: Props) {
  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto w-full">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 mt-1 text-xs md:text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
