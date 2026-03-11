import { useState, useEffect } from 'react'
import { Card, Typography, Spin, Row, Col, Table, Tag, Statistic } from 'antd'
import {
  ThunderboltOutlined,
  FieldNumberOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { getStats, getRecent } from '../api/usage'

const { Title, Text } = Typography

const FEATURE_LABELS = {
  assessment: '职业测评',
  matching: '岗位匹配',
  interview: '模拟面试',
  career: '职业规划',
  resume: '简历分析',
  quiz: '刷题练习',
  unknown: '其他',
}

const FEATURE_COLORS = {
  assessment: 'blue',
  matching: 'green',
  interview: 'purple',
  career: 'orange',
  resume: 'cyan',
  quiz: 'magenta',
}

const columns = [
  {
    title: '时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-',
  },
  {
    title: '功能',
    dataIndex: 'feature',
    key: 'feature',
    width: 100,
    render: (v) => <Tag color={FEATURE_COLORS[v] || 'default'}>{FEATURE_LABELS[v] || v}</Tag>,
  },
  {
    title: '总 Tokens',
    dataIndex: 'total_tokens',
    key: 'total_tokens',
    width: 100,
    render: (v) => v ? v.toLocaleString() : '-',
  },
  {
    title: '请求',
    dataIndex: 'request_tokens',
    key: 'request_tokens',
    width: 90,
    render: (v) => v ? v.toLocaleString() : '-',
  },
  {
    title: '思考',
    dataIndex: 'thinking_tokens',
    key: 'thinking_tokens',
    width: 90,
    render: (v) => v ? v.toLocaleString() : '-',
  },
  {
    title: '响应',
    dataIndex: 'response_tokens',
    key: 'response_tokens',
    width: 90,
    render: (v) => v ? v.toLocaleString() : '-',
  },
  {
    title: '耗时',
    dataIndex: 'latency_ms',
    key: 'latency_ms',
    width: 80,
    render: (v) => v != null ? `${(v / 1000).toFixed(1)}s` : '-',
  },
  {
    title: '状态',
    dataIndex: 'success',
    key: 'success',
    width: 70,
    render: (v) => v
      ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
      : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  },
]

export default function UsagePage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, rRes] = await Promise.all([getStats(), getRecent(50)])
        setStats(sRes.data)
        setRecent(rRes.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  const byFeature = stats?.by_feature || {}

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Title level={4} style={{ margin: 0 }}>使用统计</Title>
        <Text type="secondary">查看你的 AI 功能使用情况</Text>
      </div>

      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic
              title="使用次数"
              value={stats?.total_calls || 0}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功次数"
              value={stats?.success_calls || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总 Tokens"
              value={stats?.total_tokens || 0}
              prefix={<FieldNumberOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="请求 / 思考 / 响应"
              value={`${(stats?.request_tokens || 0).toLocaleString()} / ${(stats?.thinking_tokens || 0).toLocaleString()} / ${(stats?.response_tokens || 0).toLocaleString()}`}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: 14 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="按功能分类" className="mb-4" size="small">
        <div className="flex flex-wrap gap-4">
          {Object.entries(FEATURE_LABELS).filter(([k]) => k !== 'unknown').map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Tag color={FEATURE_COLORS[key]}>{label}</Tag>
              <Text strong>{byFeature[key] || 0}</Text>
              <Text type="secondary">次</Text>
            </div>
          ))}
        </div>
      </Card>

      <Card title="最近使用明细" size="small">
        <Table
          dataSource={recent}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: false }}
        />
      </Card>
    </div>
  )
}
