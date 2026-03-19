import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Result, Button, Spin } from 'antd'
import { LoginOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { getConfig } from '../api/modelConfig'

const ONBOARDING_KEY = 'onboarding_config_checked'

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [redirectToSettings, setRedirectToSettings] = useState(false)

  useEffect(() => {
    if (!token) return

    const alreadyChecked = sessionStorage.getItem(ONBOARDING_KEY)
    if (alreadyChecked) {
      setRedirectToSettings(false)
      return
    }

    if (location.pathname === '/settings') {
      sessionStorage.setItem(ONBOARDING_KEY, '1')
      return
    }

    setChecking(true)
    getConfig()
      .then((res) => {
        sessionStorage.setItem(ONBOARDING_KEY, '1')
        if (res.data.last_test_status == null) {
          setRedirectToSettings(true)
        }
      })
      .catch(() => {
        sessionStorage.setItem(ONBOARDING_KEY, '1')
      })
      .finally(() => setChecking(false))
  }, [token, location.pathname])

  if (!token) {
    return (
      <Result
        status="warning"
        title="请先登录后使用该功能"
        subTitle="登录后即可体验测评、匹配、刷题等全部功能"
        extra={
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
          >
            去登录
          </Button>
        }
      />
    )
  }

  if (redirectToSettings && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <Spin size="large" tip="正在检查配置..." />
      </div>
    )
  }

  return <Outlet />
}
