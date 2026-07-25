import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { useEffect } from 'react'
import { setHostToken } from './services/api'
import { GuestProvider } from './context/AuthContext'

import Home          from './pages/Home'
import Login         from './pages/Login'
import HostDashboard from './pages/HostDashboard'
import GuestUpload   from './pages/GuestUpload'
import GuestView     from './pages/GuestView'
import Navbar        from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'

/**
 * OidcTokenSync — sync the Cognito ID token to the API layer
 * whenever the user authenticates or the token refreshes.
 */
function OidcTokenSync() {
  const auth = useAuth()

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.id_token) {
      // Set the ID token (without Bearer prefix) for Cognito User Pool authorizer
      setHostToken(auth.user.id_token)
    } else {
      // Clear token if logged out
      setHostToken(null)
    }
  }, [auth.isAuthenticated, auth.user?.id_token])

  return null
}

/**
 * ProtectedRoute — wraps host-only pages.
 * If Cognito auth is still loading, shows a spinner.
 * If the user is not authenticated, redirects to home.
 */
function ProtectedRoute({ children }) {
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    // Trigger Cognito login redirect
    auth.signinRedirect()
    return null
  }

  return children
}

export default function App() {
  return (
    <GuestProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg flex flex-col">
          <OidcTokenSync />
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* ── Public Routes ─────────────────────── */}
              <Route path="/"       element={<Home />} />
              <Route path="/login"  element={<Login />} />

              {/* ── Guest Routes (guest JWT auth) ─────── */}
              <Route path="/room/:roomId/upload" element={<GuestUpload />} />
              <Route path="/room/:roomId/view"   element={<GuestView />} />

              {/* ── Host Routes (Cognito auth) ─────────── */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <HostDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Catch-all ─────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </GuestProvider>
  )
}
