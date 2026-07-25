/**
 * pages/Home.jsx
 * PRISM — Landing page.
 * Animated wordmark hero + minimal guest/host cards.
 * No descriptive copy — branding only.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useGuest } from '../context/AuthContext'
import { validateRoomCode } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

/* ── Drifting vertical lines + scan line (light mode only) ────────── */
function GeometricBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (document.documentElement.classList.contains('dark')) return

    const ctx = canvas.getContext('2d')
    let raf

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const lineCount = 12

    function draw() {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i <= lineCount; i++) {
        const gap    = w / lineCount
        const offset = Math.sin(t * 0.3 + i * 0.6) * 18
        const x      = ((i * gap + offset) + w * 10) % w

        const g = ctx.createLinearGradient(x, 0, x, h)
        g.addColorStop(0,   'rgba(10,10,12,0)')
        g.addColorStop(0.3, 'rgba(10,10,12,0.06)')
        g.addColorStop(0.7, 'rgba(10,10,12,0.06)')
        g.addColorStop(1,   'rgba(10,10,12,0)')

        ctx.beginPath()
        ctx.strokeStyle = g
        ctx.lineWidth   = 1
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      const scanY = (t * 18) % h
      const sg = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40)
      sg.addColorStop(0,   'rgba(10,10,12,0)')
      sg.addColorStop(0.5, 'rgba(10,10,12,0.04)')
      sg.addColorStop(1,   'rgba(10,10,12,0)')
      ctx.fillStyle = sg
      ctx.fillRect(0, scanY - 40, w, 80)

      t += 0.016
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

/* ── Per-letter drop animation for PRISM wordmark ─────────────────── */
function PrismWordmark() {
  const letters = ['P', 'R', 'I', 'S', 'M']
  return (
    <h1
      className="font-display font-bold uppercase text-fg select-none"
      style={{
        fontSize: 'clamp(5rem, 10vw + 1rem, 12rem)',
        letterSpacing: '0.12em',
        lineHeight: 1,
      }}
      aria-label="PRISM"
    >
      {letters.map((letter, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            animation: `letter-drop 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
          }}
        >
          {letter}
        </span>
      ))}
    </h1>
  )
}

/* ── Main ────────────────────────────────────────────────────────────── */
export default function Home() {
  const auth             = useAuth()
  const { loginAsGuest } = useGuest()
  const navigate         = useNavigate()

  const [roomId,     setRoomId]     = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [action,     setAction]     = useState('upload')

  const handleGuestSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!roomId.trim() || accessCode.length !== 6) {
      setError('Enter both the Room ID and the 6-digit access code.')
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
      setError(err.response?.data?.error || 'Invalid Room ID or access code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{ minHeight: '50vh', padding: '4rem 1rem' }}
      >
        <GeometricBackground />

        {/* Corner ticks */}
        {[
          { top: '1rem',    left: '1rem',   borderWidth: '2px 0 0 2px' },
          { top: '1rem',    right: '1rem',  borderWidth: '2px 2px 0 0' },
          { bottom: '1rem', left: '1rem',   borderWidth: '0 0 2px 2px' },
          { bottom: '1rem', right: '1rem',  borderWidth: '0 2px 2px 0' },
        ].map((style, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute w-5 h-5 animate-fade-in"
            style={{
              ...style,
              borderStyle: 'solid',
              borderColor: 'rgb(var(--fg) / 0.15)',
              animationDelay: `${i * 80 + 400}ms`,
            }}
          />
        ))}

        {/* Wordmark */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <span
            className="font-mono text-xs uppercase tracking-[0.3em] text-faint animate-fade-in"
            style={{ animationDelay: '40ms' }}
          >
            Event Photography · AI
          </span>
          <PrismWordmark />
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="border-t border-line" />

      {/* ── Cards ────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Guest card */}
          <div
            className="raw-card animate-slide-up"
            style={{ animationDelay: '120ms' }}
          >
            <div className="mb-5 pb-4 border-b border-line flex items-baseline justify-between">
              <h2 className="font-display font-bold uppercase tracking-tight text-lg text-fg">
                Guest
              </h2>
              <span className="font-mono text-xs text-faint uppercase tracking-widest">
                Access
              </span>
            </div>

            <form onSubmit={handleGuestSubmit} className="space-y-4">
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
                  style={{ letterSpacing: '0.5em' }}
                  required
                />
                <p className="font-mono text-xs text-faint mt-1 text-right">
                  {accessCode.length} / 6
                </p>
              </div>

              <div className="flex gap-2">
                {[
                  { key: 'upload', label: 'Upload' },
                  { key: 'view',   label: 'Find Photos' },
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

              {error && (
                <div
                  className="border border-danger px-3 py-2 animate-pop"
                  style={{ color: 'rgb(var(--danger))', background: 'rgb(var(--danger) / 0.04)' }}
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
                {loading
                  ? <LoadingSpinner size="sm" label="JOINING..." />
                  : action === 'upload' ? 'Join & Upload →' : 'Join & Find Photos →'
                }
              </button>
            </form>
          </div>

          {/* Host card */}
          <div
            className="raw-card flex flex-col justify-between animate-slide-up"
            style={{ animationDelay: '220ms' }}
          >
            <div>
              <div className="mb-5 pb-4 border-b border-line flex items-baseline justify-between">
                <h2 className="font-display font-bold uppercase tracking-tight text-lg text-fg">
                  Host
                </h2>
                <span className="font-mono text-xs text-faint uppercase tracking-widest">
                  Manage
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Private rooms with a 6-digit code',
                  'Direct secure photo uploads',
                  'AI face-based photo organisation',
                  'Auto-delete on expiry',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="font-mono text-xs text-faint flex-shrink-0 mt-0.5 w-4"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-muted">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {auth.isAuthenticated ? (
              <button
                id="host-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className="raw-btn raw-btn-accent w-full"
              >
                Go to Dashboard →
              </button>
            ) : (
              <button
                id="host-login-btn"
                onClick={() => navigate('/login')}
                className="raw-btn raw-btn-accent w-full"
              >
                Sign In →
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
