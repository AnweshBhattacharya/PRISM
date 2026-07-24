/**
 * hooks/useDarkMode.js
 *
 * Toggles the `html.dark` class used by RawBlock v2 for dark mode.
 * Preference is persisted to localStorage and applied on first load.
 */
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'rawblock-theme'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    // Check localStorage first, then fall back to system preference
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => setDark((d) => !d)

  return { dark, toggle }
}
