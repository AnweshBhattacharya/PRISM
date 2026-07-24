/**
 * pages/GuestView.jsx
 * Allows guests to take a selfie and find all their photos in the event gallery.
 * Flow: Consent → Webcam capture → POST /guest/search → display matched photos.
 */
import { useState, useRef, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { useGuest } from '../context/AuthContext'
import { searchFaces } from '../services/api'
import PhotoCard from '../components/PhotoCard'
import LoadingSpinner from '../components/LoadingSpinner'

const WEBCAM_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  facingMode: 'user',
}

export default function GuestView() {
  const { roomId }       = useParams()
  const { guestSession } = useGuest()

  const webcamRef = useRef(null)

  const [step,         setStep]         = useState('consent') // consent | camera | loading | results | error
  const [consent,      setConsent]      = useState(false)
  const [photos,       setPhotos]       = useState([])
  const [errorMsg,     setErrorMsg]     = useState('')
  const [capturedImg,  setCapturedImg]  = useState(null)

  // Redirect if no valid guest session
  if (!guestSession || guestSession.roomId !== roomId) {
    return <Navigate to="/" replace />
  }

  const handleConsentSubmit = () => {
    if (!consent) return
    setStep('camera')
  }

  const handleCapture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (!imageSrc) return

    setCapturedImg(imageSrc)
    setStep('loading')

    try {
      const data = await searchFaces(imageSrc, true)
      setPhotos(data.photos || [])
      setStep('results')
    } catch (err) {
      const msg = err.response?.data?.error || 'Face search failed. Please try again.'
      setErrorMsg(msg)
      setStep('error')
    }
  }, [])

  const handleRetry = () => {
    setCapturedImg(null)
    setPhotos([])
    setErrorMsg('')
    setStep('camera')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
      {/* Header */}
      <div className="mb-8 space-y-1">
        <h1 className="text-3xl font-bold text-white">Find My Photos</h1>
        <p className="text-white/50 text-sm">
          Room: <span className="text-accent-400 font-mono">{guestSession.roomName || roomId}</span>
        </p>
      </div>

      {/* ── Step 1: Consent ── */}
      {step === 'consent' && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="text-4xl text-center">🔍</div>
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-white">Biometric Consent Required</h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              To find your photos, we'll take a live selfie and use AI face recognition
              to match it against the event gallery. Your selfie is never stored.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-4 glass rounded-xl">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-brand-500 cursor-pointer"
            />
            <span className="text-sm text-white/70">
              I consent to a one-time biometric face scan to find photos of myself
              in this event gallery. I understand my selfie image will not be stored.
            </span>
          </label>

          <button
            onClick={handleConsentSubmit}
            disabled={!consent}
            className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Camera →
          </button>
        </div>
      )}

      {/* ── Step 2: Camera ── */}
      {step === 'camera' && (
        <div className="glass rounded-2xl p-6 space-y-5">
          <p className="text-center text-white/60 text-sm">
            Position your face in the frame and tap the button
          </p>
          <div className="rounded-xl overflow-hidden aspect-video bg-dark-800 flex items-center justify-center">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={WEBCAM_CONSTRAINTS}
              className="w-full h-full object-cover"
              mirrored
            />
          </div>
          <button onClick={handleCapture} className="btn-primary w-full py-3 text-lg">
            📸 Take Selfie & Search
          </button>
          <button onClick={() => setStep('consent')} className="btn-secondary w-full text-sm">
            ← Back
          </button>
        </div>
      )}

      {/* ── Step 3: Loading ── */}
      {step === 'loading' && (
        <div className="glass rounded-2xl p-16 flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-white/60">Searching the gallery…</p>
          <p className="text-white/30 text-sm">This usually takes 2–4 seconds</p>
        </div>
      )}

      {/* ── Step 4: Results ── */}
      {step === 'results' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">
                {photos.length > 0
                  ? `Found ${photos.length} photo${photos.length !== 1 ? 's' : ''} with you in them`
                  : 'No matching photos found'}
              </p>
            </div>
            <button onClick={handleRetry} className="btn-secondary text-sm py-2 px-4">
              🔄 Search Again
            </button>
          </div>

          {photos.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center space-y-3">
              <p className="text-4xl">🤷</p>
              <p className="text-white/60">No photos found</p>
              <p className="text-white/30 text-sm">
                Photos may still be uploading. Try again in a few minutes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.photoId}
                  photo={photo}
                  allowDownload={guestSession.allowDownload}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Error ── */}
      {step === 'error' && (
        <div className="glass rounded-2xl p-8 space-y-4 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="text-red-400">{errorMsg}</p>
          <button onClick={handleRetry} className="btn-primary py-2 px-6">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
