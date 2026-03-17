import { Result, Button, Spin } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import useFeatureGuard from '../hooks/useFeatureGuard'

export default function FeatureGuard({ feature, children }) {
  const { loading, available, featureLabel } = useFeatureGuard(feature)
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!available) {
    return (
      <Result
        status="warning"
        title={`当前模型配置不支持「${featureLabel}」功能`}
        subTitle="请前往设置页更换支持该功能的 provider / model"
        extra={
          <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
            前往设置
          </Button>
        }
      />
    )
  }

  return children
}
