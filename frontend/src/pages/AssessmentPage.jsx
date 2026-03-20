import { useState, useEffect, useRef } from 'react'
import { message } from 'antd'
import { ArrowUpOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { startAssessment, chat, finishAssessment, getProfile } from '../api/assessment'
import useFeatureGuard from '../hooks/useFeatureGuard'
import { useTranslation } from '../i18n'
import FadeIn from '../components/motion/FadeIn'

function LoadingCursor({ text }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
      <div className="flex items-center gap-3">
        <span
          className="font-mono"
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0066FF',
            animation: 'cursorBlink 1s step-end infinite',
          }}
        >
          {'>_'}
        </span>
        {text && (
          <span className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)' }}>
            {text}
          </span>
        )}
      </div>
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
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
    } catch (err) {
      message.error(t('assessment.startFailed'))
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
              <span
                className="font-mono"
                style={{
                  fontSize: 14,
                  color: '#0066FF',
                  animation: 'cursorBlink 1s step-end infinite',
                }}
              >
                {'>_'}
              </span>
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

      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </FadeIn>
  )
}
