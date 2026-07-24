/**
 * components/PhotoCard.jsx
 * RawBlock v2 — square card with hard shadow, confidence tag, hover-reveal actions.
 * Shows a "Is this you?" button for low-confidence matches.
 */
export default function PhotoCard({ photo, allowDownload, onConfirm }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `prism-${photo.photoId}.jpg`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  return (
    <div className="group relative raw-card !p-0 overflow-hidden animate-fade-in" style={{ aspectRatio: '1 / 1' }}>
      {/* ── Photo ─────────────────────────────── */}
      <img
        src={photo.url}
        alt="Matched event photo"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />

      {/* ── Confidence tag — top right ────────── */}
      {!photo.needs_confirmation && (
        <div className="absolute top-2 right-2">
          <span
            className="raw-tag text-xs"
            style={{
              background: 'rgb(var(--success) / 0.9)',
              borderColor: 'rgb(var(--success))',
              color: 'rgb(var(--surface))',
            }}
          >
            ✓ {Math.round(photo.confidence)}%
          </span>
        </div>
      )}

      {/* ── "Is this you?" banner — top ───────── */}
      {photo.needs_confirmation && (
        <div className="absolute top-0 left-0 right-0">
          <button
            onClick={() => onConfirm?.(photo)}
            className="raw-btn w-full text-xs !min-h-0 !py-1.5 !px-2"
            style={{
              borderColor: 'rgb(var(--warn))',
              color: 'rgb(var(--warn))',
              background: 'rgb(var(--surface) / 0.95)',
              boxShadow: 'none',
            }}
          >
            ? Is this you? — {Math.round(photo.confidence)}%
          </button>
        </div>
      )}

      {/* ── Hover overlay: Download button ────── */}
      {allowDownload && (
        <div
          className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100
                     transition-opacity duration-200 p-2"
          style={{ background: 'rgb(var(--fg) / 0.7)' }}
        >
          <button
            onClick={handleDownload}
            className="raw-btn w-full text-xs !min-h-0 !py-1 !px-2"
            style={{
              background: 'rgb(var(--surface))',
              color: 'rgb(var(--fg))',
              boxShadow: 'none',
            }}
            aria-label="Download photo"
          >
            ⬇ Save
          </button>
        </div>
      )}
    </div>
  )
}
