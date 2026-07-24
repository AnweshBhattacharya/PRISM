import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { GuestProvider } from './context/AuthContext'

import Home          from './pages/Home'
import HostDashboard from './pages/HostDashboard'
import GuestUpload   from './pages/GuestUpload'
import GuestView     from './pages/GuestView'
import Navbar        from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'

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
        <div className="min-h-screen bg-dark-900 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* ── Public Routes ─────────────────────── */}
              <Route path="/"                    element={<Home />} />

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
