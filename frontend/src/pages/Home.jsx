/**
 * pages/Home.jsx
 * RawBlock v2 — Landing page.
 * Guest card: Room ID + 6-digit code + upload/view chips + submit.
 * Host card: feature list + sign in button.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useGuest } from '../context/AuthContext'
import { validateRoomCode } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Home() {
  const auth              = useAuth()
  const { loginAsGuest }  = useGuest()
  const navigate          = useNavigate()

  const [roomId,     setRoomId]     = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [action,     setAction]     = useState('upload') // 'upload' | 'view'

  const handleGuestSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!roomId.trim() || accessCode.length !== 6) {
      setError('Please enter both the Room ID and the 6-digit access code.')
      return
    }

    setLoading(true)
    try {
      const data = await validateRoomCode(roomId.trim(), accessCode)
      loginAsGuest(roomId.trim(), data)
      navigate(action === 'upload'
        ? `/room/${roomId.trim()}/upload`
        : `/room/${roomId.trim()}/view`
      )
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid Room ID or access code. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16">

      {/* ── Hero ─────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0ms' }}>
        <p className="font-mono text-xs text-faint uppercase tracking-widest mb-4">
          AI-Powered Event Photography
        </p>
        <h1
          className="font-display font-bold uppercase text-fg"
          style={{
            fontSize: 'clamp(2.5rem, 2rem + 4vw, 4rem)',
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
          }}
        >
          Your memories,
          <br />
          instantly found
        </h1>
        <p className="mt-4 text-muted max-w-md mx-auto">
          Take a selfie. Our AI scans the entire event gallery and shows
          only the photos you appear in — privately and instantly.
        </p>
      </div>

      {/* ── Cards Row ────────────────────────────────── */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6">

        {/* ── Guest Card ─────────────────────────── */}
        <div
          className="raw-card animate-slide-up"
          style={{ animationDelay: '80ms' }}
        >
          <div className="mb-6">
            <h2 className="font-display font-bold uppercase tracking-tight text-xl text-fg">
              I'm a Guest
            </h2>
            <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">
              Enter your event code to join
            </p>
          </div>

          <form onSubmit={handleGuestSubmit} className="space-y-4">
            {/* Room ID */}
            <div>
              <label className="raw-label" htmlFor="room-id-input">Room ID</label>
              <input
                id="room-id-input"
                type="text"
                placeholder="room_abc123"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="raw-input"
                required
              />
            </div>

            {/* Access Code */}
            <div>
              <label className="raw-label" htmlFor="access-code-input">Access Code</label>
              <input
                id="access-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ''))}
                className="raw-input font-mono text-center text-2xl"
                style={{ letterSpacing: '0.4em' }}
                required
              />
            </div>

            {/* Action toggle chips */}
            <div className="flex gap-2">
              {[
                { key: 'upload', label: 'Upload Photos' },
                { key: 'view',   label: 'Find My Photos' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAction(key)}
                  className={`raw-chip flex-1 justify-center ${action === key ? 'raw-chip-on' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div
                className="border border-danger px-3 py-2"
                style={{ color: 'rgb(var(--danger))', background: 'rgb(var(--danger) / 0.05)' }}
              >
                <p className="font-mono text-xs">{error}</p>
              </div>
            )}

            <button
              id="guest-submit-btn"
              type="submit"
              disabled={loading}
              className="raw-btn raw-btn-accent w-full"
            >
              {loading ? (
                <LoadingSpinner size="sm" label="JOINING..." />
              ) : (
                action === 'upload' ? 'Join & Upload →' : 'Join & Find Photos →'
              )}
            </button>
          </form>
        </div>

        {/* ── Host Card ──────────────────────────── */}
        <div
          className="raw-card flex flex-col justify-between animate-slide-up mt-6 md:mt-0"
          style={{ animationDelay: '160ms' }}
        >
          <div className="mb-6">
            <h2 className="font-display font-bold uppercase tracking-tight text-xl text-fg">
              I'm a Host
            </h2>
            <p className="font-mono text-xs text-faint uppercase tracking-wide mt-1">
              Create and manage event rooms
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3 mb-8">
            {[
              'Create private event rooms with a 6-digit code',
              'Guests upload photos directly and securely',
              'AI automatically organises photos by face',
              'Rooms auto-delete after your chosen expiry date',
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-3">
                <span
                  className="font-mono text-xs flex-shrink-0 mt-0.5"
                  style={{ color: 'rgb(var(--success))' }}
                >
                  ✓
                </span>
                <span className="text-sm text-muted">{feat}</span>
              </li>
            ))}
          </ul>

          <button
            id="host-login-btn"
            onClick={() => auth.signinRedirect()}
            className="raw-btn raw-btn-accent w-full"
          >
            Sign In / Create Account →
          </button>
        </div>
      </div>
    </div>
  )
}
