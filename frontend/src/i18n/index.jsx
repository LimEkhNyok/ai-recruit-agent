import { createContext, useContext, useCallback, useMemo } from 'react'
import useThemeStore from '../store/useThemeStore'
import zh from './zh.json'
import en from './en.json'

const translations = { zh, en }

const I18nContext = createContext(null)

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

export function I18nProvider({ children }) {
  const language = useThemeStore((s) => s.language)

  const t = useCallback(
    (key, fallback) => {
      const value = getNestedValue(translations[language], key)
      return value ?? fallback ?? key
    },
    [language],
  )

  const contextValue = useMemo(() => ({ t, language }), [t, language])

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useTranslation must be used within I18nProvider')
  return context
}
