import { useState, useEffect, useRef } from 'react'
import { Input, Button, Card, Spin, Typography, Modal, Progress, Tag, message, Descriptions, Result } from 'antd'
import { SendOutlined, StopOutlined, FileTextOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { startInterview, chatStream, endInterview } from '../api/interview'
import useFeatureGuard from '../hooks/useFeatureGuard'

const { Title, Text, Paragraph } = Typography

const dimLabels = {
  professional_skill: '专业技能',
  communication: '沟通表达',
  problem_solving: '问题解决',
  culture_fit: '文化匹配',
  growth_potential: '成长潜力',
}

function EvaluationReport({ evaluation, jobTitle }) {
  if (!evaluation) return null

  const dims = evaluation.dimensions || {}

  return (
    <div>
      <div className="text-center mb-4">
        <Title level={4} style={{ margin: 0 }}>{jobTitle} - 面试评估报告</Title>
        <div className="mt-2">
          <Text>综合评分：</Text>
          <Progress
            type="circle"
            percent={evaluation.overall_score}
            size={80}
            strokeColor={evaluation.overall_score >= 70 ? '#52c41a' : '#faad14'}
          />
        </div>
        <div className="mt-2">
          <Tag color={evaluation.recommended ? 'green' : 'orange'}>
            {evaluation.recommended ? '推荐录用' : '暂不推荐'}
          </Tag>
        </div>
      </div>

      <div className="mb-4">
        <Title level={5}>各维度评分</Title>
        {Object.entries(dims).map(([key, dim]) => (
          <div key={key} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <Text strong>{dimLabels[key] || key}</Text>
              <Text>{dim.score} 分</Text>
            </div>
            <Progress percent={dim.score} strokeColor="#1677ff" showInfo={false} size="small" />
            <Text type="secondary" style={{ fontSize: 12 }}>{dim.comment}</Text>
          </div>
        ))}
      </div>

      <Descriptions column={1} size="small" bordered className="mb-4" contentStyle={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
        <Descriptions.Item label="优势">
          <div className="flex flex-wrap gap-1">
            {(evaluation.strengths || []).map((s, i) => <Tag key={i} color="green" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>{s}</Tag>)}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="不足">
          <div className="flex flex-wrap gap-1">
            {(evaluation.weaknesses || []).map((s, i) => <Tag key={i} color="orange" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>{s}</Tag>)}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="改进建议">
          <ul className="m-0 pl-4">
            {(evaluation.improvement_suggestions || []).map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ul>
        </Descriptions.Item>
      </Descriptions>

      <Paragraph>{evaluation.overall_comment}</Paragraph>
    </div>
  )
}

export default function InterviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get('job_id')
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("interview")

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(true)
  const [interviewId, setInterviewId] = useState(null)
  const [jobTitle, setJobTitle] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [ending, setEnding] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!jobId) {
      message.error('缺少岗位信息，请从匹配结果中选择岗位')
      navigate('/matching', { replace: true })
      return
    }

    const init = async () => {
      try {
        const res = await startInterview(Number(jobId))
        setInterviewId(res.data.interview_id)
        setJobTitle(res.data.job_title)
        setMessages([{ role: 'ai', content: res.data.message }])
      } catch (err) {
        message.error('启动面试失败')
      } finally {
        setStarting(false)
      }
    }
    init()
  }, [jobId, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || streaming) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setStreaming(true)

    let aiReply = ''
    setMessages((prev) => [...prev, { role: 'ai', content: '' }])

    try {
      for await (const chunk of chatStream(interviewId, text)) {
        aiReply += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'ai', content: aiReply }
          return updated
        })
      }
    } catch (err) {
      message.error('对话失败')
    } finally {
      setStreaming(false)
    }
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      const res = await endInterview(interviewId)
      setEvaluation(res.data.evaluation)
      setShowReport(true)
    } catch (err) {
      message.error('生成评估报告失败')
    } finally {
      setEnding(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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

  if (starting) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <Spin size="large" tip="正在准备面试..." />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={4} style={{ margin: 0 }}>AI 模拟面试</Title>
            <Text type="secondary">岗位：{jobTitle}</Text>
          </div>
          <div className="flex gap-2">
            {evaluation ? (
              <>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => setShowReport(true)}
                >
                  面试结果
                </Button>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/matching')}
                >
                  返回匹配
                </Button>
              </>
            ) : (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleEnd}
                loading={ending}
                disabled={messages.length < 3}
              >
                结束面试
              </Button>
            )}
          </div>
        </div>

        <div
          className="border rounded-lg p-4 mb-4 overflow-y-auto"
          style={{ height: 'calc(100vh - 340px)', minHeight: 300, background: '#fafafa' }}
        >
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {streaming && messages[messages.length - 1]?.content === '' && (
            <div className="px-4 py-3">
              <Spin size="small" />
              <Text type="secondary" className="ml-2">面试官思考中...</Text>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!evaluation && (
          <div className="flex gap-2">
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的回答..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={streaming || ending}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={streaming}
              disabled={!input.trim()}
            />
          </div>
        )}
      </Card>

      <Modal
        title={null}
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={[
          <Button key="back" onClick={() => navigate('/matching')}>返回匹配</Button>,
          <Button key="close" type="primary" onClick={() => setShowReport(false)}>关闭</Button>,
        ]}
        width={640}
      >
        <EvaluationReport evaluation={evaluation} jobTitle={jobTitle} />
      </Modal>
    </div>
  )
}
