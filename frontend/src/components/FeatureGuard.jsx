import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useFeatureGuard from '../hooks/useFeatureGuard'
import { getConfig } from '../api/modelConfig'
import { useTranslation } from '../i18n'

export default function FeatureGuard({ feature, children }) {
  const { loading: featureLoading, available, featureLabel } = useFeatureGuard(feature)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [configLoading, setConfigLoading] = useState(true)
  const [hasConfigured, setHasConfigured] = useState(false)

  useEffect(() => {
    getConfig()
      .then((res) => {
        setHasConfigured(res.data.last_test_status != null)
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false))
  }, [])

  if (featureLoading || configLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            color: 'var(--ctw-text-tertiary)',
          }}
        >
          {'>'}_<span className="animate-cursor-blink">|</span>
        </span>
      </div>
    )
  }

  if (!hasConfigured) {
    return (
      <GuardState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        }
        title={t('guard.configRequired')}
        description={t('guard.configRequiredDesc')}
        buttonText={t('common.goSettings')}
        onAction={() => navigate('/settings')}
      />
    )
  }

  if (!available) {
    return (
      <GuardState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        }
        title={`${t('guard.featureUnavailable')} - ${featureLabel}`}
        description={t('guard.featureUnavailableDesc')}
        buttonText={t('common.goSettings')}
        onAction={() => navigate('/settings')}
      />
    )
  }

  return children
}

function GuardState({ icon, title, description, buttonText, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
      <div style={{ color: 'var(--ctw-text-tertiary)' }}>
        {icon}
      </div>
      <h3
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--ctw-text-primary)',
          margin: '16px 0 0',
          textAlign: 'center',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: 'var(--ctw-text-secondary)',
          margin: '8px 0 0',
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 24,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            padding: '10px 32px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--ctw-text-primary)',
            color: 'var(--ctw-surface-card)',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {buttonText}
        </button>
      )}
    </div>
  )
}
