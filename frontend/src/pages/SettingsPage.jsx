import { useState, useEffect } from 'react'
import { Card, Typography, Radio, Input, Button, Tag, Spin, message, Row, Col, Space, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  SafetyOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { getConfig, saveConfig, testConfig, getFeatures } from '../api/modelConfig'

const { Title, Text, Paragraph } = Typography

const CAPABILITY_LABELS = {
  supports_chat: 'Chat 对话',
  supports_stream: '流式对话',
}

const FEATURE_LABELS = {
  assessment: '职业测评',
  matching: '岗位匹配',
  interview: '模拟面试',
  career: '职业规划',
  resume: '简历分析',
  quiz: '刷题练习',
}

function CapabilityTag({ ok, label }) {
  return ok ? (
    <Tag icon={<CheckCircleOutlined />} color="success">{label}</Tag>
  ) : (
    <Tag icon={<CloseCircleOutlined />} color="error">{label}</Tag>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [mode, setMode] = useState('platform')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [features, setFeatures] = useState(null)
  const [savedConfig, setSavedConfig] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, featRes] = await Promise.all([getConfig(), getFeatures()])
        const cfg = cfgRes.data
        setSavedConfig(cfg)
        setMode(cfg.mode || 'platform')
        setBaseUrl(cfg.base_url || '')
        setModel(cfg.model || '')
        setApiKeyMasked(cfg.api_key_masked || '')
        setFeatures(featRes.data)
        if (cfg.last_test_status) {
          setTestResult({
            supports_chat: cfg.supports_chat,
            supports_stream: cfg.supports_stream,
            supports_json: cfg.supports_json,
            supports_embedding: cfg.supports_embedding,
          })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleTest = async () => {
    if (!baseUrl || !model || !apiKey) {
      message.warning('请填写完整的 Base URL、Model 和 API Key')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testConfig({ base_url: baseUrl, model, api_key: apiKey })
      setTestResult(res.data)
      if (res.data.supports_chat) {
        message.success('连接测试通过')
      } else {
        message.error('Chat 能力测试失败，请检查配置')
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '测试失败')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = mode === 'byok'
        ? { mode: 'byok', base_url: baseUrl, model, api_key: apiKey }
        : { mode: 'platform' }
      const res = await saveConfig(payload)
      setSavedConfig(res.data)
      setApiKeyMasked(res.data.api_key_masked || '')
      setTestResult({
        supports_chat: res.data.supports_chat,
        supports_stream: res.data.supports_stream,
        supports_json: res.data.supports_json,
        supports_embedding: res.data.supports_embedding,
      })
      const featRes = await getFeatures()
      setFeatures(featRes.data)
      message.success('配置已保存')
    } catch (err) {
      message.error(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Title level={4} style={{ margin: 0 }}>模型设置</Title>
        <Text type="secondary">配置 AI 模型的调用方式</Text>
      </div>

      <Card className="mb-4">
        <div className="mb-4">
          <Text strong style={{ fontSize: 15 }}>选择模式</Text>
        </div>
        <Radio.Group
          value={mode}
          onChange={(e) => { setMode(e.target.value); setTestResult(null) }}
          size="large"
        >
          <Space direction="vertical" className="w-full">
            <Radio value="platform">
              <div>
                <Text strong>使用平台提供的服务</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>无需配置，开箱即用，后续可能收取少量服务费</Text>
              </div>
            </Radio>
            <Radio value="byok">
              <div>
                <Text strong>使用自己的 API Key (BYOK)</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>填写你自己的 OpenAI 兼容接口，免费使用平台所有功能</Text>
              </div>
            </Radio>
          </Space>
        </Radio.Group>
      </Card>

      {mode === 'byok' && (
        <Card className="mb-4" title={<><ApiOutlined className="mr-2" />API 配置</>}>
          <div className="mb-3">
            <Text strong>Base URL</Text>
            <Input
              className="mt-1"
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <Text strong>Model</Text>
            <Input
              className="mt-1"
              placeholder="gpt-4o / deepseek-chat / gemini-pro ..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <Text strong>API Key</Text>
            {apiKeyMasked && !apiKey && (
              <Text type="secondary" className="ml-2">当前：{apiKeyMasked}</Text>
            )}
            <Input.Password
              className="mt-1"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <Space>
            <Button
              icon={testing ? <LoadingOutlined /> : <SafetyOutlined />}
              onClick={handleTest}
              loading={testing}
            >
              测试连接
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!testResult?.supports_chat && !apiKeyMasked}
            >
              保存配置
            </Button>
          </Space>

          {testResult && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: '#fafafa' }}>
              <Text strong className="mb-2 block">能力检测结果</Text>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CAPABILITY_LABELS).map(([key, label]) => (
                  <CapabilityTag key={key} ok={testResult[key]} label={label} />
                ))}
              </div>
              {testResult.errors && Object.keys(testResult.errors).length > 0 && (
                <div className="mt-2">
                  {Object.entries(testResult.errors).map(([key, err]) => (
                    <Text key={key} type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      {CAPABILITY_LABELS['supports_' + key] || key}: {err}
                    </Text>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {mode === 'platform' && (
        <Card className="mb-4">
          <Alert
            type="info"
            showIcon
            message="使用平台默认模型"
            description="无需配置 API Key。平台将使用默认模型为你提供服务，所有功能开箱可用。"
          />
          <div className="mt-4">
            <Button type="primary" onClick={handleSave} loading={saving}>
              确认使用平台付费模型
            </Button>
          </div>
        </Card>
      )}

      {features && (
        <Card>
          <Row gutter={[12, 12]}>
            {Object.entries(FEATURE_LABELS).map(([key, label]) => (
              <Col key={key} span={8}>
                <div className="flex items-center gap-2">
                  {features[key] ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  <Text>{label}</Text>
                </div>
              </Col>
            ))}
          </Row>
          {!features.interview && (
            <Alert
              className="mt-3"
              type="warning"
              showIcon
              message="模拟面试需要流式对话能力，当前模型不支持"
            />
          )}
        </Card>
      )}
    </div>
  )
}
