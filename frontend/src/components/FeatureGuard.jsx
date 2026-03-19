import { useState, useEffect } from 'react'
import { Result, Button, Spin } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import useFeatureGuard from '../hooks/useFeatureGuard'
import { getConfig } from '../api/modelConfig'

export default function FeatureGuard({ feature, children }) {
  const { loading: featureLoading, available, featureLabel } = useFeatureGuard(feature)
  const navigate = useNavigate()
  const [configLoading, setConfigLoading] = useState(true)
  const [hasConfigured, setHasConfigured] = useState(false)

  useEffect(() => {
    getConfig()
      .then((res) => {
        setHasConfigured(res.data.last_test_status != null)
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false))
  }, [])

  if (featureLoading || configLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!hasConfigured) {
    return (
      <Result
        status="warning"
        title="请先配置 API 以使用该功能"
        subTitle="你还没有设置 AI 模型配置。配置完成后才能使用测评、匹配、面试等功能。"
        extra={
          <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
            前往设置
          </Button>
        }
      />
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
