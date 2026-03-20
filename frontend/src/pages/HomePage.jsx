import { useState, useEffect } from 'react'
import {
  FormOutlined,
  AimOutlined,
  AudioOutlined,
  RocketOutlined,
  FileTextOutlined,
  BulbOutlined,
  SettingOutlined,
  LoginOutlined,
  CloudUploadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Modal, message } from 'antd'
import useAuthStore from '../store/useAuthStore'
import useBillingStore from '../store/useBillingStore'
import { getProfile } from '../api/assessment'
import { getResults } from '../api/matching'
import { getConfig, getFeatures } from '../api/modelConfig'
import { useTranslation } from '../i18n'
import FadeIn from '../components/motion/FadeIn'
import StaggerContainer, { StaggerItem } from '../components/motion/StaggerContainer'

const FEATURE_META = [
  { key: 'assessment', icon: FormOutlined, featured: true },
  { key: 'interview', icon: AudioOutlined, featured: true },
  { key: 'matching', icon: AimOutlined },
  { key: 'career', icon: RocketOutlined },
  { key: 'quiz', icon: BulbOutlined },
  { key: 'resume', icon: FileTextOutlined, isUpload: true },
]

const MODE_LABELS = { byok: 'byokLabel', platform: 'platformLabel' }

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const [hasProfile, setHasProfile] = useState(false)
  const [hasMatch, setHasMatch] = useState(false)
  const [modelConfig, setModelConfig] = useState(null)
  const [featureStatus, setFeatureStatus] = useState(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const { wallet, fetchWallet } = useBillingStore()

  useEffect(() => {
    if (!token) return

    getProfile().then(() => setHasProfile(true)).catch(() => {})
    getResults().then((res) => {
      if (res.data.results?.length > 0) setHasMatch(true)
    }).catch(() => {})

    getConfig()
      .then((res) => {
        setModelConfig(res.data)
        if (res.data.mode === 'platform') fetchWallet()
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true))

    getFeatures()
      .then((res) => setFeatureStatus(res.data))
      .catch(() => {})
  }, [token])

  const hasConfigured = modelConfig?.last_test_status != null

  const handleFeatureClick = (f) => {
    if (!token) {
      Modal.confirm({
        title: t('home.loginRequired'),
        content: t('home.loginRequiredDesc'),
        icon: <LoginOutlined style={{ color: '#0066FF' }} />,
        okText: t('common.goLogin'),
        cancelText: t('common.cancel'),
        onOk: () => navigate('/login'),
        width: 560,
      })
      return
    }

    if (!hasConfigured) {
      Modal.confirm({
        title: t('home.configRequired'),
        content: t('home.configRequiredDesc'),
        icon: <SettingOutlined style={{ color: '#fa8c16' }} />,
        okText: t('common.goSettings'),
        cancelText: t('common.cancel'),
        onOk: () => navigate('/settings'),
      })
      return
    }

    const disabled = featureStatus && featureStatus[f.key] === false
    if (disabled) return

    if (f.key === 'interview') {
      navigate('/matching')
    } else if (f.key === 'resume') {
      message.info(t('home.uploadResumeHint'))
    } else {
      navigate(`/${f.key === 'assessment' ? 'assessment' : f.key}`)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--ctw-border-default) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Gradient orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 600,
            height: 600,
            top: -100,
            left: '50%',
            transform: 'translateX(-70%)',
            background: '#0066FF',
            borderRadius: '50%',
            filter: 'blur(120px)',
            opacity: 0.15,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500,
            height: 500,
            top: 0,
            left: '50%',
            transform: 'translateX(20%)',
            background: '#00D4AA',
            borderRadius: '50%',
            filter: 'blur(120px)',
            opacity: 0.1,
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6" style={{ paddingTop: 120 }}>
          <FadeIn>
            <h1
              className="text-center font-display"
              style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, color: 'var(--ctw-text-primary)' }}
            >
              <span className="font-mono">{t('home.heroTitleCode')}</span>
              <span
                className="font-mono"
                style={{ color: '#0066FF' }}
              >
                {t('home.heroTitleTo')}
              </span>
              <span className="font-mono">{t('home.heroTitleWork')}</span>
              <span
                className="inline-block font-mono"
                style={{
                  color: '#0066FF',
                  animation: 'blink 1s step-end infinite',
                  marginLeft: 2,
                }}
              >
                |
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.15}>
            <p
              className="text-center mx-auto font-body"
              style={{
                fontSize: 18,
                color: 'var(--ctw-text-secondary)',
                maxWidth: 560,
                marginTop: 24,
                lineHeight: 1.6,
              }}
            >
              {t('home.heroSubtitle')}
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex items-center justify-center gap-4" style={{ marginTop: 40, paddingBottom: 80 }}>
              <button
                onClick={() => token ? navigate('/assessment') : navigate('/login')}
                className="font-body"
                style={{
                  padding: '12px 32px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#fff',
                  background: '#0066FF',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'opacity 200ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {t('home.getStarted')}
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('features-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="font-body"
                style={{
                  padding: '12px 32px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--ctw-text-primary)',
                  background: 'transparent',
                  border: '1.5px solid var(--ctw-text-tertiary)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'border-color 200ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ctw-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ctw-text-tertiary)'}
              >
                {t('home.learnMore')}
              </button>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Config Banner */}
      {token && configLoaded && !hasConfigured && (
        <FadeIn>
          <div className="max-w-5xl mx-auto px-6" style={{ marginBottom: 32 }}>
            <div
              className="flex items-center justify-between gap-4 px-5 py-4"
              style={{
                border: '1px solid var(--ctw-border-default)',
                borderRadius: 12,
              }}
            >
              <div className="flex items-center gap-3">
                <SettingOutlined style={{ fontSize: 16, color: 'var(--ctw-text-tertiary)' }} />
                <span className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)' }}>
                  {t('home.configBanner')}
                </span>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-1 font-body"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#0066FF',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t('home.configBannerAction')}
                <ArrowRightOutlined style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Status Bar (configured) */}
      {token && configLoaded && hasConfigured && (
        <FadeIn>
          <div className="max-w-5xl mx-auto px-6" style={{ marginBottom: 32 }}>
            <div
              className="flex items-center justify-between flex-wrap gap-3 px-5 py-3"
              style={{
                border: '1px solid var(--ctw-border-default)',
                borderRadius: 12,
                background: 'var(--ctw-surface-card)',
              }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="font-mono"
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--ctw-surface-base)',
                    border: '1px solid var(--ctw-border-default)',
                    color: 'var(--ctw-text-secondary)',
                  }}
                >
                  {t(`home.${MODE_LABELS[modelConfig.mode]}`, modelConfig.mode)}
                </span>
                {modelConfig.mode === 'byok' && modelConfig.model && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--ctw-surface-base)',
                      border: '1px solid var(--ctw-border-default)',
                      color: 'var(--ctw-text-secondary)',
                    }}
                  >
                    {modelConfig.model}
                  </span>
                )}
                {featureStatus && (
                  <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)' }}>
                    {t('home.availableFeatures')}:
                    {' '}{Object.entries(featureStatus).filter(([, v]) => v).length} / {Object.keys(featureStatus).length}
                  </span>
                )}
                {modelConfig?.mode === 'platform' && wallet && (
                  <>
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--ctw-text-secondary)' }}>
                      {wallet.balance} {t('home.credits')}
                    </span>
                    <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-success)' }}>
                      {t('home.freeQuizToday')} {wallet.free_quiz_remaining}/3
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-1.5 font-body"
                style={{
                  fontSize: 13,
                  color: 'var(--ctw-text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <SettingOutlined style={{ fontSize: 14 }} />
                {t('home.modelSettings')}
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      {/* User greeting */}
      {token && (
        <FadeIn>
          <div className="max-w-5xl mx-auto px-6" style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                {t('home.greeting')}{user?.name}
              </span>
              <div className="flex gap-2">
                {hasProfile ? (
                  <span
                    className="font-body"
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'rgba(0, 212, 170, 0.1)',
                      color: 'var(--ctw-success)',
                    }}
                  >
                    {t('home.assessed')}
                  </span>
                ) : (
                  <span
                    className="font-body"
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'var(--ctw-surface-base)',
                      color: 'var(--ctw-text-tertiary)',
                    }}
                  >
                    {t('home.notAssessed')}
                  </span>
                )}
                {hasMatch && (
                  <span
                    className="font-body"
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'rgba(0, 212, 170, 0.1)',
                      color: 'var(--ctw-success)',
                    }}
                  >
                    {t('home.matched')}
                  </span>
                )}
              </div>
            </div>
            {!hasProfile && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{
                  border: '1px solid var(--ctw-border-default)',
                  borderRadius: 12,
                  background: 'var(--ctw-surface-card)',
                }}
              >
                <span className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)' }}>
                  {t('home.startAssessment')}
                </span>
                <button
                  onClick={() => navigate('/assessment')}
                  className="font-body"
                  style={{
                    padding: '6px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#fff',
                    background: '#0066FF',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {t('home.getStarted')}
                </button>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {!token && (
        <FadeIn>
          <div className="max-w-5xl mx-auto px-6" style={{ marginBottom: 24 }}>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                border: '1px solid var(--ctw-border-default)',
                borderRadius: 12,
                background: 'var(--ctw-surface-card)',
              }}
            >
              <span className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)' }}>
                {t('home.loginBanner')}
              </span>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 font-body"
                style={{
                  padding: '6px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#fff',
                  background: '#0066FF',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <LoginOutlined style={{ fontSize: 14 }} />
                {t('common.goLogin')}
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Features Section */}
      <div id="features-section" className="max-w-5xl mx-auto px-6" style={{ paddingTop: 96, paddingBottom: 80 }}>
        <FadeIn>
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2
              className="font-display"
              style={{ fontSize: 32, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 8 }}
            >
              {t('home.features')}
            </h2>
            <p className="font-body" style={{ fontSize: 16, color: 'var(--ctw-text-secondary)' }}>
              {t('home.featuresSubtitle')}
            </p>
          </div>
        </FadeIn>

        <StaggerContainer
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {FEATURE_META.map((f) => {
            const disabled = token && featureStatus && featureStatus[f.key] === false
            const Icon = f.icon
            const isFeatured = f.featured
            const isUpload = f.isUpload

            return (
              <StaggerItem
                key={f.key}
                style={{ height: '100%' }}
              >
                <div
                  onClick={() => handleFeatureClick(f)}
                  className="group relative"
                  style={{
                    padding: 24,
                    border: '1px solid var(--ctw-border-default)',
                    borderRadius: 12,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'border-color 200ms, transform 200ms, box-shadow 200ms',
                    background: 'var(--ctw-surface-card)',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    if (disabled) return
                    e.currentTarget.style.borderColor = '#0066FF'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)'
                  }}
                  onMouseLeave={(e) => {
                    if (disabled) return
                    e.currentTarget.style.borderColor = 'var(--ctw-border-default)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {disabled && (
                    <span
                      className="absolute font-body"
                      style={{
                        top: 8,
                        right: 12,
                        fontSize: 11,
                        color: 'var(--ctw-error)',
                      }}
                    >
                      {t('home.unavailable')}
                    </span>
                  )}
                  <Icon style={{ fontSize: 24, color: 'var(--ctw-text-tertiary)', marginBottom: 16, display: 'block' }} />
                  <h3
                    className="font-display"
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ctw-text-primary)',
                      marginBottom: 6,
                      marginTop: 0,
                    }}
                  >
                    {t(`home.${f.key}.title`)}
                  </h3>
                  <p
                    className="font-body"
                    style={{
                      fontSize: 13,
                      color: 'var(--ctw-text-tertiary)',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {t(`home.${f.key}.desc`)}
                  </p>

                  {/* Gradient bottom border */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: -1,
                      right: -1,
                      height: 2,
                      background: 'linear-gradient(90deg, #0066FF, #00D4AA)',
                      borderRadius: '0 0 12px 12px',
                    }}
                  />
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>

      {/* Footer */}
      <div className="text-center" style={{ paddingBottom: 48 }}>
        <p className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-tertiary)' }}>
          {t('brand.copyright')}
        </p>
      </div>

      {/* Blink cursor keyframes */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (max-width: 768px) {
          .grid { grid-template-columns: repeat(2, 1fr) !important; }
          h1 { font-size: 36px !important; }
        }
        @media (max-width: 480px) {
          .grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
