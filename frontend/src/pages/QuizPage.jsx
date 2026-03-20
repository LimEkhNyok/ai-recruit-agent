import { useState, useEffect, useRef } from 'react'
import { Select, Button, Input, Tag, Space, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { generateQuiz, judgeQuiz, skipQuiz, getQuizStats } from '../api/quiz'
import useFeatureGuard from '../hooks/useFeatureGuard'
import useBillingStore from '../store/useBillingStore'
import { useTranslation } from '../i18n'

const { TextArea } = Input

const TOPICS = [
  'Python', 'Java', 'JavaScript', 'C语言', 'C++',
  '数据结构与算法', '操作系统', '计算机组成原理', '计算机网络',
  '数据库', '计算机八股文', '设计模式', 'Linux',
  'Git', '前端基础', '后端基础', '系统设计',
]

const QUESTION_TYPES = ['判断题', '选择题', '简答题', '编程题']

const difficultyColors = { '简单': 'green', '中等': 'blue', '困难': 'red' }

export default function QuizPage() {
  const [topic, setTopic] = useState(null)
  const [questionType, setQuestionType] = useState(null)
  const [question, setQuestion] = useState(null)
  const [activeQuestionType, setActiveQuestionType] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [judging, setJudging] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(null)
  const [resultAnimState, setResultAnimState] = useState('hidden')
  const navigate = useNavigate()
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("quiz")
  const { fetchWallet } = useBillingStore()
  const { t } = useTranslation()
  const questionCountRef = useRef(0)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await getQuizStats()
      setStats(res.data)
    } catch {}
  }

  const handleGenerate = async () => {
    if (!topic || !questionType) {
      message.warning(t('quiz.topicRequired'))
      return
    }
    setGenerating(true)
    setQuestion(null)
    setResult(null)
    setResultAnimState('hidden')
    setUserAnswer('')
    const currentType = questionType
    setActiveQuestionType(currentType)
    try {
      const res = await generateQuiz(topic, currentType)
      setQuestion(res.data)
      questionCountRef.current += 1
      fetchWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || t('quiz.generateFailed'))
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      message.warning(t('quiz.answerRequired'))
      return
    }
    setJudging(true)
    try {
      const res = await judgeQuiz({
        question: question.question,
        question_type: activeQuestionType,
        correct_answer: question.correct_answer,
        knowledge_point: question.knowledge_point,
        topic,
        user_answer: userAnswer,
      })
      setResult(res.data)
      setResultAnimState('entering')
      setTimeout(() => setResultAnimState('visible'), 50)
      loadStats()
    } catch (err) {
      message.error(t('quiz.judgeFailed'))
    } finally {
      setJudging(false)
    }
  }

  const handleSkip = async () => {
    setJudging(true)
    try {
      const res = await skipQuiz({
        question: question.question,
        question_type: activeQuestionType,
        correct_answer: question.correct_answer,
        knowledge_point: question.knowledge_point,
        topic,
        explanation: question.explanation,
      })
      setResult(res.data)
      setResultAnimState('entering')
      setTimeout(() => setResultAnimState('visible'), 50)
      loadStats()
    } catch (err) {
      message.error(t('quiz.judgeFailed'))
    } finally {
      setJudging(false)
    }
  }

  const handleNext = () => {
    handleGenerate()
  }

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.target
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      const newValue = value.substring(0, start) + '    ' + value.substring(end)
      setUserAnswer(newValue)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }
  }

  const renderAnswerInput = () => {
    if (!question) return null
    const disabled = !!result

    if (activeQuestionType === '判断题') {
      return (
        <div className="flex gap-3">
          {[{ value: '对', label: t('quiz.true') }, { value: '错', label: t('quiz.false') }].map((opt) => (
            <button
              key={opt.value}
              onClick={() => !disabled && setUserAnswer(opt.value)}
              disabled={disabled}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                border: `1px solid ${userAnswer === opt.value ? '#0066FF' : 'var(--ctw-border-default)'}`,
                background: userAnswer === opt.value ? '#0066FF' : 'var(--ctw-surface-card)',
                color: userAnswer === opt.value ? '#fff' : 'var(--ctw-text-primary)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                fontWeight: 500,
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: disabled ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!disabled && userAnswer !== opt.value) {
                  e.currentTarget.style.borderColor = '#0066FF'
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && userAnswer !== opt.value) {
                  e.currentTarget.style.borderColor = 'var(--ctw-border-default)'
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )
    }

    if (activeQuestionType === '选择题' && question.options?.length > 0) {
      return (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            const optValue = opt.charAt(0)
            const isSelected = userAnswer === optValue
            return (
              <button
                key={i}
                onClick={() => !disabled && setUserAnswer(optValue)}
                disabled={disabled}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? '#0066FF' : 'var(--ctw-border-default)'}`,
                  background: isSelected ? '#0066FF' : 'var(--ctw-surface-card)',
                  color: isSelected ? '#fff' : 'var(--ctw-text-primary)',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: disabled ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!disabled && !isSelected) {
                    e.currentTarget.style.borderColor = '#0066FF'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--ctw-border-default)'
                  }
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <TextArea
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyDown={activeQuestionType === '编程题' ? handleCodeKeyDown : undefined}
        placeholder={activeQuestionType === '编程题' ? t('quiz.codePlaceholder') : t('quiz.answerPlaceholder')}
        autoSize={{ minRows: activeQuestionType === '编程题' ? 8 : 3, maxRows: 20 }}
        disabled={disabled}
        style={{
          fontFamily: activeQuestionType === '编程题' ? "'JetBrains Mono', monospace" : "'DM Sans', sans-serif",
          fontSize: 14,
          borderRadius: 8,
          border: '1px solid var(--ctw-border-default)',
          padding: '12px 14px',
        }}
      />
    )
  }

  if (guardLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
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
      </div>
    )
  }

  if (available === false) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ctw-text-tertiary)' }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '16px 0 0' }}>
          {`${featureLabel} ${t('guard.featureUnavailable')}`}
        </h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '8px 0 0' }}>
          {t('guard.featureUnavailableDesc')}
        </p>
        <Button type="primary" onClick={() => navigate('/settings')} style={{ marginTop: 24 }}>
          {t('common.goSettings')}
        </Button>
      </div>
    )
  }

  const questionNumber = String(questionCountRef.current).padStart(3, '0')

  return (
    <div className="max-w-6xl mx-auto">
      <div className="quiz-layout" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24 }}>
        {/* Left Panel */}
        <div>
          <div
            style={{
              border: '1px solid var(--ctw-border-default)',
              borderRadius: 12,
              padding: 24,
              background: 'var(--ctw-surface-card)',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--ctw-text-primary)',
                  margin: 0,
                }}
              >
                {t('quiz.title')}
              </h2>
            </div>

            {/* Controls */}
            <div className="flex gap-3 mb-5 flex-wrap">
              <Select
                style={{ width: 200 }}
                placeholder={t('quiz.selectTopic')}
                value={topic}
                onChange={(val) => setTopic(Array.isArray(val) ? val[val.length - 1] : val)}
                showSearch
                options={TOPICS.map((tp) => ({ label: tp, value: tp }))}
              />
              <Select
                style={{ width: 140 }}
                placeholder={t('quiz.selectType')}
                value={questionType}
                onChange={setQuestionType}
                options={QUESTION_TYPES.map((tp) => ({ label: tp, value: tp }))}
              />
              <Button
                type="primary"
                onClick={handleGenerate}
                loading={generating}
              >
                {question ? t('quiz.change') : t('quiz.start')}
              </Button>
            </div>

            {/* Generating state */}
            {generating && (
              <div className="flex flex-col items-center justify-center py-16">
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
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', marginTop: 16 }}>
                  {t('quiz.generating')}
                </p>
              </div>
            )}

            {/* Question display */}
            {question && !generating && (
              <div>
                {/* Question number + tags */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: 'var(--ctw-text-tertiary)',
                    }}
                  >
                    #{questionNumber}
                  </span>
                  <Tag color={difficultyColors[question.difficulty] || 'blue'}>{question.difficulty}</Tag>
                  <Tag>{question.knowledge_point}</Tag>
                  <Tag color="cyan">{activeQuestionType}</Tag>
                </div>

                {/* Question text */}
                <div style={{ marginBottom: 20 }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 18,
                      fontWeight: 500,
                      color: 'var(--ctw-text-primary)',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {question.question}
                  </p>
                </div>

                {/* Answer input */}
                <div style={{ marginBottom: 16 }}>
                  {renderAnswerInput()}
                </div>

                {/* Action buttons */}
                {!result && (
                  <div className="flex gap-2">
                    <Button
                      type="primary"
                      onClick={handleSubmit}
                      loading={judging}
                      disabled={!userAnswer.trim()}
                    >
                      {t('quiz.submit')}
                    </Button>
                    <Button
                      onClick={handleSkip}
                      loading={judging}
                    >
                      {t('quiz.skip')}
                    </Button>
                  </div>
                )}

                {/* Result feedback */}
                {result && (
                  <div
                    style={{
                      marginTop: 16,
                      borderLeft: `3px solid ${result.is_correct ? 'var(--ctw-success)' : 'var(--ctw-error)'}`,
                      borderRadius: 8,
                      padding: 20,
                      background: result.is_correct ? 'rgba(0,212,170,0.05)' : 'rgba(239,68,68,0.05)',
                      opacity: resultAnimState === 'hidden' ? 0 : 1,
                      transform: resultAnimState === 'hidden' ? 'translateY(8px)' : 'translateY(0)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease, background-color 0.3s ease',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        style={{
                          display: 'inline-flex',
                          animation: resultAnimState === 'visible' ? 'icon-bounce 0.2s ease-out' : 'none',
                        }}
                      >
                        {result.is_correct ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 16,
                          fontWeight: 600,
                          color: result.is_correct ? 'var(--ctw-success)' : 'var(--ctw-error)',
                        }}
                      >
                        {result.is_correct ? t('quiz.correct') : t('quiz.incorrect')}
                      </span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                        {t('quiz.correctAnswer')}
                      </span>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-primary)', whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>
                        {result.correct_answer}
                      </p>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                        {t('quiz.explanation')}
                      </span>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', whiteSpace: 'pre-wrap', margin: '4px 0 0', lineHeight: 1.7 }}>
                        {result.explanation}
                      </p>
                    </div>

                    <Button type="primary" onClick={handleNext}>
                      {t('quiz.next')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!question && !generating && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ctw-text-tertiary)' }}>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h3
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--ctw-text-primary)',
                    margin: '16px 0 0',
                  }}
                >
                  {t('quiz.emptyTitle')}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '8px 0 0' }}>
                  {t('quiz.emptySubtitle')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Stats */}
        <div>
          <div
            style={{
              border: '1px solid var(--ctw-border-default)',
              borderRadius: 12,
              padding: 20,
              background: 'var(--ctw-surface-card)',
              position: 'sticky',
              top: 24,
            }}
          >
            <h3
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: '0 0 20px',
              }}
            >
              {t('quiz.stats')}
            </h3>

            {stats ? (
              <div>
                {/* Accuracy big number */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: 'var(--ctw-text-tertiary)',
                      margin: '0 0 4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {t('quiz.accuracy')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 48,
                        fontWeight: 700,
                        color: 'var(--ctw-text-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {stats.accuracy}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 18,
                        color: 'var(--ctw-text-tertiary)',
                        marginLeft: 2,
                      }}
                    >
                      %
                    </span>
                  </div>
                </div>

                {/* Stats list */}
                <div style={{ marginBottom: 16 }}>
                  <div className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--ctw-border-default)' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-secondary)' }}>
                      {t('quiz.total')}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                      {stats.total}
                    </span>
                  </div>
                  <div className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--ctw-border-default)' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-secondary)' }}>
                      {t('quiz.correctCount')}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--ctw-success)' }}>
                      {stats.correct}
                    </span>
                  </div>
                </div>

                {/* Mastered tags */}
                {stats.mastered?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 6px' }}>
                      {t('quiz.mastered')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {stats.mastered.map((k, i) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--ctw-success)',
                            color: 'var(--ctw-success)',
                          }}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weak tags */}
                {stats.weak?.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 6px' }}>
                      {t('quiz.weak')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {stats.weak.map((k, i) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--ctw-warning)',
                            color: 'var(--ctw-warning)',
                          }}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {stats.total === 0 && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)', margin: 0 }}>
                    {t('quiz.noRecords')}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center" style={{ padding: 20 }}>
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
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes icon-bounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @media (max-width: 1024px) {
          .quiz-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
