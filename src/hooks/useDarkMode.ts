import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem('theme') as Theme) || 'system'
  })

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = () => {
      let dark = false

      if (theme === 'dark') {
        dark = true
      } else if (theme === 'light') {
        dark = false
      } else {
        // System preference
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }

      setIsDark(dark)

      if (dark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setThemeAndPersist = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const toggleDark = () => {
    setThemeAndPersist(isDark ? 'light' : 'dark')
  }

  return {
    theme,
    setTheme: setThemeAndPersist,
    isDark,
    toggleDark,
  }
}
