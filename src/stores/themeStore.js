import { create } from 'zustand'

function getInitialTheme() {
  const stored = localStorage.getItem('ui-theme')
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('ui-theme', next)
      return { theme: next }
    }),
  setTheme: (theme) => {
    localStorage.setItem('ui-theme', theme)
    set({ theme })
  },
}))
