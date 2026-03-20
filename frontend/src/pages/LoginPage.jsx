import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { useTranslation } from '../i18n'
import useThemeStore from '../store/useThemeStore'
import LogoMark from '../components/LogoMark'
import FadeIn from '../components/motion/FadeIn'
import StaggerContainer, { StaggerItem } from '../components/motion/StaggerContainer'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await login(values.email, values.password)
      message.success(t('auth.loginSuccess'))
      navigate('/')
    } catch (err) {
      message.error(err.response?.data?.detail || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
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
                {t('auth.loginTitle')}
              </h1>
              <p
                className="text-sm"
                style={{ color: 'var(--ctw-text-secondary)' }}
              >
                {t('auth.loginSubtitle')}
              </p>
            </div>
          </StaggerItem>

          <Form layout="vertical" onFinish={onFinish} size="large">
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
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: '1px solid var(--ctw-border-default)',
                    fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                    background: 'transparent',
                  }}
                />
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <Form.Item
                name="password"
                rules={[{ required: true, message: t('auth.passwordRequired') }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.passwordPlaceholder')}
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: '1px solid var(--ctw-border-default)',
                    fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                    background: 'transparent',
                  }}
                />
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <div className="text-right" style={{ marginTop: -12, marginBottom: 16 }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 14,
                    color: 'var(--ctw-text-secondary)',
                    textDecoration: 'none',
                    transition: 'color 200ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ctw-text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ctw-text-secondary)' }}
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
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
                  {t('auth.loginTitle')}
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
                {t('auth.noAccount')}{' '}
              </span>
              <Link
                to="/register"
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
                {t('auth.goRegister')}
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
