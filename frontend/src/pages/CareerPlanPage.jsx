import { useState, useEffect } from 'react'
import { Card, Typography, Timeline, Tag, Spin, Button, Row, Col, message, Steps, Result } from 'antd'
import {
  RocketOutlined,
  AimOutlined,
  TrophyOutlined,
  BookOutlined,
  FileTextOutlined,
  BulbOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { generatePlan, getPlan } from '../api/career'
import useFeatureGuard from '../hooks/useFeatureGuard'

const { Title, Text, Paragraph } = Typography

const levelColors = {
  '初级': '#faad14',
  '中级': '#1677ff',
  '高级': '#52c41a',
  '专家': '#722ed1',
}

function SkillCard({ skill }) {
  return (
    <Card size="small" className="h-full">
      <div className="flex items-center justify-between mb-2">
        <Text strong>{skill.skill}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{skill.timeline}</Text>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Tag color={levelColors[skill.current_level] || '#999'}>{skill.current_level}</Tag>
        <Text type="secondary">→</Text>
        <Tag color={levelColors[skill.target_level] || '#1677ff'}>{skill.target_level}</Tag>
      </div>
      {skill.resources && skill.resources.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>学习资源：</Text>
          <div className="flex flex-wrap gap-1 mt-1">
            {skill.resources.map((r, i) => (
              <Tag key={i} style={{ fontSize: 11 }}>{r}</Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function GoalSection({ data, icon, color }) {
  if (!data) return null
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <Title level={5} style={{ margin: 0 }}>{data.title}</Title>
      </div>
      {data.goals && (
        <div className="mb-2">
          <Text strong style={{ fontSize: 13 }}>目标：</Text>
          <ul className="m-0 pl-5">
            {data.goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}
      {data.actions && (
        <div className="mb-2">
          <Text strong style={{ fontSize: 13 }}>行动计划：</Text>
          <ul className="m-0 pl-5">
            {data.actions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {data.milestones && (
        <div className="mb-2">
          <Text strong style={{ fontSize: 13 }}>里程碑：</Text>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.milestones.map((m, i) => <Tag key={i} color={color}>{m}</Tag>)}
          </div>
        </div>
      )}
      {data.vision && <Paragraph type="secondary">{data.vision}</Paragraph>}
    </div>
  )
}

export default function CareerPlanPage() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const navigate = useNavigate()
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("career")

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await getPlan()
        if (!ignore) setPlan(res.data)
      } catch {
        if (ignore) return
        if (!ignore) setGenerating(true)
        try {
          const res = await generatePlan()
          if (!ignore) setPlan(res.data)
        } catch (err) {
          if (!ignore) message.error(err.response?.data?.detail || '生成规划失败，请先完成测评和匹配')
        } finally {
          if (!ignore) setGenerating(false)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await generatePlan()
      setPlan(res.data)
      message.success('规划已更新')
    } catch (err) {
      message.error(err.response?.data?.detail || '重新规划失败')
    } finally {
      setRegenerating(false)
    }
  }

  if (guardLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (available === false) {
    return (
      <Result
        status="warning"
        title={`${featureLabel}功能不可用`}
        subTitle="当前模型配置不支持此功能，请前往设置页更换 provider/model"
        extra={
          <Button type="primary" onClick={() => navigate('/settings')}>
            前往设置
          </Button>
        }
      />
    )
  }

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 400 }}>
        <Spin size="large" />
        <div className="text-center">
          <Title level={4} style={{ margin: 0 }}>
            {generating ? 'AI 正在为你生成职业规划...' : '加载中...'}
          </Title>
          <Text type="secondary">结合你的画像和匹配结果，定制专属发展路径</Text>
        </div>
      </div>
    )
  }

  if (!plan) return null

  const pc = plan.plan_content || {}
  const skills = pc.skill_roadmap || []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>我的职业规划</Title>
          <Text type="secondary">AI 为你量身定制的职业发展路径</Text>
        </div>
        <Button
          icon={<SyncOutlined />}
          onClick={handleRegenerate}
          loading={regenerating}
          type="primary"
          ghost
        >
          结合近期刷题再次规划
        </Button>
      </div>

      {pc.career_direction && (
        <Card className="mb-4" style={{ background: 'linear-gradient(135deg, #667eea22, #764ba222)' }}>
          <div className="flex items-center gap-3">
            <RocketOutlined style={{ fontSize: 28, color: '#722ed1' }} />
            <div>
              <Text type="secondary">核心职业方向</Text>
              <Title level={4} style={{ margin: 0 }}>{pc.career_direction}</Title>
            </div>
          </div>
        </Card>
      )}

      <Card title="发展路线图" className="mb-4">
        <Timeline
          mode="left"
          items={[
            pc.short_term && {
              color: '#1677ff',
              children: <GoalSection data={pc.short_term} icon={<AimOutlined style={{ color: '#1677ff' }} />} color="blue" />,
            },
            pc.mid_term && {
              color: '#52c41a',
              children: <GoalSection data={pc.mid_term} icon={<TrophyOutlined style={{ color: '#52c41a' }} />} color="green" />,
            },
            pc.long_term && {
              color: '#722ed1',
              children: <GoalSection data={pc.long_term} icon={<RocketOutlined style={{ color: '#722ed1' }} />} color="purple" />,
            },
          ].filter(Boolean)}
        />
      </Card>

      {skills.length > 0 && (
        <Card title={<><BookOutlined className="mr-2" />技能提升路径</>} className="mb-4">
          <Row gutter={[16, 16]}>
            {skills.map((s, i) => (
              <Col key={i} xs={24} sm={12} lg={8}>
                <SkillCard skill={s} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {plan.resume_advice && (
        <Card title={<><FileTextOutlined className="mr-2" />简历优化建议</>} className="mb-4">
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{plan.resume_advice}</Paragraph>
        </Card>
      )}

      {pc.overall_advice && (
        <Card title={<><BulbOutlined className="mr-2" />总体建议</>}>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{pc.overall_advice}</Paragraph>
        </Card>
      )}
    </div>
  )
}
