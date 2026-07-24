/**
 * context/AuthContext.jsx
 *
 * Manages the guest session (roomId + guestToken) in sessionStorage.
 * The Cognito host auth is handled separately by react-oidc-context in main.jsx.
 */
import { createContext, useContext, useState, useEffect } from 'react'

const GuestContext = createContext(null)

export function GuestProvider({ children }) {
  const [guestSession, setGuestSession] = useState(() => {
    // Restore session from sessionStorage on page reload
    try {
      const stored = sessionStorage.getItem('guestSession')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Persist session changes to sessionStorage
  useEffect(() => {
    if (guestSession) {
      sessionStorage.setItem('guestSession', JSON.stringify(guestSession))
      sessionStorage.setItem('guestToken', guestSession.guestToken)
    } else {
      sessionStorage.removeItem('guestSession')
      sessionStorage.removeItem('guestToken')
    }
  }, [guestSession])

  /**
   * Called after a successful room code validation.
   * Stores the JWT and room metadata for the duration of the session.
   */
  const loginAsGuest = (roomId, data) => {
    setGuestSession({
      roomId,
      guestToken:    data.guestToken,
      roomName:      data.roomName,
      allowDownload: data.allowDownload,
      expiryDate:    data.expiryDate,
    })
  }

  const logoutGuest = () => setGuestSession(null)

  return (
    <GuestContext.Provider value={{ guestSession, loginAsGuest, logoutGuest }}>
      {children}
    </GuestContext.Provider>
  )
}

/** Hook to access the guest session context. */
export function useGuest() {
  const ctx = useContext(GuestContext)
  if (!ctx) throw new Error('useGuest must be used inside <GuestProvider>')
  return ctx
}
