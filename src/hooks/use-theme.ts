import { useCallback, useEffect, useState } from 'react'

/**
 * Dark/light theme toggle backed by localStorage (`bc-theme`) and reflected on
 * the <html> element as a `dark` class (Tailwind `darkMode: 'class'`). A
 * matching inline script in index.html applies the persisted theme before
 * paint to avoid a flash of the wrong theme on reload.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'bc-theme'

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore storage failures */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggle }
}
