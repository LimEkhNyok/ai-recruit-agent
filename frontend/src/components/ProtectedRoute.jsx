import { Outlet } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { useTranslation } from '../i18n'

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--ctw-text-tertiary)' }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h3
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ctw-text-primary)',
            margin: '16px 0 0',
          }}
        >
          {t('guard.loginRequired')}
        </h3>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ctw-text-secondary)',
            margin: '8px 0 0',
            textAlign: 'center',
            maxWidth: 520,
          }}
        >
          {t('guard.loginRequiredDesc')}
        </p>
        <button
          onClick={() => navigate('/login')}
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
          {t('common.goLogin')}
        </button>
      </div>
    )
  }

  return <Outlet />
}
