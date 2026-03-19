import { Result, Button } from 'antd'
import { LoginOutlined, SettingOutlined } from '@ant-design/icons'
import { Outlet } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()

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

  return <Outlet />
}
