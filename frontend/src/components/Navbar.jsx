/**
 * components/Navbar.jsx
 * Responsive top navigation bar — RawBlock v2 design.
 * Shows Host controls when authenticated via Cognito.
 * Shows Guest room name when in a guest session.
 * Includes dark mode toggle via useDarkMode hook.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useGuest } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'

// Monochrome sun / moon glyphs — line-art to match the rest of the RawBlock
// icon language (see PrismGeometry in Login.jsx). Swapped in for the old
// "Dark"/"Light" text label.
function ThemeIcon({ dark }) {
  return dark ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="12"
          y1="2.5"
          x2="12"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </svg>
  )
}

const FOCUS_TICKS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-[rgb(var(--surface))]'

export default function Navbar() {
  const auth                          = useAuth()
  const { guestSession, logoutGuest } = useGuest()
  const navigate                      = useNavigate()
  const location                      = useLocation()
  const { dark, toggle }              = useDarkMode()
  const [menuOpen, setMenuOpen]       = useState(false)

  // Sign-out/leave-room is a two-step process: our own context clears
  // synchronously, but auth.removeUser() (Cognito) and the router navigation
  // both resolve a tick later. In that gap the old code kept reading
  // guestSession/auth.isAuthenticated straight from context, so the stale
  // room name or "Dashboard" link could flash for a frame. signingOut is a
  // local, synchronous override: the instant a logout is requested, the
  // navbar renders as logged-out, full stop — no waiting on other state.
  const [signingOut, setSigningOut]   = useState(false)

  // A genuinely active guest session needs a roomId, not just a truthy object.
  // Treating any truthy value as "in a room" is what let a stale/partial
  // session object (e.g. one mid-clear) flash leftover room text after
  // sign-out or "Leave Room".
  const hasGuestSession = !signingOut && Boolean(guestSession?.roomId)
  const isAuthenticated = !signingOut && auth.isAuthenticated

  // Belt-and-braces: whenever auth state, guest session, or route changes,
  // force the mobile menu closed so it can never render a stale state for
  // even one frame after logout/navigation.
  useEffect(() => {
    setMenuOpen(false)
  }, [auth.isAuthenticated, hasGuestSession, location.pathname])

  // Once we land on a fresh route, it's safe to stop overriding — context
  // should have caught up by then.
  useEffect(() => {
    setSigningOut(false)
  }, [location.pathname])

  const handleHostLogout = () => {
    setSigningOut(true)
    logoutGuest()
    auth.removeUser().catch(() => {})
    navigate('/')
  }

  const handleGuestLogout = () => {
    setSigningOut(true)
    logoutGuest()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* ── Logo ─────────────────────────────── */}
          <Link
            to="/"
            className={`font-display font-bold uppercase tracking-tight text-base text-fg rounded-sm
                       hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform duration-100
                       ${FOCUS_TICKS}`}
            style={{
              textShadow: 'none',
              transition: 'transform 0.12s ease',
            }}
          >
            <span className="truncate max-w-[10rem] block">Prism</span>
          </Link>

          {/* ── Desktop Right side ───────────────── */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Host is logged in */}
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={`raw-btn text-sm transition-colors duration-150 hover:bg-[rgb(var(--fg)/0.05)] ${FOCUS_TICKS}`}>
                  Dashboard
                </Link>
                <button onClick={handleHostLogout} className={`raw-btn text-sm transition-colors duration-150 hover:bg-[rgb(var(--fg)/0.05)] ${FOCUS_TICKS}`}>
                  Sign Out
                </button>
              </>
            )}

            {/* Guest is in a room */}
            {!isAuthenticated && hasGuestSession && (
              <>
                <span className="font-mono text-xs text-muted uppercase tracking-wide hidden md:block">
                  {guestSession.roomName || 'Guest room'}
                </span>
                <button onClick={handleGuestLogout} className={`raw-btn text-sm transition-colors duration-150 hover:bg-[rgb(var(--fg)/0.05)] ${FOCUS_TICKS}`}>
                  Leave Room
                </button>
              </>
            )}

            {/* Not logged in at all */}
            {!isAuthenticated && !hasGuestSession && (
              <button
                id="navbar-host-login-btn"
                onClick={() => auth.signinRedirect()}
                className={`raw-btn raw-btn-accent text-sm transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 ${FOCUS_TICKS}`}
              >
                Host Login
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className={`raw-theme-toggle transition-colors duration-150 ${FOCUS_TICKS}`}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <ThemeIcon dark={dark} />
            </button>
          </div>

          {/* ── Mobile: hamburger + dark toggle ──── */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggle}
              className={`raw-theme-toggle transition-colors duration-150 ${FOCUS_TICKS}`}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <ThemeIcon dark={dark} />
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`raw-btn !px-2 !py-1 !min-w-0 ${FOCUS_TICKS}`}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <span className="font-sans text-sm">{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile slide-down menu ────────────── */}
      {menuOpen && (
        <div className="sm:hidden border-t border-line bg-surface animate-slide-up">
          <div className="px-4 py-3 flex flex-col gap-2">
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className={`raw-btn w-full justify-start text-sm ${FOCUS_TICKS}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleHostLogout(); setMenuOpen(false) }}
                  className={`raw-btn w-full justify-start text-sm ${FOCUS_TICKS}`}
                >
                  Sign Out
                </button>
              </>
            )}

            {!isAuthenticated && hasGuestSession && (
              <>
                <p className="font-mono text-xs text-muted uppercase tracking-wide px-1 py-1">
                  Room: {guestSession.roomName || 'Guest room'}
                </p>
                <button
                  onClick={() => { handleGuestLogout(); setMenuOpen(false) }}
                  className={`raw-btn w-full justify-start text-sm ${FOCUS_TICKS}`}
                >
                  Leave Room
                </button>
              </>
            )}

            {!isAuthenticated && !hasGuestSession && (
              <button
                onClick={() => { auth.signinRedirect(); setMenuOpen(false) }}
                className={`raw-btn raw-btn-accent w-full justify-start text-sm ${FOCUS_TICKS}`}
              >
                Host Login
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
