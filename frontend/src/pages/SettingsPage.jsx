import { useState, useEffect } from 'react'
import { Card, Typography, Radio, Input, Button, Tag, Spin, message, Row, Col, Space, Alert, Divider, Statistic, Badge } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  SafetyOutlined,
  LoadingOutlined,
  WalletOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  GiftOutlined,
} from '@ant-design/icons'
import { getConfig, saveConfig, testConfig, getFeatures } from '../api/modelConfig'
import { getWallet, recharge, subscribe } from '../api/billing'
import useBillingStore from '../store/useBillingStore'

const { Title, Text } = Typography

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

const FEATURE_CREDITS = {
  assessment: { credits: 78, yuan: 0.78, label: '一次完整测评' },
  matching: { credits: 33, yuan: 0.33, label: '一次岗位匹配' },
  interview: { credits: 36, yuan: 0.36, label: '一次模拟面试' },
  career: { credits: 19, yuan: 0.19, label: '一次职业规划' },
  resume: { credits: 14, yuan: 0.14, label: '一次简历分析' },
  quiz: { credits: 9, yuan: 0.09, label: '一轮刷题' },
}

const RECHARGE_TIERS = [
  { key: 'mini', label: '体验', price: 2, credits: 200, bonus: null },
  { key: 'starter', label: '入门', price: 5, credits: 500, bonus: null },
  { key: 'basic', label: '基础', price: 10, credits: 1000, bonus: null },
  { key: 'plus', label: '进阶', price: 30, credits: 3200, bonus: '送 200' },
  { key: 'premium', label: '畅享', price: 100, credits: 11000, bonus: '送 1000' },
]

function CapabilityTag({ ok, label }) {
  return ok ? (
    <Tag icon={<CheckCircleOutlined />} color="success">{label}</Tag>
  ) : (
    <Tag icon={<CloseCircleOutlined />} color="error">{label}</Tag>
  )
}

