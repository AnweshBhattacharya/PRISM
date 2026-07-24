/**
 * components/PhotoCard.jsx
 * Displays a single matched photo with optional download button.
 * Shows a "Is this you?" badge for low-confidence matches.
 */
export default function PhotoCard({ photo, allowDownload, onConfirm }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `eventsnap-${photo.photoId}.jpg`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-hover aspect-square animate-fade-in">
      {/* ── Photo ─────────────────────────────── */}
      <img
        src={photo.url}
        alt="Matched event photo"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      {/* ── Overlay on hover ──────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      flex flex-col justify-end p-3 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">
            {Math.round(photo.confidence)}% match
          </span>
          {allowDownload && (
            <button
              onClick={handleDownload}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg transition-colors"
              aria-label="Download photo"
            >
              ⬇ Save
            </button>
          )}
        </div>
      </div>

      {/* ── "Is this you?" badge ──────────────── */}
      {photo.needs_confirmation && (
        <div className="absolute top-2 left-2 right-2">
          <button
            onClick={() => onConfirm?.(photo)}
            className="w-full text-xs bg-yellow-500/90 hover:bg-yellow-400 text-black font-semibold
                       px-2 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
          >
            🤔 Is this you?
          </button>
        </div>
      )}

      {/* ── Confidence pill ───────────────────── */}
      {!photo.needs_confirmation && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-green-500/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            ✓ {Math.round(photo.confidence)}%
          </span>
        </div>
      )}
    </div>
  )
}
