/** components/LoadingSpinner.jsx — Reusable animated spinner */
export default function LoadingSpinner({ size = 'md', label }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size]} rounded-full border-white/10 border-t-brand-500 animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {label && <p className="text-sm text-white/50 animate-pulse">{label}</p>}
    </div>
  )
}
