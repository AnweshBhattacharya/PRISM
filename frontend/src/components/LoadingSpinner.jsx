/**
 * components/LoadingSpinner.jsx
 * RawBlock v2 — no spinners.
 * Uses a blinking mono text indicator instead.
 */
export default function LoadingSpinner({ size = 'md', label }) {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className="flex flex-col items-center gap-2" role="status" aria-label="Loading">
      <span
        className={`font-mono font-bold uppercase tracking-widest text-fg animate-blink ${textSizes[size]}`}
      >
        {label || 'LOADING...'}
      </span>
    </div>
  )
}
