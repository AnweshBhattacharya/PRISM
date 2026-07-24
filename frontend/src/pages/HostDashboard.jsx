/**
 * pages/HostDashboard.jsx
 * Protected page showing all event rooms for the authenticated host.
 * Supports creating new rooms and deleting existing ones.
 */
import { useState, useEffect } from 'react'
import { listRooms, createRoom, deleteRoom } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-8 max-w-md w-full space-y-6 animate-slide-up">
        {!result ? (
          <>
            <h2 className="text-2xl font-bold text-white">Create Event Room</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="room-name">Room Name</label>
                <input id="room-name" type="text" className="input-field"
                  placeholder="e.g. Priya & Raj Wedding" value={name}
                  onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="expiry-days">
                  Room expires in (days)
                </label>
                <input id="expiry-days" type="number" min={1} max={30}
                  className="input-field" value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setAllowDownload(!allowDownload)}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center ${allowDownload ? 'bg-brand-600' : 'bg-dark-500'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-200 ${allowDownload ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-white/70">Allow guests to download photos</span>
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <LoadingSpinner size="sm" /> : 'Create Room'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── Success: Show access code ─── */
          <div className="text-center space-y-6">
            <div className="text-5xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Room Created!</h2>
              <p className="text-white/50 text-sm mt-1">Share this code with your guests</p>
            </div>
            <div className="glass rounded-xl p-6 space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-widest">Room ID</p>
              <p className="text-sm font-mono text-accent-400">{result.roomId}</p>
              <p className="text-xs text-white/40 uppercase tracking-widest mt-3">Access Code</p>
              <p className="text-5xl font-mono font-bold tracking-widest gradient-text">
                {result.accessCode}
              </p>
              <p className="text-xs text-red-400 mt-2">⚠️ Save this code — it won't be shown again</p>
            </div>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HostDashboard() {
  const [rooms,       setRooms]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)

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

  useEffect(() => { loadRooms() }, [])

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this room? All photos will be permanently removed.')) return
    setDeletingId(roomId)
    try {
      await deleteRoom(roomId)
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
    } catch (e) {
      alert('Failed to delete room.')
    } finally {
      setDeletingId(null)
    }
  }

  const isExpired = (expiryDate) => new Date(expiryDate) < new Date()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Event Rooms</h1>
          <p className="text-white/50 mt-1">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="create-room-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          + Create Room
        </button>
      </div>

      {/* Rooms grid */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" label="Loading rooms…" /></div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-xl font-semibold text-white/70">No rooms yet</p>
          <p className="text-white/40 mt-2">Create your first event room to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <div key={room.roomId} className="glass-hover rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{room.name}</h3>
                  <p className="text-xs font-mono text-white/30 mt-0.5 truncate">{room.roomId}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 whitespace-nowrap ${
                  isExpired(room.expiryDate)
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {isExpired(room.expiryDate) ? 'Expired' : 'Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="glass rounded-xl p-3">
                  <p className="text-2xl font-bold gradient-text">{room.photoCount}</p>
                  <p className="text-xs text-white/40 mt-0.5">Photos</p>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-sm font-medium text-white/70 truncate">
                    {new Date(room.expiryDate).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">Expires</p>
                </div>
              </div>

              <button
                onClick={() => handleDelete(room.roomId)}
                disabled={deletingId === room.roomId}
                className="w-full btn-secondary py-2 text-sm text-red-400/70 hover:text-red-400 border-red-500/10 hover:border-red-500/30"
              >
                {deletingId === room.roomId ? <LoadingSpinner size="sm" /> : '🗑 Delete Room'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadRooms() }}
        />
      )}
    </div>
  )
}
