import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { message } from 'antd'
import useAuthStore from '../store/useAuthStore'
import { getMe } from '../api/auth'

export default function OAuthCompletePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const refreshToken = searchParams.get('refresh_token')

    if (!token || !refreshToken) {
      message.error('OAuth 登录失败')
      navigate('/login')
      return
    }

    localStorage.setItem('token', token)
    localStorage.setItem('refresh_token', refreshToken)

    getMe()
      .then((res) => {
        localStorage.setItem('user', JSON.stringify(res.data))
        useAuthStore.setState({ token, user: res.data })
        navigate('/')
      })
      .catch(() => {
        message.error('获取用户信息失败')
        navigate('/login')
      })
  }, [navigate, searchParams])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--ctw-surface-base)' }}
    >
      <p style={{ color: 'var(--ctw-text-secondary)', fontSize: 16 }}>
        登录中...
      </p>
    </div>
  )
}
