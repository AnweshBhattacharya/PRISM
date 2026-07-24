/**
 * pages/Home.jsx
 * Landing page with two CTAs:
 * - Guests enter a 6-digit room code to join an event.
 * - Hosts click "I'm a Host" to sign in via Cognito.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useGuest } from '../context/AuthContext'
import { validateRoomCode } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Home() {
  const auth               = useAuth()
  const { loginAsGuest }   = useGuest()
  const navigate           = useNavigate()

  const [roomId,      setRoomId]      = useState('')
  const [accessCode,  setAccessCode]  = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [action,      setAction]      = useState('upload') // 'upload' | 'view'

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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16 page-enter">
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-white/60 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
          AI-Powered Event Photography
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight">
          Your memories,{' '}
          <span className="gradient-text">instantly found</span>
        </h1>
        <p className="text-lg text-white/50 max-w-lg mx-auto">
          Take a selfie. Our AI scans the entire event gallery and shows
          only the photos you appear in — privately and instantly.
        </p>
      </div>

      {/* ── Cards Row ────────────────────────────────── */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guest Card */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">I'm a Guest 📸</h2>
            <p className="text-sm text-white/50">Enter your event code to join</p>
          </div>

          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="room-id-input">Room ID</label>
              <input
                id="room-id-input"
                type="text"
                placeholder="room_abc123"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="access-code-input">6-Digit Access Code</label>
              <input
                id="access-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="••••••"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ''))}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                required
              />
            </div>

            {/* Action toggle */}
            <div className="flex gap-2 p-1 glass rounded-xl">
              {['upload', 'view'].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAction(a)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    action === a
                      ? 'bg-brand-600 text-white shadow-lg'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {a === 'upload' ? '📤 Upload Photos' : '🔍 Find My Photos'}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              id="guest-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? <LoadingSpinner size="sm" /> : (
                action === 'upload' ? 'Join & Upload →' : 'Join & Find Photos →'
              )}
            </button>
          </form>
        </div>

        {/* Host Card */}
        <div className="glass rounded-2xl p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">I'm a Host 🎉</h2>
            <p className="text-sm text-white/50">Create and manage your event rooms</p>
          </div>

          <ul className="space-y-3 text-sm text-white/60">
            {[
              'Create private event rooms with a 6-digit code',
              'Guests upload photos directly and securely',
              'AI automatically organises photos by face',
              'Rooms auto-delete after your chosen expiry date',
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                {feat}
              </li>
            ))}
          </ul>

          <button
            id="host-login-btn"
            onClick={() => auth.signinRedirect()}
            className="btn-primary w-full py-3"
          >
            Sign In / Create Account →
          </button>
        </div>
      </div>
    </div>
  )
}
