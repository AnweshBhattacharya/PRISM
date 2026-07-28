/**
 * pages/GuestView.jsx
 * RawBlock v2 — Take a selfie, search the event gallery.
 * Flow: Consent → Webcam capture → POST /guest/search → display matched photos.
 */
import { useState, useRef, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { useGuest } from '../context/AuthContext'
import { searchFaces } from '../services/api'
import PhotoCard from '../components/PhotoCard'
import ConfirmModal from '../components/ConfirmModal'

const WEBCAM_CONSTRAINTS = {
  width:      { ideal: 640 },
  height:     { ideal: 480 },
  facingMode: 'user',
}

// Camera-viewfinder corner brackets, drawn over the webcam feed. Each corner
// gently pulses on its own delay so the frame reads as "actively focusing"
// rather than a static overlay.
function FocusBrackets() {
  const corners = [
    { top: 0,    left: 0,   borderWidth: '3px 0 0 3px' },
    { top: 0,    right: 0,  borderWidth: '3px 3px 0 0' },
    { bottom: 0, left: 0,   borderWidth: '0 0 3px 3px' },
    { bottom: 0, right: 0,  borderWidth: '0 3px 3px 0' },
  ]
  return (
    <div className="pointer-events-none absolute inset-4" aria-hidden="true">
      {corners.map((style, i) => (
        <div
          key={i}
          className="absolute w-7 h-7 animate-focus-pulse"
          style={{
            ...style,
            borderStyle: 'solid',
            borderColor: 'rgb(var(--accent))',
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default function GuestView() {
  const { roomId }       = useParams()
  const { guestSession } = useGuest()

  const webcamRef = useRef(null)

  const [step,        setStep]        = useState('consent') // consent | camera | loading | results | error
  const [consent,     setConsent]     = useState(false)
  const [photos,      setPhotos]      = useState([])
  const [errorMsg,    setErrorMsg]    = useState('')
  const [confirmPhoto, setConfirmPhoto] = useState(null)

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
    setPhotos([])
    setErrorMsg('')
    setStep('camera')
  }

  const handleConfirm = (photo) => {
    setPhotos((prev) =>
      prev.map((p) => p.photoId === photo.photoId ? { ...p, needs_confirmation: false } : p)
    )
    setConfirmPhoto(null)
  }

  const handleDeny = (photo) => {
    setPhotos((prev) => prev.filter((p) => p.photoId !== photo.photoId))
    setConfirmPhoto(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-slide-up">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1
          className="font-display font-bold uppercase tracking-tight text-fg"
          style={{ fontSize: 'clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem)', lineHeight: 1.05 }}
        >
          Find My Photos
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-xs text-faint uppercase tracking-wide">Room:</span>
          <span className="font-mono text-xs text-fg">{guestSession.roomName || roomId}</span>
        </div>
      </div>

      {/* ── Step 1: Consent ── */}
      {step === 'consent' && (
        <div className="raw-card space-y-6">
          <div>
            <h2 className="font-display font-bold uppercase tracking-tight text-xl text-fg">
              Biometric Consent
            </h2>
            <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">
              Required before face recognition
            </p>
          </div>

          <p className="text-sm text-muted">
            To find your photos, we'll take a live selfie and use AI face recognition
            to match it against the event gallery. Your selfie is never stored.
          </p>

          <label className="flex items-start gap-3 cursor-pointer border border-line p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="raw-check mt-0.5"
            />
            <span className="text-sm text-muted">
              I consent to a one-time biometric face scan to find photos of myself
              in this event gallery. I understand my selfie image will not be stored.
            </span>
          </label>

          <button
            onClick={handleConsentSubmit}
            disabled={!consent}
            className="raw-btn raw-btn-accent w-full focus-ticks transition-transform duration-150
                       hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0"
          >
            Continue to Camera →
          </button>
        </div>
      )}

      {/* ── Step 2: Camera ── */}
      {step === 'camera' && (
        <div className="raw-card space-y-4">
          <p className="font-mono text-xs text-muted uppercase tracking-wide text-center">
            Position your face in the frame
          </p>

          {/* Webcam with hard border + animated focus brackets */}
          <div
            className="relative border-2 border-line overflow-hidden transition-transform duration-150 hover:-translate-y-0.5"
            style={{ aspectRatio: '4/3' }}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={WEBCAM_CONSTRAINTS}
              className="w-full h-full object-cover"
              mirrored
            />
            <FocusBrackets />
          </div>

          <button
            onClick={handleCapture}
            className="raw-btn raw-btn-accent w-full text-base focus-ticks transition-transform duration-150
                       hover:-translate-y-0.5 active:translate-y-0"
          >
            Take Selfie & Search
          </button>
          <button onClick={() => setStep('consent')} className="raw-btn w-full text-sm">
            ← Back
          </button>
        </div>
      )}

      {/* ── Step 3: Loading ── */}
      {step === 'loading' && (
        <div
          className="border border-line bg-surface py-24 flex flex-col items-center gap-4"
        >
          <span
            className="font-mono font-bold uppercase tracking-widest text-fg animate-blink"
            style={{ fontSize: '1.5rem', letterSpacing: '0.2em' }}
          >
            SEARCHING...
          </span>
          <p className="font-mono text-xs text-faint uppercase tracking-wide">
            Usually takes 2–4 seconds
          </p>
        </div>
      )}

      {/* ── Step 4: Results ── */}
      {step === 'results' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="font-mono text-xs text-faint uppercase tracking-wide">
              {photos.length > 0
                ? `${photos.length} photo${photos.length !== 1 ? 's' : ''} found`
                : 'No matching photos found'}
            </p>
            <button onClick={handleRetry} className="raw-btn text-sm !py-1.5 !px-3">
              Search Again
            </button>
          </div>

          {photos.length === 0 ? (
            <div className="border border-line bg-surface py-20 text-center space-y-3">
              <p className="font-display font-bold uppercase text-2xl text-fg">No photos found</p>
              <p className="font-mono text-xs text-faint uppercase tracking-wide">
                Photos may still be uploading — try again in a few minutes
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.photoId}
                  photo={photo}
                  allowDownload={guestSession.allowDownload}
                  onConfirm={setConfirmPhoto}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Error ── */}
      {step === 'error' && (
        <div
          className="border border-line bg-surface px-6 py-10 space-y-4 text-center"
          style={{ borderColor: 'rgb(var(--danger))' }}
        >
          <p
            className="font-mono text-sm"
            style={{ color: 'rgb(var(--danger))' }}
          >
            {errorMsg}
          </p>
          <button onClick={handleRetry} className="raw-btn raw-btn-accent">
            Try Again
          </button>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmPhoto && (
        <ConfirmModal
          photo={confirmPhoto}
          onConfirm={handleConfirm}
          onDeny={handleDeny}
          onClose={() => setConfirmPhoto(null)}
        />
      )}
    </div>
  )
}
