export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-950 border border-red-800 text-red-300 px-5 py-4 text-sm">
      Error: {message}
    </div>
  )
}
