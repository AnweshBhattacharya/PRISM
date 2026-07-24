/**
 * pages/GuestUpload.jsx
 * RawBlock v2 — Allows guests to upload photos via pre-signed POST URLs.
 * Stats bar + UploadZone with list-row file progress.
 */
import { useParams, Navigate } from 'react-router-dom'
import { useGuest } from '../context/AuthContext'
import UploadZone from '../components/UploadZone'
import { useUpload } from '../hooks/useUpload'

export default function GuestUpload() {
  const { roomId }       = useParams()
  const { guestSession } = useGuest()
  const { uploads, uploadFiles: handleFiles } = useUpload()

  // Redirect if no valid guest session
  if (!guestSession || guestSession.roomId !== roomId) {
    return <Navigate to="/" replace />
  }

  const total    = uploads.length
  const uploaded = uploads.filter((u) => u.status === 'done').length
  const failed   = uploads.filter((u) => u.status === 'error').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-slide-up">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1
          className="font-display font-bold uppercase tracking-tight text-fg"
          style={{ fontSize: 'clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem)', lineHeight: 1.05 }}
        >
          Upload Photos
        </h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="font-mono text-xs text-faint uppercase tracking-wide">Room:</span>
          <span className="font-mono text-xs text-fg">{guestSession.roomName || roomId}</span>
          {guestSession.expiryDate && (
            <>
              <span className="font-mono text-xs text-faint">·</span>
              <span className="font-mono text-xs text-faint">
                Expires {new Date(guestSession.expiryDate).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Stats bar (shown when uploads exist) ── */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-0 border border-line mb-6">
          {[
            { label: 'TOTAL',    value: total,    valueColor: 'rgb(var(--fg))' },
            { label: 'UPLOADED', value: uploaded, valueColor: 'rgb(var(--success))' },
            { label: 'FAILED',   value: failed,   valueColor: 'rgb(var(--danger))' },
          ].map(({ label, value, valueColor }, i) => (
            <div
              key={label}
              className="raw-card !shadow-none text-center py-4"
              style={{
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: i === 0 ? 'none' : undefined,
                borderRight: i === 2 ? 'none' : undefined,
              }}
            >
              <p
                className="font-mono font-bold text-2xl"
                style={{ color: valueColor }}
              >
                {value}
              </p>
              <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Zone ── */}
      <UploadZone uploads={uploads} onFilesSelected={handleFiles} />

      {/* ── Privacy note ── */}
      <p className="font-mono text-xs text-faint text-center mt-6 uppercase tracking-wide">
        Photos are automatically deleted when the room expires.
        Stored securely on AWS S3.
      </p>
    </div>
  )
}
