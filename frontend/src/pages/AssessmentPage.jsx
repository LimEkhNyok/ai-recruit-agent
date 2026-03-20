import { useState, useEffect, useRef } from 'react'
import { message } from 'antd'
import { ArrowUpOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { startAssessment, chat, finishAssessment, getProfile } from '../api/assessment'
import useFeatureGuard from '../hooks/useFeatureGuard'
import useThemeStore from '../store/useThemeStore'
import { useTranslation } from '../i18n'
import FadeIn from '../components/motion/FadeIn'

function LoadingCursor({ text }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#0066FF',
                animation: `loading-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        {text && (
          <span className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)' }}>
            {text}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AssessmentPage() {
  const { t } = useTranslation()
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
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("assessment")
  const { markApiUsed } = useThemeStore()

  useEffect(() => {
    let ignore = false
    const check = async () => {
      if (forceNew) {
        if (!ignore) await beginAssessment()
        if (!ignore) setChecking(false)
        return
      }
      try {
        await getProfile()
        if (!ignore) navigate('/profile', { replace: true })
        return
      } catch {}
      if (ignore) return
      await beginAssessment()
      if (!ignore) setChecking(false)
    }
    check()
    return () => { ignore = true }
  }, [])

  const beginAssessment = async () => {
    setStarting(true)
    try {
      const res = await startAssessment()
      setAssessmentId(res.data.assessment_id)
      setMessages([{ role: 'ai', content: res.data.message }])
      markApiUsed()
    } catch (err) {
      message.error(t('assessment.startFailed'))
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const parseOptions = (text) => {
    if (!text) return []
    const regex = /^([A-D])\.\s*(.+)$/gm
    const options = []
    let match
    while ((match = regex.exec(text)) !== null) {
      options.push({ label: match[1], text: match[2].trim() })
    }
    return options
  }

  const lastAiMessage = [...messages].reverse().find((m) => m.role === 'ai')
  const options = !isComplete && !loading ? parseOptions(lastAiMessage?.content) : []

  const handleOptionClick = (option) => {
    if (loading) return
    setInput(option.label)
    setTimeout(() => {
      const text = option.label
      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: `${option.label}. ${option.text}` }])
      setLoading(true)
      chat(assessmentId, `${option.label}. ${option.text}`)
        .then((res) => {
          setMessages((prev) => [...prev, { role: 'ai', content: res.data.reply }])
          if (res.data.is_complete) setIsComplete(true)
        })
        .catch(() => message.error(t('assessment.sendFailed')))
        .finally(() => setLoading(false))
    }, 0)
  }

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
      message.error(t('assessment.sendFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      await finishAssessment(assessmentId)
      message.success(t('assessment.generateSuccess'))
      navigate('/profile')
    } catch (err) {
      message.error(t('assessment.generateFailed'))
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

  if (guardLoading) {
    return <LoadingCursor />
  }

  if (available === false) {
    return (
      <FadeIn>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
          <div
            className="font-mono"
            style={{ fontSize: 24, color: 'var(--ctw-warning)', marginBottom: 16 }}
          >
            !
          </div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 8 }}>
            {featureLabel}{t('guard.featureUnavailable')}
          </h2>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)', marginBottom: 24 }}>
            {t('guard.featureUnavailableDesc')}
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="font-body"
            style={{
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--ctw-text-primary)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {t('common.goSettings')}
          </button>
        </div>
      </FadeIn>
    )
  }

  if (checking || starting) {
    return <LoadingCursor text={checking ? t('assessment.checking') : t('assessment.starting')} />
  }

  return (
    <FadeIn>
      <div
        className="mx-auto flex flex-col"
        style={{
          maxWidth: 720,
          minHeight: 'calc(100vh - 64px)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 16px 16px' }}>
          <h1
            className="font-display"
            style={{ fontSize: 20, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: 0 }}
          >
            {t('assessment.title')}
          </h1>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '4px 0 0' }}>
            {t('assessment.subtitle')}
          </p>
        </div>

        {/* Chat Area */}
        <div
          className="flex-1 overflow-y-auto relative"
          style={{
            padding: '8px 16px',
            paddingBottom: isComplete ? 16 : 80,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2" style={{ padding: '8px 0' }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#0066FF',
                      animation: `loading-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-tertiary)' }}>
                {t('assessment.thinking')}
              </span>
            </div>
          )}
          <div ref={bottomRef} />

          {/* Bottom gradient mask */}
          {!isComplete && (
            <div
              className="pointer-events-none"
              style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                height: 32,
                background: 'linear-gradient(transparent, var(--ctw-surface-base))',
              }}
            />
          )}
        </div>

        {/* Completion */}
        {isComplete ? (
          <div className="text-center" style={{ padding: '32px 16px 48px' }}>
            <CheckCircleFilled style={{ fontSize: 24, color: 'var(--ctw-success)', marginBottom: 12 }} />
            <h2
              className="font-display"
              style={{ fontSize: 24, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 8 }}
            >
              {t('assessment.complete')}
            </h2>
            <p className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)', marginBottom: 24 }}>
              {t('assessment.completeSubtitle')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="font-body"
                style={{
                  padding: '10px 28px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#fff',
                  background: 'var(--ctw-text-primary)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: finishing ? 'wait' : 'pointer',
                  opacity: finishing ? 0.7 : 1,
                }}
              >
                {finishing ? t('common.loading') : t('assessment.generateProfile')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="font-body"
                style={{
                  padding: '10px 28px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--ctw-text-primary)',
                  background: 'transparent',
                  border: '1px solid var(--ctw-border-default)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                {t('assessment.backHome')}
              </button>
            </div>
          </div>
        ) : (
          /* Input Area */
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              padding: '12px 16px 24px',
              background: 'var(--ctw-surface-base)',
            }}
          >
            {/* Options */}
            {options.length > 0 && (
              <div className="flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
                {options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleOptionClick(opt)}
                    className="font-body"
                    style={{
                      padding: '8px 16px',
                      fontSize: 14,
                      border: '1px solid var(--ctw-border-default)',
                      borderRadius: 8,
                      background: 'var(--ctw-surface-card)',
                      color: 'var(--ctw-text-primary)',
                      cursor: 'pointer',
                      transition: 'border-color 200ms, background 200ms',
                      textAlign: 'left',
                      lineHeight: 1.5,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0066FF'
                      e.currentTarget.style.background = 'var(--ctw-surface-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--ctw-border-default)'
                      e.currentTarget.style.background = 'var(--ctw-surface-card)'
                    }}
                  >
                    <span style={{ color: '#0066FF', fontWeight: 600, marginRight: 6 }}>{opt.label}.</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            )}
            <div
              className="flex items-center gap-3"
              style={{
                border: '1px solid var(--ctw-border-default)',
                borderRadius: 12,
                padding: '6px 6px 6px 16px',
                background: 'var(--ctw-surface-card)',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('assessment.inputPlaceholder')}
                disabled={loading}
                className="font-body"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  height: 36,
                  color: 'var(--ctw-text-primary)',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: input.trim() && !loading ? 'var(--ctw-text-primary)' : 'var(--ctw-border-default)',
                  color: '#fff',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  transition: 'transform 200ms, background 200ms',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !loading) e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <ArrowUpOutlined style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        )}
      </div>

    </FadeIn>
  )
}
