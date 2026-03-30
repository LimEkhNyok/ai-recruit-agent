import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { useTranslation } from '../i18n'
import useThemeStore from '../store/useThemeStore'
import LogoMark from '../components/LogoMark'
import LanguageToggle from '../components/LanguageToggle'
import FadeIn from '../components/motion/FadeIn'
import StaggerContainer, { StaggerItem } from '../components/motion/StaggerContainer'
import { sendVerifyCode, getMe, oauthBindRegister } from '../api/auth'

export default function OAuthRegisterPage() {
  const [loading, setLoading] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oauthKey = searchParams.get('oauth_key')
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'
  const [form] = Form.useForm()

  const handleSendCode = async () => {
    try {
      const email = form.getFieldValue('email')
      if (!email) {
        message.warning(t('auth.emailRequired'))
        return
      }
      setCodeSending(true)
      await sendVerifyCode(email)
      message.success(t('auth.codeSent'))
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      message.error(err.response?.data?.detail || t('auth.codeSendFailed'))
    } finally {
      setCodeSending(false)
    }
  }

  const onFinish = async (values) => {
    if (!oauthKey) {
      message.error('OAuth 授权已过期，请重新登录')
      navigate('/login')
      return
    }
    setLoading(true)
    try {
      const res = await oauthBindRegister({
        oauth_key: oauthKey,
        name: values.name,
        email: values.email,
        password: values.password,
        code: values.code,
      })
      const { access_token, refresh_token } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      const me = await getMe()
      localStorage.setItem('user', JSON.stringify(me.data))
      useAuthStore.setState({ token: access_token, user: me.data })
      message.success(t('auth.registerSuccess'))
      navigate('/')
    } catch (err) {
      message.error(err.response?.data?.detail || t('auth.registerFailed'))
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
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <LanguageToggle />
      </div>

      {isDark && (
        <>
          <div
            style={{
              position: 'absolute', top: '20%', left: '30%',
              width: 600, height: 600, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,102,255,0.04) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: '10%', right: '20%',
              width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,212,170,0.03) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <FadeIn delay={0} duration={0.3}>
          <div className="flex justify-center mb-8">
            <LogoMark size="lg" onClick={() => navigate('/')} />
          </div>
        </FadeIn>

        <StaggerContainer staggerDelay={0.08}>
          <StaggerItem>
            <div className="text-center mb-8">
              <h1
                className="font-display"
                style={{
                  fontSize: 24, fontWeight: 600,
                  color: 'var(--ctw-text-primary)', marginBottom: 8,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {t('auth.oauthRegisterTitle')}
              </h1>
              <p className="text-sm" style={{ color: 'var(--ctw-text-secondary)' }}>
                {t('auth.oauthRegisterSubtitle')}
              </p>
            </div>
          </StaggerItem>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <StaggerItem>
              <Form.Item
                name="name"
                rules={[{ required: true, message: t('auth.nameRequired') }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.namePlaceholder')}
                  style={inputStyle}
                />
              </Form.Item>
            </StaggerItem>

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
                <div className="flex gap-2">
                  <Input
                    placeholder={t('auth.codePlaceholder')}
                    style={{ ...inputStyle, flex: 1 }}
                    onChange={(e) => form.setFieldValue('code', e.target.value)}
                  />
                  <Button
                    onClick={handleSendCode}
                    loading={codeSending}
                    disabled={countdown > 0}
                    style={{
                      height: 44, borderRadius: 8,
                      border: '1px solid var(--ctw-border-default)',
                      fontFamily: "'DM Sans', sans-serif",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {countdown > 0 ? `${countdown}s` : t('auth.sendCode')}
                  </Button>
                </div>
              </Form.Item>
            </StaggerItem>

            <StaggerItem>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: t('auth.passwordRequired') },
                  { min: 6, message: t('auth.passwordMin') },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--ctw-text-tertiary)' }} />}
                  placeholder={t('auth.passwordPlaceholder')}
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
                    height: 44, borderRadius: 8,
                    background: isDark ? '#EDEDED' : '#0A0A0A',
                    color: isDark ? '#0A0A0A' : '#EDEDED',
                    border: 'none', fontWeight: 600, fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {t('auth.oauthRegisterSubmit')}
                </Button>
              </Form.Item>
            </StaggerItem>
          </Form>
        </StaggerContainer>
      </div>

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
