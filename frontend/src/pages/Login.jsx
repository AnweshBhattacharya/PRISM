/**
 * pages/Login.jsx
 * PRISM — Host login. Brutalist-minimalist, monochrome.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import LoadingSpinner from '../components/LoadingSpinner'

/* ── Monochrome prism triangle SVG (static in dark, animated in light) ─ */
function PrismGeometry() {
  const isDark = document.documentElement.classList.contains('dark')

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      aria-hidden="true"
      style={{ maxWidth: 220 }}
    >
      {/* Outer triangle */}
      <polygon
        points="100,18 182,174 18,174"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.7"
      />

      {/* Inner echo */}
      <polygon
        points="100,18 182,174 18,174"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.2"
        style={{ transform: 'scale(0.84)', transformOrigin: '100px 122px' }}
      />

      {/* Innermost echo */}
      <polygon
        points="100,18 182,174 18,174"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.1"
        style={{ transform: 'scale(0.65)', transformOrigin: '100px 122px' }}
      />

      {/* Incoming ray */}
      <line x1="30" y1="56" x2="100" y2="96" stroke="currentColor" strokeWidth="1" opacity="0.45">
        {!isDark && <animate attributeName="opacity" values="0.25;0.6;0.25" dur="3.2s" repeatCount="indefinite" />}
      </line>

      {/* Refracted rays — all monochrome, different widths */}
      {[
        { x2: 194, y2: 158, w: 1.5, dur: '2.4s', op: '0.55' },
        { x2: 196, y2: 172, w: 1.0, dur: '2.8s', op: '0.40' },
        { x2: 195, y2: 188, w: 0.8, dur: '3.1s', op: '0.30' },
        { x2: 192, y2: 202, w: 0.6, dur: '2.6s', op: '0.20' },
      ].map(({ x2, y2, w, dur, op }, i) => (
        <line key={i} x1="182" y1="174" x2={x2} y2={y2} stroke="currentColor" strokeWidth={w} opacity={op}>
          {!isDark && <animate attributeName="opacity" values={`${parseFloat(op) * 0.5};${op};${parseFloat(op) * 0.5}`} dur={dur} repeatCount="indefinite" />}
        </line>
      ))}

      {/* Vertex dots */}
      <circle cx="100" cy="18"  r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="182" cy="174" r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="18"  cy="174" r="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

/* ── Monochrome canvas for left panel (always active, adjusted for dark) ── */
function GeometricCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let raf
    const isDark = document.documentElement.classList.contains('dark')

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const lineCount = 8

    function draw() {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      // Use a color that works on both backgrounds: light on dark, subtle dark on light?
      // Since we fix background to dark, we'll always use white/light tones.
      const baseColor = '244,245,247' // light gray

      // Slowly drifting vertical bars
      for (let i = 0; i <= lineCount; i++) {
        const gap = w / lineCount
        const offset = Math.sin(t * 0.25 + i * 0.8) * 22
        const x = (i * gap + offset + w) % w

        const g = ctx.createLinearGradient(x, 0, x, h)
        g.addColorStop(0,   `rgba(${baseColor},0)`)
        g.addColorStop(0.3, `rgba(${baseColor},0.06)`)
        g.addColorStop(0.7, `rgba(${baseColor},0.06)`)
        g.addColorStop(1,   `rgba(${baseColor},0)`)

        ctx.beginPath()
        ctx.strokeStyle = g
        ctx.lineWidth   = 1
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      // Slow horizontal scan
      const scanY = (t * 14) % h
      const sg = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50)
      sg.addColorStop(0,   `rgba(${baseColor},0)`)
      sg.addColorStop(0.5, `rgba(${baseColor},0.04)`)
      sg.addColorStop(1,   `rgba(${baseColor},0)`)
      ctx.fillStyle = sg
      ctx.fillRect(0, scanY - 50, w, 100)

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

/* ── Main ────────────────────────────────────────────────────────────── */
export default function Login() {
  const auth     = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step,    setStep]    = useState(0)

  useEffect(() => {
    if (auth.isAuthenticated) navigate('/dashboard', { replace: true })
  }, [auth.isAuthenticated, navigate])

  useEffect(() => {
    const ids = [
      setTimeout(() => setStep(1), 80),
      setTimeout(() => setStep(2), 260),
      setTimeout(() => setStep(3), 440),
    ]
    return () => ids.forEach(clearTimeout)
  }, [])

  const handleSignIn = () => {
    setLoading(true)
    auth.signinRedirect()
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid grid-cols-1 lg:grid-cols-2">

      {/* Left panel — now always dark */}
      <div
        className="hidden lg:flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: '#0a0a0a', minHeight: '100%' }} // fixed dark
      >
        <GeometricCanvas />

        {/* Grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(244,245,247,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(244,245,247,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Corner ticks */}
        {[
          { top: '1.5rem', left: '1.5rem',   borderWidth: '2px 0 0 2px' },
          { top: '1.5rem', right: '1.5rem',  borderWidth: '2px 2px 0 0' },
          { bottom: '1.5rem', left: '1.5rem',   borderWidth: '0 0 2px 2px' },
          { bottom: '1.5rem', right: '1.5rem',  borderWidth: '0 2px 2px 0' },
        ].map((style, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute w-8 h-8 animate-fade-in"
            style={{
              ...style,
              borderStyle: 'solid',
              borderColor: 'rgba(244,245,247,0.18)',
              animationDelay: `${i * 80 + 200}ms`,
            }}
          />
        ))}

        {/* Content with extra animations */}
        <div className="relative z-10 flex flex-col items-center gap-10 px-12">
          <span
            className="font-display font-bold uppercase tracking-[0.22em] animate-slide-up"
            style={{
              fontSize: 'clamp(2.5rem, 4vw, 4rem)',
              color: 'rgb(244 245 247)',
              animationDelay: '150ms',
            }}
          >
            PRISM
          </span>

          <div
            className="w-44 h-44 animate-slide-up"
            style={{
              color: 'rgba(244,245,247,0.75)',
              animationDelay: '300ms',
            }}
          >
            <PrismGeometry />
          </div>

          <p
            className="font-mono text-xs uppercase tracking-[0.22em] text-center animate-slide-up"
            style={{ color: 'rgba(244,245,247,0.35)', animationDelay: '450ms' }}
          >
            AI · Privacy · Performance
          </p>

          {/* New subtle pulsing dot */}
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/20 animate-pulse"
            style={{ animationDuration: '3s' }}
          />
        </div>

        <div className="absolute bottom-5 left-0 right-0 flex justify-center">
          <span
            className="font-mono text-xs animate-fade-in"
            style={{ color: 'rgba(244,245,247,0.2)', letterSpacing: '0.12em', animationDelay: '600ms' }}
          >
            PRISM v2
          </span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-bg">

        {/* Mobile wordmark */}
        <div
          className="lg:hidden mb-10 animate-slide-up"
          style={{ animationDelay: '40ms' }}
        >
          <span
            className="font-display font-bold uppercase tracking-[0.2em] text-fg"
            style={{ fontSize: '2rem' }}
          >
            PRISM
          </span>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm raw-card bracket-card"
          style={{
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'translateY(0)' : 'translateY(14px)',
            transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Header */}
          <div className="mb-6 pb-5 border-b border-line">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-mono text-xs text-faint uppercase tracking-widest">
                Host Access
              </span>
              <span
                className="font-mono border border-fg/20 bg-fg text-surface px-2 py-0.5"
                style={{ fontSize: '0.6rem', letterSpacing: '0.08em' }}
              >
                SECURE
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl text-fg uppercase tracking-tight">
              Sign In
            </h1>
          </div>

          {/* Body */}
          <div
            className="space-y-4"
            style={{
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.35s ease 0.1s, transform 0.35s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <p className="text-sm text-muted">
              Authentication via AWS Cognito. You will be redirected to the secure sign-in portal.
            </p>

            <button
              id="login-cognito-btn"
              onClick={handleSignIn}
              disabled={loading || auth.isLoading}
              className="raw-btn raw-btn-accent w-full"
            >
              {loading || auth.isLoading
                ? <LoadingSpinner size="sm" label="REDIRECTING..." />
                : 'Continue with Cognito'
              }
            </button>
          </div>

          {/* Divider */}
          <div
            className="my-5 flex items-center gap-3"
            style={{
              opacity: step >= 3 ? 1 : 0,
              transition: 'opacity 0.35s ease 0.18s',
            }}
          >
            <div className="flex-1 h-px bg-line" />
            <span className="font-mono text-xs text-faint uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Guest back */}
          <div
            style={{
              opacity: step >= 3 ? 1 : 0,
              transform: step >= 3 ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.35s ease 0.18s, transform 0.35s cubic-bezier(0.16,1,0.3,1) 0.18s',
            }}
          >
            <button
              id="login-guest-btn"
              onClick={() => navigate('/')}
              className="raw-btn w-full"
            >
              Back to Guest Access
            </button>
          </div>
        </div>

        {/* Footnote */}
        <div
          className="mt-6 text-center animate-slide-up"
          style={{ animationDelay: '550ms' }}
        >
          <p className="font-mono text-xs text-faint">
            Protected by AWS Cognito · End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  )
}