import { useState, useRef, useCallback, useEffect } from 'react'
import { Form, Input, Button, message } from 'antd'
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { sendResetCode, resetPassword } from '../api/auth'
import { useTranslation } from '../i18n'
import useThemeStore from '../store/useThemeStore'
import LogoMark from '../components/LogoMark'
import LanguageToggle from '../components/LanguageToggle'
import FadeIn from '../components/motion/FadeIn'
import StaggerContainer, { StaggerItem } from '../components/motion/StaggerContainer'

const COUNTDOWN = 60

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleSendCode = async () => {
    try {
      await form.validateFields(['email'])
    } catch {
      return
    }
    const email = form.getFieldValue('email')
    setSending(true)
    try {
      await sendResetCode(email)
      message.success(t('auth.codeSent'))
      startCountdown()
    } catch (err) {
      message.error(err.response?.data?.detail || t('auth.codeFailed'))
    } finally {
      setSending(false)
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await resetPassword(values.email, values.code, values.new_password)
      message.success(t('auth.resetSuccess'))
      navigate('/login')
    } catch (err) {
      message.error(err.response?.data?.detail || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    height: 44,
    borderRadius: 8,
    border: '1px solid var(--ctw-border-default)',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    background: 'transparent',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'var(--ctw-surface-base)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Language toggle */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <LanguageToggle />
      </div>

      {/* Dark mode subtle radial glow */}
      {isDark && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '30%',
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,102,255,0.04) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '10%',
              right: '20%',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,212,170,0.03) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <FadeIn delay={0} duration={0.3}>
          <div className="flex justify-center mb-8">
            <LogoMark size="lg" onClick={() => navigate('/')} />
          </div>
        </FadeIn>

        {/* Form */}
        <StaggerContainer staggerDelay={0.08}>
          <StaggerItem>
            <div className="text-center mb-8">
              <h1
                className="font-display"
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: 'var(--ctw-text-primary)',
                  marginBottom: 8,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {t('auth.forgotTitle')}
              </h1>
              <p
                className="text-sm"
                style={{ color: 'var(--ctw-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}
              >
                {t('auth.forgotSubtitle')}
              </p>
            </div>
          </StaggerItem>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <StaggerItem>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: t('auth.emailRequired') },
                  { type: 'email', message: t('auth.emailInvalid') },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.emailPlaceholder')}
                  style={inputStyle}
                />
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <Form.Item
                name="code"
                rules={[{ required: true, message: t('auth.codeRequired') }]}
              >
                <Input
                  prefix={<SafetyOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.codePlaceholder')}
                  maxLength={6}
                  style={inputStyle}
                  suffix={
                    <button
                      type="button"
                      disabled={countdown > 0 || sending}
                      onClick={handleSendCode}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: countdown > 0 || sending ? 'not-allowed' : 'pointer',
                        padding: '0 4px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: countdown > 0
                          ? 'var(--ctw-text-tertiary)'
                          : '#0066FF',
                        whiteSpace: 'nowrap',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {sending ? '...' : countdown > 0 ? `${countdown}s` : t('auth.sendCode')}
                    </button>
                  }
                />
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <Form.Item
                name="new_password"
                rules={[
                  { required: true, message: t('auth.newPasswordRequired') },
                  { min: 6, message: t('auth.passwordMin') },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  style={inputStyle}
                />
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <Form.Item
                name="confirm_password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: t('auth.confirmPasswordRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) return Promise.resolve()
                      return Promise.reject(new Error(t('auth.passwordMismatch')))
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  style={inputStyle}
                />
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <Form.Item>
                <Button
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{
                    height: 44,
                    borderRadius: 8,
                    background: isDark ? '#EDEDED' : '#0A0A0A',
                    color: isDark ? '#0A0A0A' : '#EDEDED',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {t('auth.resetPassword')}
                </Button>
              </Form.Item>
            </StaggerItem>
          </Form>

          <StaggerItem>
            <div className="text-center" style={{ marginTop: 8 }}>
              <span
                className="text-sm"
                style={{ color: 'var(--ctw-text-secondary)', fontSize: 14 }}
              >
                {t('auth.rememberPassword')}{' '}
              </span>
              <Link
                to="/login"
                style={{
                  fontSize: 14,
                  color: 'var(--ctw-text-secondary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 200ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ctw-text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ctw-text-secondary)' }}
              >
                {t('auth.backToLogin')}
              </Link>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Focus ring styles */}
      <style>{`
        .ant-input:focus,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused {
          border-color: #0066FF !important;
          box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1) !important;
        }
        .ant-input-affix-wrapper {
          background: transparent !important;
        }
      `}</style>
    </div>
  )
}
