import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import useAuthStore from '../store/useAuthStore'
import { getConfig } from '../api/modelConfig'

const ONBOARDING_KEY = 'onboarding_config_checked'

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
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
    return <Navigate to="/login" replace />
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

  return children
}
