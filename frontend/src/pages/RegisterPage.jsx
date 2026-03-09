import { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

const { Title, Text } = Typography

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await register(values.name, values.email, values.password)
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
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input prefix={<UserOutlined />} placeholder="姓名" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
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
