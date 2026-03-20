import { useTranslation } from '../i18n'

export default function ErrorState({ message: msg, onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-error" style={{ fontSize: 40, lineHeight: 1 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      {msg && (
        <p
          className="text-fg mt-4"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: 0, marginTop: 16, textAlign: 'center', maxWidth: 400 }}
        >
          {msg}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            padding: '8px 24px',
            borderRadius: 8,
            border: '1px solid var(--ctw-border-default)',
            background: 'var(--ctw-text-primary)',
            color: 'var(--ctw-surface-card)',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {t('error.retry')}
        </button>
      )}
    </div>
  )
}
