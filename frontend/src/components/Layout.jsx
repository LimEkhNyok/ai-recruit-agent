import { useState, useRef, useEffect } from 'react'
import { Dropdown, Avatar, Button, Modal, message, Spin, Tag } from 'antd'
import {
  HomeOutlined,
  FormOutlined,
  AimOutlined,
  RocketOutlined,
  EditOutlined,
  SettingOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  UploadOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  CrownOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  CloseOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import useBillingStore from '../store/useBillingStore'
import { uploadResume, analyzeResume } from '../api/resume'
import { getConfig } from '../api/modelConfig'
import ResumeReport from './ResumeReport'
import useThemeStore from '../store/useThemeStore'
import { useTranslation } from '../i18n'
import LogoMark from './LogoMark'
import FadeIn from './motion/FadeIn'

const navConfig = [
  { key: '/', icon: <HomeOutlined />, labelKey: 'nav.home' },
  { key: '/assessment', icon: <FormOutlined />, labelKey: 'nav.assessment' },
  { key: '/matching', icon: <AimOutlined />, labelKey: 'nav.matching' },
  { key: '/career', icon: <RocketOutlined />, labelKey: 'nav.career' },
  { key: '/quiz', icon: <EditOutlined />, labelKey: 'nav.quiz' },
  { key: '/usage', icon: <BarChartOutlined />, labelKey: 'nav.usage' },
  { key: '/settings', icon: <SettingOutlined />, labelKey: 'nav.settings' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { wallet, fetchWallet } = useBillingStore()
  const fileInputRef = useRef(null)
  const { t } = useTranslation()
  const { theme, toggleTheme, language, setLanguage, hasUsedApi, markApiUsed } = useThemeStore()

  const handleLanguageSwitch = (lang) => {
    if (lang === language) return
    if (hasUsedApi) {
      Modal.confirm({
        title: '切换语言 / Switch Language',
        content: (
          <div>
            <p style={{ marginBottom: 8 }}>切换语言后，AI 已生成的内容（测评、匹配、规划等）需要重新生成才能显示为新语言，可能带来 tokens 的浪费。</p>
            <p style={{ margin: 0, color: 'var(--ctw-text-secondary)' }}>Switching language requires regenerating AI-generated content (assessment, matching, career plan, etc.) to display in the new language, which may result in wasted tokens.</p>
          </div>
        ),
        okText: '确认切换 / Confirm',
        cancelText: '取消 / Cancel',
        onOk: () => setLanguage(lang),
        width: 520,
      })
    } else {
      setLanguage(lang)
    }
  }

  const [resumeId, setResumeId] = useState(null)
  const [resumeFilename, setResumeFilename] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [isPlatformMode, setIsPlatformMode] = useState(false)
  const [hasConfigured, setHasConfigured] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    const loadMode = async () => {
      try {
        const res = await getConfig()
        const mode = res.data.mode
        const configured = res.data.last_test_status != null
        setHasConfigured(configured)
        setIsPlatformMode(mode === 'platform' && configured)
        if (mode === 'platform' && configured) {
          fetchWallet()
        }
      } catch {}
    }
    if (user) loadMode()
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      onClick: handleLogout,
    },
  ]

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      const res = await uploadResume(file)
      setResumeId(res.data.resume_id)
      setResumeFilename(res.data.filename)
      setAnalysis(null)
      message.success(`${t('resume.uploadSuccess')}: ${res.data.filename}`)
    } catch (err) {
      message.error(err.response?.data?.detail || t('resume.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!resumeId) return
    if (!hasConfigured) {
      Modal.confirm({
        title: t('guard.configRequired'),
        content: t('guard.configRequiredDesc'),
        okText: t('common.goSettings'),
        cancelText: t('common.cancel'),
        onOk: () => navigate('/settings'),
      })
      return
    }
    setAnalyzing(true)
    try {
      const res = await analyzeResume(resumeId)
      setAnalysis(res.data.analysis)
      markApiUsed()
      setShowReport(true)
    } catch (err) {
      message.error(err.response?.data?.detail || t('resume.analyzeFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  const isDark = theme === 'dark'

  const headerBg = isDark ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)'
  const headerBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--ctw-surface-base)' }}
    >
      {/* Header */}
      <FadeIn direction="down" duration={0.4}>
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-6"
          style={{
            height: 64,
            background: headerBg,
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            borderBottom: `1px solid ${headerBorder}`,
          }}
        >
          {/* Left: Logo + separator + nav */}
          <div className="flex items-center gap-6">
            <LogoMark size="md" onClick={() => navigate('/')} />

            <div
              className="hidden md:block"
              style={{
                width: 1,
                height: 24,
                background: 'var(--ctw-border-default)',
              }}
            />

            <nav className="hidden md:flex items-center gap-1">
              {navConfig.map((item) => {
                const isActive = location.pathname === item.key
                return (
                  <a
                    key={item.key}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(item.key)
                    }}
                    href={item.key}
                    className="relative px-3 py-2 text-sm font-medium transition-colors duration-200 select-none"
                    style={{
                      color: isActive
                        ? 'var(--ctw-text-primary)'
                        : 'var(--ctw-text-tertiary)',
                      textDecoration: 'none',
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = 'var(--ctw-text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = 'var(--ctw-text-tertiary)'
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.icon}
                      {t(item.labelKey)}
                    </span>
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3"
                        style={{
                          height: 2,
                          background: '#0066FF',
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </a>
                )
              })}
            </nav>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={t('nav.toggleTheme')}
              className="flex items-center justify-center transition-transform duration-300 hover:scale-110"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--ctw-border-default)',
                background: 'transparent',
                color: 'var(--ctw-text-secondary)',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              <span
                className="inline-block transition-transform duration-300"
                style={{
                  transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                {isDark ? <MoonOutlined /> : <SunOutlined />}
              </span>
            </button>

            {/* Language toggle */}
            <div
              className="hidden sm:flex items-center"
              style={{
                borderRadius: 8,
                border: '1px solid var(--ctw-border-default)',
                overflow: 'hidden',
                height: 36,
              }}
            >
              <button
                onClick={() => handleLanguageSwitch('zh')}
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
                onClick={() => handleLanguageSwitch('en')}
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

            {token ? (
              <>
                {isPlatformMode && wallet && (
                  <Tag
                    icon={wallet.subscription_active ? <CrownOutlined /> : <WalletOutlined />}
                    color={wallet.subscription_active ? 'gold' : 'blue'}
                    style={{ cursor: 'pointer', fontSize: 13, padding: '2px 10px' }}
                    onClick={() => navigate('/settings')}
                  >
                    {wallet.subscription_active
                      ? (wallet.subscription_plan === 'weekly'
                          ? t('settings.weekly')
                          : t('settings.monthly'))
                      : `${wallet.balance} ${t('settings.balance')}`}
                  </Tag>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <Button
                  icon={resumeId ? <CheckCircleOutlined /> : <UploadOutlined />}
                  onClick={handleUploadClick}
                  loading={uploading}
                  className="hidden sm:inline-flex"
                  style={
                    resumeId
                      ? {
                          color: 'var(--ctw-success)',
                          borderColor: 'var(--ctw-success)',
                          borderWidth: 1.5,
                          borderRadius: 8,
                          height: 36,
                        }
                      : { borderRadius: 8, height: 36, borderWidth: 1.5, borderColor: 'var(--ctw-text-tertiary)' }
                  }
                >
                  {resumeId ? t('nav.reuploadResume') : t('nav.uploadResume')}
                </Button>

                {resumeId && (
                  <Button
                    icon={<FileSearchOutlined />}
                    onClick={analysis ? () => setShowReport(true) : handleAnalyze}
                    loading={analyzing}
                    type="primary"
                    ghost
                    className="hidden sm:inline-flex"
                    style={{ borderRadius: 8, height: 36, borderWidth: 1.5 }}
                  >
                    {t('nav.analyzeResume')}
                  </Button>
                )}

                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Avatar
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#0066FF' }}
                      size={32}
                    />
                    <span
                      className="hidden sm:inline text-sm font-medium"
                      style={{ color: 'var(--ctw-text-primary)' }}
                    >
                      {user?.name}
                    </span>
                  </div>
                </Dropdown>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  onClick={() => navigate('/login')}
                  style={{
                    borderRadius: 8,
                    height: 36,
                    background: isDark ? '#EDEDED' : '#0A0A0A',
                    color: isDark ? '#0A0A0A' : '#EDEDED',
                    border: 'none',
                    fontWeight: 500,
                  }}
                >
                  {t('common.login')}
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  style={{
                    borderRadius: 8,
                    height: 36,
                    borderColor: 'var(--ctw-border-default)',
                    color: 'var(--ctw-text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {t('common.register')}
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--ctw-border-default)',
                background: 'transparent',
                color: 'var(--ctw-text-primary)',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              <MenuOutlined />
            </button>
          </div>
        </header>
      </FadeIn>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 h-full w-[280px] flex flex-col"
            style={{
              background: 'var(--ctw-surface-card)',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4">
              <LogoMark size="sm" onClick={() => { navigate('/'); setMobileMenuOpen(false) }} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ctw-text-primary)',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            <nav className="flex flex-col px-4 gap-1 flex-1">
              {navConfig.map((item) => {
                const isActive = location.pathname === item.key
                return (
                  <a
                    key={item.key}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(item.key)
                      setMobileMenuOpen(false)
                    }}
                    href={item.key}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200"
                    style={{
                      fontSize: 16,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? '#0066FF'
                        : 'var(--ctw-text-secondary)',
                      background: isActive
                        ? (isDark ? 'rgba(0,102,255,0.1)' : 'rgba(0,102,255,0.05)')
                        : 'transparent',
                      textDecoration: 'none',
                    }}
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </a>
                )
              })}
            </nav>

            {/* Mobile language toggle */}
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--ctw-border-default)' }}>
              <div className="flex items-center gap-2 mb-3">
                <GlobalOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />
                <div className="flex items-center" style={{ borderRadius: 6, border: '1px solid var(--ctw-border-default)', overflow: 'hidden' }}>
                  <button
                    onClick={() => handleLanguageSwitch('zh')}
                    className="px-3 py-1 text-xs font-medium"
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      background: language === 'zh' ? '#0066FF' : 'transparent',
                      color: language === 'zh' ? '#fff' : 'var(--ctw-text-tertiary)',
                    }}
                  >
                    ZH
                  </button>
                  <button
                    onClick={() => handleLanguageSwitch('en')}
                    className="px-3 py-1 text-xs font-medium"
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      background: language === 'en' ? '#0066FF' : 'transparent',
                      color: language === 'en' ? '#fff' : 'var(--ctw-text-tertiary)',
                    }}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Mobile resume buttons */}
              {token && (
                <div className="flex flex-col gap-2">
                  <Button
                    icon={resumeId ? <CheckCircleOutlined /> : <UploadOutlined />}
                    onClick={() => { handleUploadClick(); setMobileMenuOpen(false) }}
                    loading={uploading}
                    block
                    style={
                      resumeId
                        ? { color: 'var(--ctw-success)', borderColor: 'var(--ctw-success)', borderRadius: 8 }
                        : { borderRadius: 8 }
                    }
                  >
                    {resumeId ? t('nav.reuploadResume') : t('nav.uploadResume')}
                  </Button>
                  {resumeId && (
                    <Button
                      icon={<FileSearchOutlined />}
                      onClick={() => {
                        if (analysis) setShowReport(true)
                        else handleAnalyze()
                        setMobileMenuOpen(false)
                      }}
                      loading={analyzing}
                      type="primary"
                      ghost
                      block
                      style={{ borderRadius: 8 }}
                    >
                      {t('nav.analyzeResume')}
                    </Button>
                  )}
                </div>
              )}

              {!token && (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => { navigate('/login'); setMobileMenuOpen(false) }}
                    block
                    style={{
                      borderRadius: 8,
                      background: isDark ? '#EDEDED' : '#0A0A0A',
                      color: isDark ? '#0A0A0A' : '#EDEDED',
                      border: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {t('common.login')}
                  </Button>
                  <Button
                    onClick={() => { navigate('/register'); setMobileMenuOpen(false) }}
                    block
                    style={{ borderRadius: 8, borderColor: 'var(--ctw-border-default)', color: 'var(--ctw-text-primary)' }}
                  >
                    {t('common.register')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main
        className="mx-auto"
        style={{
          maxWidth: 1200,
          padding: '32px 24px 24px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </main>

      {/* Resume Report Modal */}
      <Modal
        title={null}
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setAnalysis(null)
                handleAnalyze()
              }}
              loading={analyzing}
              style={{
                borderRadius: 8,
                border: '1px solid var(--ctw-border-default)',
                fontWeight: 500,
              }}
            >
              {t('resume.reanalyze')}
            </Button>
            <Button
              onClick={() => setShowReport(false)}
              style={{
                borderRadius: 8,
                background: isDark ? '#EDEDED' : '#0A0A0A',
                color: isDark ? '#0A0A0A' : '#EDEDED',
                border: 'none',
                fontWeight: 500,
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        }
        width={640}
        styles={{
          content: {
            borderRadius: 12,
            background: isDark ? 'var(--ctw-surface-card)' : '#fff',
          },
          mask: {
            background: 'rgba(0,0,0,0.45)',
          },
        }}
      >
        {analyzing ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Spin size="large" />
            <span
              className="mt-4 text-sm"
              style={{ color: 'var(--ctw-text-secondary)' }}
            >
              {t('resume.analyzing')}
            </span>
          </div>
        ) : (
          <ResumeReport analysis={analysis} filename={resumeFilename} />
        )}
      </Modal>

      {/* Responsive padding for mobile */}
      <style>{`
        @media (max-width: 768px) {
          main {
            padding: 24px 16px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
