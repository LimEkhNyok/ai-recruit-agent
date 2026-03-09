import { useState, useEffect, useRef } from 'react'
import { Input, Button, Card, Spin, message, Typography, Result } from 'antd'
import { SendOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { startAssessment, chat, finishAssessment, getProfile } from '../api/assessment'

const { Title, Text } = Typography

export default function AssessmentPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [starting, setStarting] = useState(false)
  const [assessmentId, setAssessmentId] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const bottomRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const forceNew = searchParams.get('force') === '1'

  useEffect(() => {
    const check = async () => {
      if (forceNew) {
        beginAssessment()
        setChecking(false)
        return
      }
      try {
        await getProfile()
        navigate('/profile', { replace: true })
      } catch {
        beginAssessment()
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [])

  const beginAssessment = async () => {
    setStarting(true)
    try {
      const res = await startAssessment()
      setAssessmentId(res.data.assessment_id)
      setMessages([{ role: 'ai', content: res.data.message }])
    } catch (err) {
      message.error('启动测评失败')
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await chat(assessmentId, text)
      setMessages((prev) => [...prev, { role: 'ai', content: res.data.reply }])
      if (res.data.is_complete) {
        setIsComplete(true)
      }
    } catch (err) {
      message.error('发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      await finishAssessment(assessmentId)
      message.success('画像生成成功！')
      navigate('/profile')
    } catch (err) {
      message.error('生成画像失败，请重试')
    } finally {
      setFinishing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (checking || starting) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <Spin size="large" tip={checking ? '检查测评状态...' : '正在启动测评...'} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <div className="mb-4">
          <Title level={4} style={{ margin: 0 }}>AI 职业测评</Title>
          <Text type="secondary">通过对话了解你的特质，生成专属人才画像</Text>
        </div>

        <div
          className="border rounded-lg p-4 mb-4 overflow-y-auto"
          style={{ height: 'calc(100vh - 340px)', minHeight: 300, background: '#fafafa' }}
        >
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex gap-3 mb-4">
              <div className="px-4 py-3">
                <Spin size="small" />
                <Text type="secondary" className="ml-2">思考中...</Text>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {isComplete ? (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="测评完成！"
            subTitle="点击下方按钮生成你的专属人才画像"
            extra={
              <Button type="primary" size="large" onClick={handleFinish} loading={finishing}>
                生成人才画像
              </Button>
            }
          />
        ) : (
          <div className="flex gap-2">
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的回答..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              disabled={!input.trim()}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
