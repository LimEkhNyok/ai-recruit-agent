import { useState, useRef, useCallback, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { sendVerifyCode } from '../api/auth'

const { Title, Text } = Typography
const COUNTDOWN = 60

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [form] = Form.useForm()

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
      await sendVerifyCode(email)
      message.success('验证码已发送，请查收邮箱')
      startCountdown()
    } catch (err) {
      message.error(err.response?.data?.detail || '发送验证码失败')
    } finally {
      setSending(false)
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await register(values.name, values.email, values.password, values.code)
      message.success('注册成功')
      navigate('/')
    } catch (err) {
      message.error(err.response?.data?.detail || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 420 }} className="shadow-2xl">
        <div className="text-center mb-6">
          <Title level={3} style={{ color: '#1677ff', marginBottom: 4 }}>创建账号</Title>
          <Text type="secondary">开始你的职业探索之旅</Text>
        </div>
        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input prefix={<UserOutlined />} placeholder="姓名" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              prefix={<SafetyOutlined />}
              placeholder="邮箱验证码"
              maxLength={6}
              suffix={
                <Button
                  type="link"
                  size="small"
                  disabled={countdown > 0 || sending}
                  loading={sending}
                  onClick={handleSendCode}
                  style={{ padding: 0 }}
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
        </Form>
        <div className="text-center">
          <Space>
            <Text type="secondary">已有账号？</Text>
            <Link to="/login">去登录</Link>
          </Space>
        </div>
      </Card>
    </div>
  )
}
