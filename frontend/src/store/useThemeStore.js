import { create } from 'zustand'

const getInitialTheme = () => {
  const saved = localStorage.getItem('ctw-theme')
  if (saved === 'light' || saved === 'dark') return saved
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const getInitialLanguage = () => {
  const saved = localStorage.getItem('ctw-language')
  if (saved === 'zh' || saved === 'en') return saved
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) return 'en'
  return 'zh'
}

const applyTheme = (theme) => {
  if (typeof document !== 'undefined') {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
}

const initialTheme = getInitialTheme()
applyTheme(initialTheme)

const useThemeStore = create((set) => ({
  theme: initialTheme,
  language: getInitialLanguage(),
  hasUsedApi: localStorage.getItem('ctw-has-used-api') === 'true',

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('ctw-theme', next)
      applyTheme(next)
      return { theme: next }
    }),

  setLanguage: (lang) =>
    set(() => {
      localStorage.setItem('ctw-language', lang)
      return { language: lang }
    }),

  markApiUsed: () =>
    set(() => {
      localStorage.setItem('ctw-has-used-api', 'true')
      return { hasUsedApi: true }
    }),
}))

export default useThemeStore