function PricingPanel({ wallet, onRecharge, onSubscribe, recharging, subscribing }) {
  return (
    <div>
      {wallet && (
        <div className="mb-4 p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size="large">
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>积分余额</span>}
                  value={wallet.balance}
                  suffix="积分"
                  valueStyle={{ color: '#fff', fontSize: 28 }}
                />
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>免费刷题</span>}
                  value={wallet.free_quiz_remaining}
                  suffix="轮"
                  valueStyle={{ color: '#fff', fontSize: 28 }}
                />
              </Space>
            </Col>
            {wallet.subscription_active && (
              <Col>
                <Tag icon={<CrownOutlined />} color="gold" style={{ fontSize: 14, padding: '4px 12px' }}>
                  {wallet.subscription_plan === 'weekly' ? '周卡' : '月卡'}生效中
                </Tag>
              </Col>
            )}
          </Row>
        </div>
      )}

      <Row gutter={16}>
        <Col span={8}>
          <Card
            title={<><WalletOutlined className="mr-2" />按量计费</>}
            size="small"
            styles={{ body: { padding: '12px 16px' } }}
          >
            <div className="mb-3">
              <Text type="secondary" style={{ fontSize: 12 }}>1 元 = 100 积分</Text>
            </div>

            <div className="mb-3">
              <Text strong style={{ fontSize: 13 }}>各功能参考消耗</Text>
              <div className="mt-2" style={{ fontSize: 12 }}>
                {Object.entries(FEATURE_CREDITS).map(([key, item]) => (
                  <div key={key} className="flex justify-between py-1" style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <Text type="secondary">{item.label}</Text>
                    <Text>~{item.credits}积分 <Text type="secondary">(¥{item.yuan})</Text></Text>
                  </div>
                ))}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ fontSize: 13 }}>充值档位</Text>
              <div className="mt-2">
                {RECHARGE_TIERS.map((tier) => (
                  <Button
                    key={tier.key}
                    block
                    className="mb-2 text-left"
                    style={{ height: 'auto', padding: '8px 12px' }}
                    onClick={() => onRecharge(tier.key)}
                    loading={recharging === tier.key}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <Text strong>¥{tier.price}</Text>
                        <Text type="secondary" className="ml-2">{tier.credits} 积分</Text>
                      </div>
                      {tier.bonus && (
                        <Tag color="orange" style={{ marginRight: 0 }}><GiftOutlined /> {tier.bonus}</Tag>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            size="small"
            styles={{ body: { padding: '16px', textAlign: 'center' } }}
          >
            <ThunderboltOutlined style={{ fontSize: 32, color: '#1677ff', marginBottom: 12 }} />
            <Title level={5} style={{ margin: '0 0 4px' }}>周卡</Title>
            <div className="mb-2">
              <Text style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>¥9.9</Text>
              <Text type="secondary"> / 7天</Text>
            </div>
            <div className="mb-4 text-left" style={{ fontSize: 13 }}>
              <div className="py-1"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 所有功能不限量</div>
              <div className="py-1"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 无需管理积分</div>
              <div className="py-1"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 短期使用首选</div>
            </div>
            <Button
              type="primary"
              block
              onClick={() => onSubscribe('weekly')}
              loading={subscribing === 'weekly'}
              disabled={wallet?.subscription_active}
            >
              {wallet?.subscription_active ? '已订阅' : '立即订阅'}
            </Button>
          </Card>
        </Col>

        <Col span={8}>
          <Badge.Ribbon text="推荐" color="volcano">
            <Card
              size="small"
              styles={{ body: { padding: '16px', textAlign: 'center' } }}
            >
              <CrownOutlined style={{ fontSize: 32, color: '#fa8c16', marginBottom: 12 }} />
              <Title level={5} style={{ margin: '0 0 4px' }}>月卡</Title>
              <div className="mb-2">
                <Text style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>¥29.9</Text>
                <Text type="secondary"> / 30天</Text>
              </div>
              <div className="mb-4 text-left" style={{ fontSize: 13 }}>
                <div className="py-1"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 所有功能不限量</div>
                <div className="py-1"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 无需管理积分</div>
                <div className="py-1"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 月均 ¥1/天 超划算</div>
              </div>
              <Button
                type="primary"
                block
                style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                onClick={() => onSubscribe('monthly')}
                loading={subscribing === 'monthly'}
                disabled={wallet?.subscription_active}
              >
                {wallet?.subscription_active ? '已订阅' : '立即订阅'}
              </Button>
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>
    </div>
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
  const [showPricing, setShowPricing] = useState(false)
  const [wallet, setWallet] = useState(null)
  const [recharging, setRecharging] = useState(null)
  const [subscribing, setSubscribing] = useState(null)

  const { fetchWallet: refreshGlobalWallet } = useBillingStore()

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
        if (cfg.mode === 'platform' && cfg.last_test_status) {
          setShowPricing(true)
          try {
            const walletRes = await getWallet()
            setWallet(walletRes.data)
          } catch {}
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

      if (mode === 'platform') {
        setShowPricing(true)
        try {
          const walletRes = await getWallet()
          setWallet(walletRes.data)
          refreshGlobalWallet()
        } catch {}
      } else {
        setShowPricing(false)
        refreshGlobalWallet()
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRecharge = async (tier) => {
    setRecharging(tier)
    try {
      const res = await recharge(tier)
      message.success(`充值成功！获得 ${res.data.credits_gained} 积分`)
      setWallet((prev) => prev ? { ...prev, balance: res.data.balance } : prev)
      refreshGlobalWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || '充值失败')
    } finally {
      setRecharging(null)
    }
  }

  const handleSubscribe = async (planType) => {
    setSubscribing(planType)
    try {
      await subscribe(planType)
      message.success('订阅成功！')
      const walletRes = await getWallet()
      setWallet(walletRes.data)
      refreshGlobalWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || '订阅失败')
    } finally {
      setSubscribing(null)
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
    <div style={{ maxWidth: showPricing ? 900 : 720, margin: '0 auto' }}>
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
                <Text type="secondary" style={{ fontSize: 13 }}>无需配置，开箱即用，按量计费或订阅不限量</Text>
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

      {mode === 'platform' && !showPricing && (
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

      {mode === 'platform' && showPricing && (
        <Card className="mb-4" title={<><WalletOutlined className="mr-2" />付费方案</>}>
          <PricingPanel
            wallet={wallet}
            onRecharge={handleRecharge}
            onSubscribe={handleSubscribe}
            recharging={recharging}
            subscribing={subscribing}
          />
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
