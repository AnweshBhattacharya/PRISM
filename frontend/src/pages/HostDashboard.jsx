/**
 * pages/HostDashboard.jsx
 * RawBlock v2 — Protected page showing event rooms for the authenticated host.
 * Rooms displayed as list-row items. Stats in mono font. Hard-shadow cards.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { listRooms, createRoom, deleteRoom, validateRoomCode } from '../services/api'
import { useGuest } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

/* ── Shareable text for a room's Room ID + Access Code ──────────────────
 * Includes the site link so a copy-pasted message is immediately useful
 * to a guest, not just a bare code with no idea where to enter it. */
function buildShareText({ roomId, accessCode, roomName }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return [
    roomName ? `${roomName} — Prism photo room` : 'Prism photo room',
    origin,
    `Room ID: ${roomId}`,
    `Access Code: ${accessCode}`,
  ].join('\n')
}

/* ── Room ID + Access Code, combined into one box with a copy button ───
 * Used both right after room creation and in the room list's "Share"
 * panel, so the two places that show this information stay consistent. */
function AccessCodeBox({ roomId, accessCode, roomName }) {
  const [justCopied, setJustCopied] = useState(false)

  const handleCopy = async () => {
    const text = buildShareText({ roomId, accessCode, roomName })
    try {
      await navigator.clipboard.writeText(text)
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 2000)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }

  return (
    <div className="border border-line flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="font-mono text-xs text-faint uppercase tracking-wide truncate">
          {roomId}
        </p>
        <p
          className="font-mono font-bold text-fg"
          style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', letterSpacing: '0.18em' }}
        >
          {accessCode}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="raw-btn raw-btn-accent !px-3 !py-2 text-xs flex-shrink-0 focus-ticks
                   transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
      >
        {justCopied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}

/* ── Create Room Modal ──────────────────────────────────────────────────── */
function CreateRoomModal({ onClose, onCreated }) {
  const [name,          setName]          = useState('')
  const [expiryDays,    setExpiryDays]    = useState(7)
  const [allowDownload, setAllowDownload] = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [result,        setResult]        = useState(null)
  const [error,         setError]         = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await createRoom(name, expiryDays, allowDownload)
      setResult(data)
      onCreated()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={onClose}
    >
      <div
        className="raw-card modal max-w-md w-full animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {!result ? (
          <>
            {/* Form */}
            <h2 className="font-display font-bold uppercase tracking-tight text-xl text-fg mb-6">
              Create Event Room
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="raw-label" htmlFor="room-name">Room Name</label>
                <input
                  id="room-name"
                  type="text"
                  className="raw-input"
                  placeholder="e.g. Priya & Raj Wedding"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="raw-label" htmlFor="expiry-days">
                  Expires in (days)
                </label>
                <input
                  id="expiry-days"
                  type="number"
                  min={1}
                  max={30}
                  className="raw-input font-mono"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                />
              </div>

              {/* Toggle: Allow Downloads */}
              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setAllowDownload((v) => !v)}
                  className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                  style={allowDownload ? {
                    background: 'rgb(var(--accent))',
                    color: 'rgb(var(--accent-fg))',
                    borderColor: 'rgb(var(--accent))',
                  } : {}}
                  aria-pressed={allowDownload}
                >
                  {allowDownload ? 'On' : 'Off'}
                </button>
                <span className="text-sm text-muted">Allow guests to download photos</span>
              </div>

              {error && (
                <p
                  className="font-mono text-xs px-3 py-2 border"
                  style={{
                    color: 'rgb(var(--danger))',
                    borderColor: 'rgb(var(--danger))',
                    background: 'rgb(var(--danger) / 0.05)',
                  }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="raw-btn flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="raw-btn raw-btn-accent flex-1 focus-ticks transition-transform duration-150
                             hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0"
                >
                  {loading ? <LoadingSpinner size="sm" label="CREATING..." /> : 'Create Room'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── Success: Show access code ── */
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold uppercase tracking-tight text-xl text-fg">
                Room Created
              </h2>
              <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">
                Share this with your guests
              </p>
            </div>

            <AccessCodeBox roomId={result.roomId} accessCode={result.accessCode} roomName={name} />

            <p
              className="font-mono text-xs border px-2 py-1.5"
              style={{
                color: 'rgb(var(--warn))',
                borderColor: 'rgb(var(--warn))',
                background: 'rgb(var(--warn) / 0.05)',
              }}
            >
              Note: Save this code — it won't be shown again
            </p>

            <button onClick={onClose} className="raw-btn raw-btn-accent w-full">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────────────────────── */
export default function HostDashboard() {
  const navigate = useNavigate()
  const { loginAsGuest } = useGuest()

  const [rooms,      setRooms]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [shareRoomId, setShareRoomId] = useState(null)
  const [enteringRoomId, setEnteringRoomId] = useState(null)   // "Enter" button loading state
  const [uploadingTestId, setUploadingTestId] = useState(null) // "Upload" button loading state

  const loadRooms = async () => {
    try {
      const data = await listRooms()
      setRooms(data)
    } catch (e) {
      console.error('Failed to load rooms:', e)
    } finally {
      setLoading(false)
    }
  }

  const auth = useAuth()

  // Load rooms once the host auth token is available. This ensures listRooms
  // has the correct authorization header after redirect/login flows.
  useEffect(() => {
    if (auth.isAuthenticated) loadRooms()
  }, [auth.isAuthenticated])

  const handleDeleteConfirm = async (roomId) => {
    setDeletingId(roomId)
    setConfirmDeleteId(null)
    try {
      await deleteRoom(roomId)
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
    } catch (e) {
      console.error('Failed to delete room:', e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleEnterRoom = (room) => {
    if (!room.roomId) {
      console.error('Room ID not available')
      return
    }
    // HostRoomView is a Cognito-protected route (see ProtectedRoute in
    // App.jsx) — the host's existing auth already covers it, no extra
    // session setup needed here.
    navigate(`/dashboard/rooms/${room.roomId}`)
  }

  const handleTestUpload = async (room) => {
    if (!room.roomId || !room.accessCode) {
      console.error('Room ID or access code not available')
      return
    }

    setUploadingTestId(room.roomId)
    try {
      // BUG FIX: the guest upload page (GuestUpload.jsx) is guarded by a
      // real guest session, and its uploads go through the /guest/*
      // endpoints — which require an actual guest JWT, not the host's
      // Cognito token. Simply navigating here (as the old code did) left
      // no guest session in place, so GuestUpload's guard immediately
      // redirected back to Home. As the room owner we already have the
      // access code (room.accessCode, returned by listRooms), so exchange
      // it for a real guest token the same way an actual guest would,
      // store it, and only then navigate.
      const data = await validateRoomCode(room.roomId, room.accessCode)
      loginAsGuest(room.roomId, data)
      navigate(`/room/${room.roomId}/upload`)
    } catch (err) {
      console.error('Failed to open upload view:', err)
      alert('Could not open the upload view. Please try again.')
    } finally {
      setUploadingTestId(null)
    }
  }

  const isExpired = (expiryDate) => new Date(expiryDate) < new Date()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 animate-slide-up">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="font-display font-bold uppercase tracking-tight text-fg"
            style={{ fontSize: 'clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem)', lineHeight: 1.05 }}
          >
            Event Rooms
          </h1>
          <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </p>
          <p className="font-mono text-xs text-faint mt-2">Use "Enter" to view photos; use "Upload" to open the upload page.</p>
        </div>
        <button
          id="create-room-btn"
          onClick={() => setShowCreate(true)}
          className="raw-btn raw-btn-accent focus-ticks transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
        >
          Create Room
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-24 border border-line bg-surface">
          <LoadingSpinner size="lg" label="LOADING ROOMS..." />
        </div>
      ) : rooms.length === 0 ? (
        <div
          className="border border-line bg-surface py-24 text-center"
        >
          <p
            className="font-display font-bold uppercase text-2xl text-fg mb-2"
          >
            No rooms yet
          </p>
          <p className="font-mono text-xs text-faint uppercase tracking-wide">
            Create your first event room to get started
          </p>
        </div>
      ) : (
        <div className="border border-line bg-surface">
          {rooms.map((room) => {
            const expired = isExpired(room.expiryDate)
            const isDeleting = deletingId === room.roomId
            const isConfirming = confirmDeleteId === room.roomId
            const isSharing = shareRoomId === room.roomId

            return (
              <div key={room.roomId} className="list-row flex-wrap gap-y-3 group transition-transform duration-150 hover:-translate-y-1 hover:shadow-sm">
                {/* Room info */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-sans font-semibold text-fg text-sm truncate">
                      {room.name}
                    </span>
                    <span
                      className="raw-tag text-xs"
                      style={expired ? {
                        color: 'rgb(var(--danger))',
                        borderColor: 'rgb(var(--danger))',
                      } : {
                        color: 'rgb(var(--success))',
                        borderColor: 'rgb(var(--success))',
                      }}
                    >
                      {expired ? 'EXPIRED' : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-faint mt-0.5 truncate">{room.roomId}</p>

                  {/* Access code — hidden by default, revealed via "Share" */}
                  {isSharing && (
                    <div className="mt-3 max-w-sm">
                      <AccessCodeBox
                        roomId={room.roomId}
                        accessCode={room.accessCode}
                        roomName={room.name}
                      />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="font-mono font-bold text-xl text-fg">{room.photoCount}</p>
                    <p className="font-mono text-xs text-faint uppercase tracking-wide">Photos</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-mono text-sm text-muted">
                      {new Date(room.expiryDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="font-mono text-xs text-faint uppercase tracking-wide">Expires</p>
                  </div>

                  {/* Share toggle — reveals/hides the access code box above */}
                  <button
                    onClick={() => setShareRoomId(isSharing ? null : room.roomId)}
                    className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                    style={{
                      borderColor: 'rgb(var(--accent) / 0.5)',
                      color: 'rgb(var(--accent))',
                      background: isSharing ? 'rgb(var(--accent) / 0.1)' : 'transparent',
                    }}
                    title="Show the access code and copy a shareable link"
                  >
                    {isSharing ? 'Hide Code' : 'Share'}
                  </button>

                  {/* Enter Room / Upload (test as guest) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEnterRoom(room)}
                      disabled={enteringRoomId === room.roomId || expired}
                      className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                      style={{
                        borderColor: expired ? 'rgb(var(--faint) / 0.3)' : 'rgb(var(--success) / 0.5)',
                        color: expired ? 'rgb(var(--faint))' : 'rgb(var(--success))',
                        opacity: expired ? 0.5 : 1,
                      }}
                      title="View all uploaded photos for this room"
                    >
                      {enteringRoomId === room.roomId ? (
                        <LoadingSpinner size="sm" label="..." />
                      ) : (
                        'Enter'
                      )}
                    </button>

                    <button
                      onClick={() => handleTestUpload(room)}
                      disabled={uploadingTestId === room.roomId || expired}
                      className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                      style={{ opacity: expired ? 0.5 : 1 }}
                      title="Open the upload page as a guest"
                    >
                      {uploadingTestId === room.roomId ? (
                        <LoadingSpinner size="sm" label="..." />
                      ) : (
                        'Upload'
                      )}
                    </button>
                  </div>

                  {/* Delete: inline confirm state */}
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs"
                        style={{ color: 'rgb(var(--danger))' }}
                      >
                        Delete?
                      </span>
                      <button
                        onClick={() => handleDeleteConfirm(room.roomId)}
                        className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                        style={{
                          borderColor: 'rgb(var(--danger))',
                          color: 'rgb(var(--danger))',
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(room.roomId)}
                      disabled={isDeleting}
                      className="raw-btn !px-3 !py-1 !min-h-0 text-xs"
                      style={{
                        borderColor: 'rgb(var(--danger) / 0.4)',
                        color: 'rgb(var(--danger))',
                      }}
                    >
                      {isDeleting ? <LoadingSpinner size="sm" label="..." /> : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Room Modal ── */}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadRooms() }}
        />
      )}
    </div>
  )
}