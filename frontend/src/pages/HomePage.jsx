import { useState, useEffect } from 'react'
import { Card, Typography, Row, Col, Button, Tag, Alert, Badge, message } from 'antd'
import {
  FormOutlined,
  AimOutlined,
  AudioOutlined,
  RocketOutlined,
  FileTextOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { getProfile } from '../api/assessment'
import { getResults } from '../api/matching'
import { getConfig, getFeatures } from '../api/modelConfig'

const { Title, Text, Paragraph } = Typography

const FEATURE_META = [
  {
    key: 'assessment',
    icon: <FormOutlined style={{ fontSize: 36, color: '#1677ff' }} />,
    title: 'AI 职业测评',
    desc: '通过自然对话，AI 全面分析你的性格、能力、兴趣和价值观，生成专属人才画像',
    path: '/assessment',
    color: '#e6f4ff',
  },
  {
    key: 'matching',
    icon: <AimOutlined style={{ fontSize: 36, color: '#52c41a' }} />,
    title: '智能岗位匹配',
    desc: '基于向量相似度 + AI 深度评分，为你推荐最匹配的岗位，还有突破认知的惊喜推荐',
    path: '/matching',
    color: '#f6ffed',
  },
  {
    key: 'interview',
    icon: <AudioOutlined style={{ fontSize: 36, color: '#722ed1' }} />,
    title: 'AI 模拟面试',
    desc: '针对目标岗位的 AI 面试官，实时对话练习，结束后获得详细评估报告和改进建议',
    path: '/interview',
    color: '#f9f0ff',
  },
  {
    key: 'career',
    icon: <RocketOutlined style={{ fontSize: 36, color: '#fa8c16' }} />,
    title: '职业生涯规划',
    desc: '结合画像和匹配结果，AI 为你定制短中长期职业目标、技能路径和简历优化建议',
    path: '/career',
    color: '#fff7e6',
  },
  {
    key: 'resume',
    icon: <FileTextOutlined style={{ fontSize: 36, color: '#13c2c2' }} />,
    title: 'AI 简历分析',
    desc: '上传 PDF/DOCX/TXT 简历，AI 生成详细分析报告，帮你发现优化空间',
    path: '/resume',
    color: '#e6fffb',
  },
  {
    key: 'quiz',
    icon: <BulbOutlined style={{ fontSize: 36, color: '#eb2f96' }} />,
    title: '高效刷题练习',
    desc: 'AI 智能出题 + 判题，结合记忆系统帮你高效巩固知识、查漏补缺',
    path: '/quiz',
    color: '#fff0f6',
  },
]

const MODE_LABELS = { byok: '自有 API Key', platform: '平台提供模型' }

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [hasProfile, setHasProfile] = useState(false)
  const [hasMatch, setHasMatch] = useState(false)
  const [modelConfig, setModelConfig] = useState(null)
  const [featureStatus, setFeatureStatus] = useState(null)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    getProfile().then(() => setHasProfile(true)).catch(() => {})
    getResults().then((res) => {
      if (res.data.results?.length > 0) setHasMatch(true)
    }).catch(() => {})

    getConfig()
      .then((res) => setModelConfig(res.data))
      .catch(() => {})
      .finally(() => setConfigLoaded(true))

    getFeatures()
      .then((res) => setFeatureStatus(res.data))
      .catch(() => {})
  }, [])

  const hasConfigured = modelConfig?.last_test_status != null

  return (
    <div className="max-w-5xl mx-auto">
      <div
        className="rounded-2xl p-10 mb-8 text-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <Title style={{ color: '#fff', fontSize: 32, marginBottom: 8 }}>
          从匹配到发现
        </Title>
        <Title level={3} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400, marginTop: 0 }}>
          让每个人都能找到属于自己的工作
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
          AI 驱动的职业探索平台，通过对话式测评、智能匹配、模拟面试和职业规划，
          帮助你发现真正适合自己的职业方向
        </Paragraph>
      </div>

      {configLoaded && !hasConfigured && (
        <Alert
          type="warning"
          showIcon
          icon={<SettingOutlined />}
          message="请先配置模型以使用平台功能"
          description="你还没有设置 AI 模型配置。配置完成后才能使用测评、匹配、面试等功能。你可以选择使用自己的 API Key 或平台提供的服务。"
          action={
            <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
              前往设置
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {configLoaded && hasConfigured && (
        <Card size="small" style={{ marginBottom: 24 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Tag icon={<SafetyCertificateOutlined />} color="blue">
                {MODE_LABELS[modelConfig.mode] || modelConfig.mode}
              </Tag>
              {modelConfig.mode === 'byok' && modelConfig.model && (
                <Tag icon={<ApiOutlined />}>{modelConfig.model}</Tag>
              )}
              {featureStatus && (
                <span className="text-xs text-gray-500">
                  可用功能：{Object.entries(featureStatus).filter(([, v]) => v).length} / {Object.keys(featureStatus).length}
                </span>
              )}
            </div>
            <Button size="small" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
              模型设置
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Title level={5} style={{ margin: 0 }}>你好，{user?.name}</Title>
          <div className="flex gap-2">
            {hasProfile ? (
              <Tag icon={<CheckCircleOutlined />} color="success">已完成测评</Tag>
            ) : (
              <Tag icon={<ClockCircleOutlined />} color="default">未测评</Tag>
            )}
            {hasMatch && <Tag icon={<CheckCircleOutlined />} color="success">已匹配岗位</Tag>}
          </div>
        </div>
        {!hasProfile && (
          <Card size="small" style={{ background: '#e6f4ff', border: '1px solid #91caff' }}>
            <div className="flex items-center justify-between">
              <Text>完成 AI 测评，开启你的职业探索之旅</Text>
              <Button type="primary" onClick={() => navigate('/assessment')}>开始测评</Button>
            </div>
          </Card>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {FEATURE_META.map((f) => {
          const disabled = featureStatus && featureStatus[f.key] === false
          return (
            <Col key={f.key} xs={24} sm={12}>
              <Badge.Ribbon
                text="不可用"
                color="red"
                style={{ display: disabled ? undefined : 'none' }}
              >
                <Card
                  hoverable={!disabled}
                  className="h-full"
                  style={{
                    borderRadius: 12,
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    if (disabled) return
                    if (f.key === 'interview') {
                      navigate('/matching')
                    } else if (f.key === 'resume') {
                      message.info('请点击右上角「导入简历」按钮上传简历')
                    } else {
                      navigate(f.path)
                    }
                  }}
                >
                  <div className="flex gap-4">
                    <div
                      className="flex items-center justify-center rounded-xl shrink-0"
                      style={{ width: 64, height: 64, background: f.color }}
                    >
                      {f.icon}
                    </div>
                    <div>
                      <Title level={5} style={{ marginBottom: 4 }}>{f.title}</Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>{f.desc}</Text>
                    </div>
                  </div>
                </Card>
              </Badge.Ribbon>
            </Col>
          )
        })}
      </Row>

      <div className="mt-10 text-center pb-8">
        <Text type="secondary" style={{ fontSize: 13 }}>
          AI Recruit Agent — 不只是匹配你已知的方向，更帮你发现从未想过但非常适合的可能
        </Text>
      </div>
    </div>
  )
}
