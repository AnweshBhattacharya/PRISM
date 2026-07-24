/**
 * pages/GuestUpload.jsx
 * Allows guests to upload photos directly to S3 via pre-signed POST URLs.
 * Uses the useUpload hook for the hashing + upload pipeline.
 */
import { useParams, Navigate } from 'react-router-dom'
import { useGuest } from '../context/AuthContext'
import UploadZone from '../components/UploadZone'
import { useUpload } from '../hooks/useUpload'

export default function GuestUpload() {
  const { roomId }      = useParams()
  const { guestSession } = useGuest()
  const { uploads, uploadFiles: handleFiles } = useUpload()

  // Redirect if no valid guest session
  if (!guestSession || guestSession.roomId !== roomId) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 page-enter">
      {/* Header */}
      <div className="mb-8 space-y-1">
        <h1 className="text-3xl font-bold text-white">Upload Photos</h1>
        <p className="text-white/50 text-sm">
          Room: <span className="text-accent-400 font-mono">{guestSession.roomName || roomId}</span>
          {guestSession.expiryDate && (
            <span className="ml-3 text-white/30">
              · Expires {new Date(guestSession.expiryDate).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>

      {/* Stats bar */}
      {uploads.length > 0 && (
        <div className="glass rounded-xl p-4 mb-6 grid grid-cols-3 gap-4 text-center text-sm">
          {[
            { label: 'Total',     value: uploads.length,                            color: 'text-white' },
            { label: 'Uploaded',  value: uploads.filter(u => u.status === 'done').length,      color: 'text-green-400' },
            { label: 'Failed',    value: uploads.filter(u => u.status === 'error').length,     color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-white/40 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div className="glass rounded-2xl p-6">
        <UploadZone uploads={uploads} onFilesSelected={handleFiles} />
      </div>

      {/* Privacy note */}
      <p className="text-center text-xs text-white/30 mt-6">
        Photos are automatically deleted when the room expires. 
        Your data is stored securely on AWS S3.
      </p>
    </div>
  )
}
