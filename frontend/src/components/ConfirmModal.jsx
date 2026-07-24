/**
 * components/ConfirmModal.jsx
 * RawBlock v2 — "Is this you?" confirmation dialog for low-confidence face matches.
 * Shown when Rekognition confidence is between 60-80%.
 */
export default function ConfirmModal({ photo, onConfirm, onDeny, onClose }) {
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={onClose}
    >
      <div
        className="raw-card modal max-w-sm w-full space-y-5 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-display font-bold uppercase tracking-tight text-xl text-fg">
            Is this you?
          </h2>
          <p className="font-mono text-xs text-muted uppercase tracking-wide">
            {Math.round(photo.confidence)}% confidence — help us confirm
          </p>
        </div>

        {/* Photo preview */}
        <div className="overflow-hidden border border-line" style={{ aspectRatio: '16/9' }}>
          <img
            src={photo.url}
            alt="Possible match"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-xs text-faint uppercase tracking-wide">Match confidence</span>
            <span className="font-mono text-xs text-fg">{Math.round(photo.confidence)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${photo.confidence}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            id="confirm-modal-no"
            onClick={() => onDeny(photo)}
            className="raw-btn flex-1 border-danger text-danger"
            style={{ borderColor: 'rgb(var(--danger))', color: 'rgb(var(--danger))' }}
          >
            ✗ Not me
          </button>
          <button
            id="confirm-modal-yes"
            onClick={() => onConfirm(photo)}
            className="raw-btn raw-btn-accent flex-1"
          >
            ✓ Yes, that's me
          </button>
        </div>
      </div>
    </div>
  )
}
