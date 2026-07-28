/**
 * pages/HostRoomView.jsx
 * Host-only page showing all uploaded photos for a room.
 * Uses Cognito auth and host-only backend endpoint /rooms/{roomId}/photos.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRoomPhotos } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import PhotoCard from '../components/PhotoCard'

export default function HostRoomView() {
  const { roomId } = useParams()
  const navigate = useNavigate()

  const [roomName, setRoomName] = useState('')
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPhotos = async () => {
      setError('')
      setLoading(true)
      try {
        const data = await getRoomPhotos(roomId)
        setRoomName(data.roomName || roomId)
        setPhotos(data.photos || [])
      } catch (err) {
        console.error('Failed to load room photos:', err)
        setError(err.response?.data?.error || 'Failed to load room photos.')
      } finally {
        setLoading(false)
      }
    }

    if (roomId) {
      loadPhotos()
    }
  }, [roomId])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 animate-slide-up">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display font-bold uppercase tracking-tight text-fg" style={{ fontSize: 'clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem)', lineHeight: 1.05 }}>
            Room Photos
          </h1>
          <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">
            {roomName}
          </p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="raw-btn raw-btn-accent">
          Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 border border-line bg-surface">
          <LoadingSpinner size="lg" label="LOADING PHOTOS..." />
        </div>
      ) : error ? (
        <div className="border border-line bg-surface px-6 py-10 text-center">
          <p className="font-mono text-sm text-danger">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="raw-btn raw-btn-accent mt-4">
            Back to Dashboard
          </button>
        </div>
      ) : photos.length === 0 ? (
        <div className="border border-line bg-surface py-24 text-center">
          <p className="font-display font-bold uppercase text-2xl text-fg mb-2">No uploaded photos yet</p>
          <p className="font-mono text-xs text-faint uppercase tracking-wide">
            Photos will appear here once guests upload and the room is indexed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <PhotoCard key={photo.photoId} photo={photo} allowDownload={true} onConfirm={null} />
          ))}
        </div>
      )}
    </div>
  )
}
