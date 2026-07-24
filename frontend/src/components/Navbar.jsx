/**
 * components/Navbar.jsx
 * Responsive top navigation bar.
 * Shows Host controls when authenticated via Cognito.
 * Shows Guest room name when in a guest session.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useGuest } from '../context/AuthContext'

export default function Navbar() {
  const auth         = useAuth()
  const { guestSession, logoutGuest } = useGuest()
  const navigate     = useNavigate()

  const handleHostLogout = () => {
    auth.removeUser()
    navigate('/')
  }

  const handleGuestLogout = () => {
    logoutGuest()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ─────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-brand-500/40 transition-shadow">
              ES
            </div>
            <span className="font-bold text-lg gradient-text">EventSnap</span>
          </Link>

          {/* ── Right side ───────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Host is logged in */}
            {auth.isAuthenticated && (
              <>
                <Link to="/dashboard" className="btn-secondary text-sm py-2 px-4">
                  Dashboard
                </Link>
                <button
                  onClick={handleHostLogout}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}

            {/* Guest is in a room */}
            {!auth.isAuthenticated && guestSession && (
              <>
                <span className="text-sm text-white/50 hidden sm:block">
                  📸 {guestSession.roomName}
                </span>
                <button
                  onClick={handleGuestLogout}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  Leave Room
                </button>
              </>
            )}

            {/* Not logged in at all */}
            {!auth.isAuthenticated && !guestSession && (
              <button
                onClick={() => auth.signinRedirect()}
                className="btn-primary text-sm py-2 px-4"
              >
                Host Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
