export default function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-gray-500">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mr-3" />
      {label}
    </div>
  )
}
