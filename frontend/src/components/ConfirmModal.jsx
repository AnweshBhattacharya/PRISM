/**
 * components/ConfirmModal.jsx
 * "Is this you?" confirmation dialog for low-confidence face matches.
 * Shown when Rekognition confidence is between 60-80%.
 */
export default function ConfirmModal({ photo, onConfirm, onDeny, onClose }) {
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-6 max-w-sm w-full space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">Is this you? 🤔</h2>
          <p className="text-sm text-white/50">
            We're {Math.round(photo.confidence)}% confident. Help us confirm.
          </p>
        </div>

        {/* Photo preview */}
        <div className="rounded-xl overflow-hidden aspect-video">
          <img
            src={photo.url}
            alt="Possible match"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Match confidence</span>
            <span>{Math.round(photo.confidence)}%</span>
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
            onClick={() => onDeny(photo)}
            className="btn-secondary flex-1 py-2.5"
            id="confirm-modal-no"
          >
            ✗ Not me
          </button>
          <button
            onClick={() => onConfirm(photo)}
            className="btn-primary flex-1 py-2.5"
            id="confirm-modal-yes"
          >
            ✓ Yes, that's me
          </button>
        </div>
      </div>
    </div>
  )
}
