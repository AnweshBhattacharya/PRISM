/**
 * components/Navbar.jsx
 * Responsive top navigation bar — RawBlock v2 design.
 * Shows Host controls when authenticated via Cognito.
 * Shows Guest room name when in a guest session.
 * Includes dark mode toggle via useDarkMode hook.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useGuest } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'

export default function Navbar() {
  const auth                          = useAuth()
  const { guestSession, logoutGuest } = useGuest()
  const navigate                      = useNavigate()
  const { dark, toggle }              = useDarkMode()
  const [menuOpen, setMenuOpen]       = useState(false)

  const handleHostLogout = () => {
    auth.removeUser()
    navigate('/')
  }

  const handleGuestLogout = () => {
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
            className="font-display font-bold uppercase tracking-tight text-base text-fg
                       hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform duration-100"
            style={{
              textShadow: 'none',
              transition: 'transform 0.12s ease',
            }}
          >
            Event<span className="text-muted">Snap</span>
          </Link>

          {/* ── Desktop Right side ───────────────── */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Host is logged in */}
            {auth.isAuthenticated && (
              <>
                <Link to="/dashboard" className="raw-btn text-sm">
                  Dashboard
                </Link>
                <button onClick={handleHostLogout} className="raw-btn text-sm">
                  Sign Out
                </button>
              </>
            )}

            {/* Guest is in a room */}
            {!auth.isAuthenticated && guestSession && (
              <>
                <span className="font-mono text-xs text-muted uppercase tracking-wide hidden md:block">
                  {guestSession.roomName}
                </span>
                <button onClick={handleGuestLogout} className="raw-btn text-sm">
                  Leave Room
                </button>
              </>
            )}

            {/* Not logged in at all */}
            {!auth.isAuthenticated && !guestSession && (
              <button
                id="navbar-host-login-btn"
                onClick={() => auth.signinRedirect()}
                className="raw-btn raw-btn-accent text-sm"
              >
                Host Login
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="raw-theme-toggle"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <span className="font-mono text-xs">{dark ? '☀' : '◑'}</span>
            </button>
          </div>

          {/* ── Mobile: hamburger + dark toggle ──── */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggle}
              className="raw-theme-toggle"
              aria-label="Toggle theme"
            >
              <span className="font-mono text-xs">{dark ? '☀' : '◑'}</span>
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="raw-btn !px-2 !py-1 !min-w-0"
              aria-label="Open menu"
            >
              <span className="font-mono text-sm">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile slide-down menu ────────────── */}
      {menuOpen && (
        <div className="sm:hidden border-t border-line bg-surface animate-slide-up">
          <div className="px-4 py-3 flex flex-col gap-2">
            {auth.isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className="raw-btn w-full justify-start text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleHostLogout(); setMenuOpen(false) }}
                  className="raw-btn w-full justify-start text-sm"
                >
                  Sign Out
                </button>
              </>
            )}

            {!auth.isAuthenticated && guestSession && (
              <>
                <p className="font-mono text-xs text-muted uppercase tracking-wide px-1 py-1">
                  Room: {guestSession.roomName}
                </p>
                <button
                  onClick={() => { handleGuestLogout(); setMenuOpen(false) }}
                  className="raw-btn w-full justify-start text-sm"
                >
                  Leave Room
                </button>
              </>
            )}

            {!auth.isAuthenticated && !guestSession && (
              <button
                onClick={() => { auth.signinRedirect(); setMenuOpen(false) }}
                className="raw-btn raw-btn-accent w-full justify-start text-sm"
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
