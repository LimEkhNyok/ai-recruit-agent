import { useState, useEffect, useRef, useCallback } from 'react'
import { message, Tooltip } from 'antd'
import { ArrowUpOutlined, ArrowLeftOutlined, FileTextOutlined, AudioOutlined } from '@ant-design/icons'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { startInterview, chatStream, endInterview } from '../api/interview'
import useFeatureGuard from '../hooks/useFeatureGuard'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import useThemeStore from '../store/useThemeStore'
import { useTranslation } from '../i18n'
import FadeIn from '../components/motion/FadeIn'

const dimKeys = {
  professional_skill: 'professionalSkill',
  communication: 'communication',
  problem_solving: 'problemSolving',
  culture_fit: 'cultureFit',
  growth_potential: 'growthPotential',
}

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

function EvaluationModal({ open, onClose, evaluation, jobTitle, onBack, t }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showBars, setShowBars] = useState(false)

  useEffect(() => {
    if (!open || !evaluation) return
    setAnimatedScore(0)
    setShowBars(false)

    const target = evaluation.overall_score || 0
    const duration = 1200
    const start = performance.now()

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    const timer = setTimeout(() => setShowBars(true), 400)
    return () => clearTimeout(timer)
  }, [open, evaluation])

  if (!open || !evaluation) return null

  const dims = evaluation.dimensions || {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-y-auto"
        style={{
          width: 640,
          maxWidth: '90vw',
          maxHeight: '85vh',
          background: 'var(--ctw-surface-card)',
          borderRadius: 16,
          padding: 32,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 20,
            color: 'var(--ctw-text-tertiary)',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        {/* Title */}
        <h2
          className="font-display text-center"
          style={{ fontSize: 18, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 4 }}
        >
          {jobTitle} - {t('interview.report.title')}
        </h2>

        {/* Recommendation badge */}
        <div className="text-center" style={{ marginBottom: 24 }}>
          <span
            className="font-body"
            style={{
              fontSize: 12,
              padding: '2px 10px',
              borderRadius: 9999,
              background: evaluation.recommended ? 'rgba(0,212,170,0.1)' : 'rgba(250,140,22,0.1)',
              color: evaluation.recommended ? 'var(--ctw-success)' : 'var(--ctw-warning)',
            }}
          >
            {evaluation.recommended ? t('interview.report.recommended') : t('interview.report.notRecommended')}
          </span>
        </div>

        {/* Overall Score */}
        <div className="text-center" style={{ marginBottom: 32 }}>
          <span
            className="font-mono"
            style={{
              fontSize: 72,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0066FF, #00D4AA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
            }}
          >
            {animatedScore}
          </span>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-tertiary)', marginTop: 4 }}>
            {t('interview.report.overallScore')}
          </p>
        </div>

        {/* Dimension bars */}
        <div style={{ marginBottom: 28 }}>
          <h3
            className="font-display"
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 16 }}
          >
            {t('interview.report.dimensions')}
          </h3>
          {Object.entries(dims).map(([key, dim]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-secondary)' }}>
                  {t(`interview.report.${dimKeys[key]}`, key)}
                </span>
                <span className="font-mono" style={{ fontSize: 13, color: 'var(--ctw-text-primary)' }}>
                  {dim.score}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--ctw-border-default)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    background: '#0066FF',
                    width: showBars ? `${dim.score}%` : '0%',
                    transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
              {dim.comment && (
                <p className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', marginTop: 4 }}>
                  {dim.comment}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Strengths */}
        {evaluation.strengths?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3
              className="font-display"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 10 }}
            >
              {t('interview.report.strengths')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {evaluation.strengths.map((s, i) => (
                <span
                  key={i}
                  className="font-body"
                  style={{
                    fontSize: 13,
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: 'rgba(0, 212, 170, 0.08)',
                    color: 'var(--ctw-success)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {evaluation.weaknesses?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3
              className="font-display"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 10 }}
            >
              {t('interview.report.weaknesses')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {evaluation.weaknesses.map((s, i) => (
                <span
                  key={i}
                  className="font-body"
                  style={{
                    fontSize: 13,
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: 'rgba(250, 140, 22, 0.08)',
                    color: 'var(--ctw-warning)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions - quote style */}
        {evaluation.improvement_suggestions?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3
              className="font-display"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 10 }}
            >
              {t('interview.report.suggestions')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evaluation.improvement_suggestions.map((s, i) => (
                <div
                  key={i}
                  className="font-body"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--ctw-text-secondary)',
                    paddingLeft: 14,
                    borderLeft: '2px solid #0066FF',
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall comment */}
        {evaluation.overall_comment && (
          <p className="font-body" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ctw-text-secondary)', marginBottom: 24 }}>
            {evaluation.overall_comment}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onBack}
            className="font-body"
            style={{
              padding: '8px 20px',
              fontSize: 14,
              color: 'var(--ctw-text-primary)',
              background: 'transparent',
              border: '1px solid var(--ctw-border-default)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {t('interview.backToMatching')}
          </button>
          <button
            onClick={onClose}
            className="font-body"
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--ctw-text-primary)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InterviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const jobId = searchParams.get('job_id')
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("interview")
  const { markApiUsed } = useThemeStore()

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
  const [recordingTime, setRecordingTime] = useState(0)
  const bottomRef = useRef(null)
  const lastTranscriptRef = useRef('')

  const handleSpeechError = useCallback((err) => {
    if (err === 'not-allowed') {
      message.warning(t('interview.micDenied'))
    } else {
      message.warning(t('interview.speechUnavailable'))
    }
  }, [t])

  const {
    isSupported: speechSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ onError: handleSpeechError })

  useEffect(() => {
    if (!isListening) {
      setRecordingTime(0)
      return
    }
    const timer = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [isListening])

  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      const newText = transcript.slice(lastTranscriptRef.current.length)
      if (newText) {
        setInput((prev) => prev + newText)
      }
      lastTranscriptRef.current = transcript
    }
  }, [transcript])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      lastTranscriptRef.current = ''
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!jobId) {
      message.error(t('interview.missingJob'))
      navigate('/matching', { replace: true })
      return
    }

    let ignore = false
    const init = async () => {
      try {
        const res = await startInterview(Number(jobId))
        if (ignore) return
        setInterviewId(res.data.interview_id)
        setJobTitle(res.data.job_title)
        setMessages([{ role: 'ai', content: res.data.message }])
        markApiUsed()
      } catch (err) {
        if (!ignore) message.error(t('interview.startFailed'))
      } finally {
        if (!ignore) setStarting(false)
      }
    }
    init()
    return () => { ignore = true }
  }, [jobId, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || streaming) return

    if (isListening) {
      stopListening()
    }
    lastTranscriptRef.current = ''
    resetTranscript()
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
      message.error(t('interview.chatFailed'))
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
      message.error(t('interview.endFailed'))
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

  if (starting) {
    return <LoadingCursor text={t('interview.preparing')} />
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
        <div className="flex items-center justify-between" style={{ padding: '24px 16px 16px' }}>
          <div>
            <h1
              className="font-display"
              style={{ fontSize: 20, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: 0 }}
            >
              {t('interview.title')}
            </h1>
            <p className="font-body" style={{ fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '4px 0 0' }}>
              {t('interview.position')}: {jobTitle}
            </p>
          </div>
          <div className="flex gap-2">
            {evaluation ? (
              <>
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 font-body"
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    color: 'var(--ctw-text-primary)',
                    background: 'transparent',
                    border: '1px solid var(--ctw-border-default)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <FileTextOutlined style={{ fontSize: 14 }} />
                  {t('interview.result')}
                </button>
                <button
                  onClick={() => navigate('/matching')}
                  className="flex items-center gap-1.5 font-body"
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    color: 'var(--ctw-text-primary)',
                    background: 'transparent',
                    border: '1px solid var(--ctw-border-default)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeftOutlined style={{ fontSize: 14 }} />
                  {t('interview.backToMatching')}
                </button>
              </>
            ) : (
              <button
                onClick={handleEnd}
                disabled={ending || messages.length < 3}
                className="font-body"
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: ending || messages.length < 3 ? 'var(--ctw-text-tertiary)' : 'var(--ctw-error)',
                  background: 'transparent',
                  border: '1px solid var(--ctw-border-default)',
                  borderRadius: 8,
                  cursor: ending || messages.length < 3 ? 'not-allowed' : 'pointer',
                  opacity: ending || messages.length < 3 ? 0.5 : 1,
                  transition: 'background 200ms',
                }}
                onMouseEnter={(e) => {
                  if (!ending && messages.length >= 3) {
                    e.currentTarget.style.background = 'rgba(255,77,79,0.06)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {ending ? t('common.loading') : t('interview.endInterview')}
              </button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          className="flex-1 overflow-y-auto relative"
          style={{
            padding: '8px 16px',
            paddingBottom: evaluation ? 16 : 80,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
          </div>

          {streaming && messages[messages.length - 1]?.content === '' && (
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
                {t('interview.thinking')}
              </span>
            </div>
          )}
          <div ref={bottomRef} />

          {/* Bottom gradient mask */}
          {!evaluation && (
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

        {/* Input Area */}
        {!evaluation && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              padding: '12px 16px 24px',
              background: 'var(--ctw-surface-base)',
            }}
          >
            {/* Recording indicator */}
            {isListening && (
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 8, padding: '0 4px' }}
              >
                <div className="recording-dot" />
                <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)' }}>
                  {t('interview.recording')} {formatRecordingTime(recordingTime)}
                </span>
                {interimTranscript && (
                  <span
                    className="font-body recording-indicator-interim"
                    style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)' }}
                  >
                    {interimTranscript}
                  </span>
                )}
              </div>
            )}

            <div
              className="flex items-center gap-3"
              style={{
                border: `1px solid ${isListening ? 'var(--ctw-error)' : 'var(--ctw-border-default)'}`,
                borderRadius: 12,
                padding: '6px 6px 6px 16px',
                background: 'var(--ctw-surface-card)',
                transition: 'border-color 200ms',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('interview.inputPlaceholder')}
                disabled={streaming || ending}
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
              {speechSupported && (
                <Tooltip title={isListening ? t('interview.stopRecording') : t('interview.voiceInput')}>
                  <button
                    onClick={toggleListening}
                    disabled={streaming || ending}
                    className={`mic-btn shrink-0 flex items-center justify-center${isListening ? ' mic-btn-recording' : ''}`}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 'none',
                      background: isListening ? undefined : 'transparent',
                      color: isListening ? undefined : 'var(--ctw-text-tertiary)',
                      cursor: streaming || ending ? 'not-allowed' : 'pointer',
                      transition: 'background 200ms, color 200ms',
                    }}
                  >
                    <AudioOutlined style={{ fontSize: 16 }} />
                  </button>
                </Tooltip>
              )}
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: input.trim() && !streaming ? 'var(--ctw-text-primary)' : 'var(--ctw-border-default)',
                  color: '#fff',
                  cursor: input.trim() && !streaming ? 'pointer' : 'not-allowed',
                  transition: 'transform 200ms, background 200ms',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !streaming) e.currentTarget.style.transform = 'scale(1.05)'
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

      {/* Evaluation Modal */}
      <EvaluationModal
        open={showReport}
        onClose={() => setShowReport(false)}
        evaluation={evaluation}
        jobTitle={jobTitle}
        onBack={() => navigate('/matching')}
        t={t}
      />

    </FadeIn>
  )
}
