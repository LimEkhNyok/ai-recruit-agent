import useThemeStore from '../store/useThemeStore'

export default function LanguageToggle({ style }) {
  const language = useThemeStore((s) => s.language)
  const setLanguage = useThemeStore((s) => s.setLanguage)

  return (
    <div
      className="flex items-center"
      style={{
        borderRadius: 8,
        border: '1px solid var(--ctw-border-default)',
        overflow: 'hidden',
        height: 36,
        ...style,
      }}
    >
      <button
        onClick={() => setLanguage('zh')}
        aria-label="Chinese"
        className="px-2.5 text-xs font-medium transition-colors duration-200"
        style={{
          height: '100%',
          border: 'none',
          cursor: 'pointer',
          background: language === 'zh' ? '#0066FF' : 'transparent',
          color: language === 'zh' ? '#fff' : 'var(--ctw-text-tertiary)',
        }}
      >
        ZH
      </button>
      <button
        onClick={() => setLanguage('en')}
        aria-label="English"
        className="px-2.5 text-xs font-medium transition-colors duration-200"
        style={{
          height: '100%',
          border: 'none',
          cursor: 'pointer',
          background: language === 'en' ? '#0066FF' : 'transparent',
          color: language === 'en' ? '#fff' : 'var(--ctw-text-tertiary)',
        }}
      >
        EN
      </button>
    </div>
  )
}
