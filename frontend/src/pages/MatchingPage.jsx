import { useState, useEffect } from 'react'
import { Typography, Spin, Row, Col, message, Divider, Empty, Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import { triggerMatch, getResults } from '../api/matching'
import useFeatureGuard from '../hooks/useFeatureGuard'

const { Title, Text } = Typography

export default function MatchingPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("matching")

  useEffect(() => {
    const load = async () => {
      try {
        const cached = await getResults()
        if (cached.data.results && cached.data.results.length > 0) {
          setResults(cached.data.results)
          setLoading(false)
          return
        }
      } catch {
        // no cached results
      }

      try {
        const res = await triggerMatch()
        setResults(res.data.results)
      } catch (err) {
        message.error(err.response?.data?.detail || '匹配失败，请先完成测评')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleInterview = (jobId) => {
    navigate(`/interview?job_id=${jobId}`)
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 400 }}>
        <Spin size="large" />
        <div className="text-center">
          <Title level={4} style={{ margin: 0 }}>AI 正在为你匹配最佳岗位...</Title>
          <Text type="secondary">正在分析你的画像与岗位的契合度，请稍候</Text>
        </div>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return <Empty description="暂无匹配结果" />
  }

  const normal = results.filter((r) => !r.is_beyond_cognition)
  const beyond = results.filter((r) => r.is_beyond_cognition)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <Title level={4} style={{ margin: 0 }}>岗位匹配结果</Title>
        <Text type="secondary">基于你的人才画像，AI 为你推荐了以下岗位</Text>
      </div>

      {normal.length > 0 && (
        <>
          <Title level={5}>推荐岗位</Title>
          <Row gutter={[16, 16]}>
            {normal.map((m) => (
              <Col key={m.job_id} xs={24} md={12} lg={8}>
                <MatchCard match={m} onInterview={handleInterview} />
              </Col>
            ))}
          </Row>
        </>
      )}

      {beyond.length > 0 && (
        <>
          <Divider />
          <div className="mb-3">
            <Title level={5} style={{ color: '#722ed1', margin: 0 }}>突破认知推荐</Title>
            <Text type="secondary">这些岗位你可能从未考虑过，但 AI 分析认为非常适合你</Text>
          </div>
          <Row gutter={[16, 16]}>
            {beyond.map((m) => (
              <Col key={m.job_id} xs={24} md={12} lg={8}>
                <MatchCard match={m} onInterview={handleInterview} />
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  )
}
