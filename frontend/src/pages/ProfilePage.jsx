import { useState, useEffect } from 'react'
import { Card, Typography, Tag, Spin, Button, Row, Col, Descriptions, message, Modal, Space } from 'antd'
import { AimOutlined, RedoOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RadarChart from '../components/RadarChart'
import { getProfile } from '../api/assessment'

const { Title, Text, Paragraph } = Typography

const abilityLabels = {
  logical_analysis: '逻辑分析',
  communication: '沟通表达',
  creativity: '创意创新',
  execution: '执行力',
  leadership: '领导力',
  teamwork: '团队协作',
  learning: '学习能力',
  stress_tolerance: '抗压能力',
}

const interestLabels = {
  tech_development: '技术研发',
  product_design: '产品设计',
  data_analysis: '数据分析',
  marketing: '市场营销',
  project_management: '项目管理',
  content_creation: '内容创作',
  user_research: '用户研究',
  business_operation: '商业运营',
}

const valueLabels = {
  achievement: '成就导向',
  stability: '稳定安全',
  freedom: '自由灵活',
  social_impact: '社会影响',
  growth: '持续成长',
  work_life_balance: '工作生活平衡',
}

const workStyleLabels = {
  independent_vs_team: '独立 ↔ 团队',
  detail_vs_big_picture: '细节 ↔ 全局',
  planned_vs_flexible: '计划 ↔ 灵活',
  fast_vs_steady: '快节奏 ↔ 稳步',
}

function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Text className="w-28 text-right shrink-0" style={{ fontSize: 13 }}>{label}</Text>
      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: '#f0f0f0' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, #1677ff, #69b1ff)` }}
        />
      </div>
      <Text strong style={{ width: 32, fontSize: 13 }}>{value}</Text>
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getProfile()
        setProfile(res.data)
      } catch {
        message.info('暂无画像，请先完成测评')
        navigate('/assessment?force=1', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  const handleReassess = () => {
    Modal.confirm({
      title: '确认重新测评？',
      content: '重新测评将开启新一轮对话，完成后会生成新的人才画像覆盖当前结果。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => navigate('/assessment?force=1'),
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!profile) return null

  const { personality, abilities, interests, values, work_style, summary } = profile

  const abilityKeys = Object.keys(abilities)
  const abilityIndicators = abilityKeys.map((k) => abilityLabels[k] || k)
  const abilityValues = abilityKeys.map((k) => abilities[k])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>我的人才画像</Title>
          <Text type="secondary">基于 AI 对话测评生成的专属画像</Text>
        </div>
        <Space>
          <Button icon={<RedoOutlined />} onClick={handleReassess}>
            重新测评
          </Button>
          <Button type="primary" icon={<AimOutlined />} size="large" onClick={() => navigate('/matching')}>
            开始匹配
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={24}>
          <Col span={10}>
            <RadarChart indicators={abilityIndicators} values={abilityValues} title="核心能力" />
          </Col>
          <Col span={14}>
            <Title level={5}>综合分析</Title>
            <Paragraph>{summary}</Paragraph>
            <div className="mt-2">
              <Text strong>MBTI 类型：</Text>
              <Tag color="blue" className="ml-2" style={{ fontSize: 14 }}>{personality?.mbti_type}</Tag>
            </div>
            <Paragraph type="secondary" className="mt-2">{personality?.description}</Paragraph>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="核心能力" className="mb-4">
            {Object.entries(abilities).map(([k, v]) => (
              <ScoreBar key={k} label={abilityLabels[k] || k} value={v} />
            ))}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="兴趣倾向" className="mb-4">
            {Object.entries(interests).map(([k, v]) => (
              <ScoreBar key={k} label={interestLabels[k] || k} value={v} />
            ))}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="价值观">
            {Object.entries(values).map(([k, v]) => (
              <ScoreBar key={k} label={valueLabels[k] || k} value={v} />
            ))}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="工作风格">
            {Object.entries(work_style).map(([k, v]) => (
              <ScoreBar key={k} label={workStyleLabels[k] || k} value={v} />
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
