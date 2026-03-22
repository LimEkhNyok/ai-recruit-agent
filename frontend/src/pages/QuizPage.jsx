import { useState, useEffect, useRef } from 'react'
import { Select, Button, Input, Tag, message, notification, Drawer } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  generateByKnowledge,
  generateVariant,
  judgeQuiz,
  skipQuiz,
  getQuizStats,
  getKnowledgePoints,
  getKnowledgeStats,
  getWeaknesses,
} from '../api/quiz'
import useFeatureGuard from '../hooks/useFeatureGuard'
import useBillingStore from '../store/useBillingStore'
import useThemeStore from '../store/useThemeStore'
import { useTranslation } from '../i18n'
import { checkAndNotify } from '../utils/achievementHelper'

const { TextArea } = Input

const QUESTION_TYPES = ['判断题', '选择题', '简答题', '编程题']
const DIFFICULTIES = ['简单', '中等', '困难']

const difficultyColors = { '简单': 'green', '中等': 'blue', '困难': 'red' }

// 暂时隐藏的领域，后端数据保留，后续可在此处移除 ID 重新启用
const HIDDEN_DOMAIN_IDS = [
  'cs_fundamentals',      // 计算机基础
  'devops',               // DevOps / 云计算
  'cs_math',              // 计算机数学
  'software_engineering', // 软件工程
  'nginx',                // Nginx
]

export default function QuizPage() {
  // Domain & knowledge point selection
  const [domains, setDomains] = useState([])
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [difficulty, setDifficulty] = useState('中等')
  const [questionType, setQuestionType] = useState(null)

  // Quiz state
  const [question, setQuestion] = useState(null)
  const [activeQuestionType, setActiveQuestionType] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [judging, setJudging] = useState(false)
  const [result, setResult] = useState(null)
  const [isVariant, setIsVariant] = useState(false)
  const [variantGenerating, setVariantGenerating] = useState(false)

  // Stats
  const [stats, setStats] = useState(null)
  const [knowledgeStats, setKnowledgeStats] = useState(null)

  // Weakness
  const [weaknessOpen, setWeaknessOpen] = useState(false)
  const [weaknessList, setWeaknessList] = useState([])
  const [weaknessLoading, setWeaknessLoading] = useState(false)

  // UI
  const [resultAnimState, setResultAnimState] = useState('hidden')
  const navigate = useNavigate()
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("quiz")
  const { fetchWallet } = useBillingStore()
  const { markApiUsed } = useThemeStore()
  const { t } = useTranslation()
  const questionCountRef = useRef(0)

  useEffect(() => {
    loadStats()
    loadKnowledgePoints()
  }, [])

  useEffect(() => {
    if (selectedDomain) {
      loadKnowledgeStats()
    }
  }, [selectedDomain])

  const loadStats = async () => {
    try {
      const res = await getQuizStats()
      setStats(res.data)
    } catch {}
  }

  const loadWeaknesses = async () => {
    setWeaknessLoading(true)
    try {
      const res = await getWeaknesses()
      setWeaknessList(res.data.weaknesses || [])
    } catch {}
    setWeaknessLoading(false)
  }

  const handleOpenWeakness = () => {
    setWeaknessOpen(true)
    loadWeaknesses()
  }

  const loadKnowledgePoints = async () => {
    try {
      const res = await getKnowledgePoints()
      setDomains(res.data.domains || [])
    } catch {}
  }

  const loadKnowledgeStats = async () => {
    try {
      const res = await getKnowledgeStats()
      setKnowledgeStats(res.data)
    } catch {}
  }

  // Filter out hidden domains
  const visibleDomains = domains.filter((d) => !HIDDEN_DOMAIN_IDS.includes(d.id))
  const generalDomains = visibleDomains.filter((d) => d.type === 'general')
  const languageDomains = visibleDomains.filter((d) => d.type === 'language')

  const currentDomainMeta = domains.find((d) => d.id === selectedDomain)
  const currentTopicMeta = currentDomainMeta?.topics?.find((tp) => tp.id === selectedTopic)

  const getTopicMasteryScore = (topicName) => {
    if (!knowledgeStats?.domains || !currentDomainMeta) return 0
    const domainStat = knowledgeStats.domains.find((d) => d.domain === currentDomainMeta.name)
    if (!domainStat) return 0
    const topicStat = domainStat.topics?.find((t) => t.knowledge_point === topicName)
    if (!topicStat) return 0
    return topicStat.mastery_score ?? 0
  }

  const getTopicStatus = (topicName) => {
    const score = getTopicMasteryScore(topicName)
    if (score >= 100) return 'mastered'
    if (score > 0) return 'learning'
    return 'not_started'
  }

  const getMasteryColor = (score) => {
    if (score >= 100) return 'var(--ctw-success, #00D4AA)'
    if (score >= 70) return '#8B5CF6'
    if (score >= 40) return '#3B82F6'
    if (score > 0) return 'var(--ctw-text-tertiary, #9CA3AF)'
    return 'var(--ctw-text-tertiary, #9CA3AF)'
  }

  const getTopicAccuracy = (topicName) => {
    if (!knowledgeStats?.domains || !currentDomainMeta) return null
    const domainStat = knowledgeStats.domains.find((d) => d.domain === currentDomainMeta.name)
    if (!domainStat) return null
    const topicStat = domainStat.topics?.find((t) => t.knowledge_point === topicName)
    if (!topicStat) return null
    return topicStat
  }

  const handleDomainChange = (domainId) => {
    setSelectedDomain(domainId)
    setSelectedTopic(null)
  }

  const handleTopicChange = (topicId) => {
    setSelectedTopic(topicId)
  }

  const handleGenerate = async () => {
    if (!selectedDomain || !selectedTopic || !questionType) {
      message.warning(t('quiz.topicRequired'))
      return
    }
    setGenerating(true)
    setQuestion(null)
    setResult(null)
    setResultAnimState('hidden')
    setUserAnswer('')
    setIsVariant(false)
    const currentType = questionType
    setActiveQuestionType(currentType)
    try {
      const res = await generateByKnowledge(selectedDomain, selectedTopic, currentType, difficulty)
      setQuestion(res.data)
      markApiUsed()
      questionCountRef.current += 1
      fetchWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || t('quiz.generateFailed'))
    } finally {
      setGenerating(false)
    }
  }

  const showMilestoneNotification = (milestone) => {
    const nextDifficulty = milestone === 40 ? '中等' : '困难'
    const tipKey = milestone === 40 ? 'quiz.milestoneTip40' : 'quiz.milestoneTip70'
    notification.info({
      message: `${question?.knowledge_point || ''} ${t(tipKey)}`,
      description: t('quiz.masteryCapReached'),
      btn: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setDifficulty(nextDifficulty)
            notification.destroy()
          }}
        >
          {t('quiz.increaseDifficulty')} → {t(`quiz.difficulty.${nextDifficulty}`)}
        </Button>
      ),
      duration: 6,
      placement: 'topRight',
    })
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
        topic: currentDomainMeta?.name || '',
        user_answer: userAnswer,
        difficulty,
      })
      setResult(res.data)
      setResultAnimState('entering')
      setTimeout(() => setResultAnimState('visible'), 50)
      if (res.data.milestone_reached) {
        showMilestoneNotification(res.data.milestone_reached)
      }
      loadStats()
      loadKnowledgeStats()
      checkAndNotify()
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
        topic: currentDomainMeta?.name || '',
        explanation: question.explanation,
        difficulty,
      })
      setResult(res.data)
      setResultAnimState('entering')
      setTimeout(() => setResultAnimState('visible'), 50)
      loadStats()
      loadKnowledgeStats()
      checkAndNotify()
    } catch (err) {
      message.error(t('quiz.judgeFailed'))
    } finally {
      setJudging(false)
    }
  }

  const handleNext = () => {
    handleGenerate()
  }

  const handleVariant = async (isCorrect) => {
    if (!question) return
    setVariantGenerating(true)
    try {
      const res = await generateVariant({
        question: question.question,
        question_type: activeQuestionType,
        knowledge_point: question.knowledge_point,
        user_answer: userAnswer || '',
        is_correct: isCorrect,
      })
      setQuestion(res.data)
      setResult(null)
      setResultAnimState('hidden')
      setUserAnswer('')
      setIsVariant(true)
      markApiUsed()
      questionCountRef.current += 1
      fetchWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || t('quiz.variantFailed'))
    } finally {
      setVariantGenerating(false)
    }
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

  // Loading guard
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

  // Feature unavailable
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

  const statusColors = {
    mastered: 'var(--ctw-success, #00D4AA)',
    learning: 'var(--ctw-warning, #F59E0B)',
    not_started: 'var(--ctw-text-tertiary, #9CA3AF)',
  }

  // Build domain Select options with OptGroup
  const domainOptions = [
    {
      label: t('quiz.generalDomains'),
      options: generalDomains.map((d) => ({ label: d.name, value: d.id })),
    },
    {
      label: t('quiz.languageDomains'),
      options: languageDomains.map((d) => ({ label: d.name, value: d.id })),
    },
  ]

  // Build knowledge point Select options with mastery indicator
  const topicOptions = currentDomainMeta?.topics?.map((tp) => {
    const score = getTopicMasteryScore(tp.name)
    const color = getMasteryColor(score)
    return {
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%' }}>
          <span style={{ flex: 1 }}>{tp.name}</span>
          {score > 0 && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color, fontWeight: 600, flexShrink: 0 }}>
              {score}%
            </span>
          )}
        </span>
      ),
      value: tp.id,
    }
  }) || []

  const canGenerate = selectedDomain && selectedTopic && questionType

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

            {/* Controls: Select dropdowns in one row */}
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <Select
                style={{ width: 180 }}
                placeholder={t('quiz.selectDomain')}
                value={selectedDomain}
                onChange={handleDomainChange}
                options={domainOptions}
                showSearch
                optionFilterProp="label"
              />
              <Select
                style={{ width: 180 }}
                placeholder={t('quiz.selectKnowledge')}
                value={selectedTopic}
                onChange={handleTopicChange}
                options={topicOptions}
                disabled={!selectedDomain}
                showSearch
                optionFilterProp="label"
                optionRender={(option) => option.data.label}
                popupMatchSelectWidth={false}
              />
              <Select
                style={{ width: 100 }}
                placeholder={t('quiz.selectDifficulty')}
                value={difficulty}
                onChange={setDifficulty}
                options={DIFFICULTIES.map((d) => ({ label: t(`quiz.difficulty.${d}`), value: d }))}
              />
              <Select
                style={{ width: 120 }}
                placeholder={t('quiz.selectType')}
                value={questionType}
                onChange={setQuestionType}
                options={QUESTION_TYPES.map((tp) => ({ label: t(`quiz.types.${tp}`), value: tp }))}
              />
              <Button
                type="primary"
                onClick={handleGenerate}
                loading={generating}
                disabled={!canGenerate}
              >
                {question ? t('quiz.change') : t('quiz.start')}
              </Button>
            </div>

            {/* Knowledge point info bar */}
            {currentTopicMeta && !question && !generating && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--ctw-surface-default, rgba(0,102,255,0.03))',
                  border: '1px solid var(--ctw-border-default)',
                  marginBottom: 16,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-secondary)' }}>
                  {currentTopicMeta.description}
                </span>
                <span style={{ margin: '0 8px', color: 'var(--ctw-border-default)' }}>|</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)' }}>
                  {currentTopicMeta.typical_approach}
                </span>
              </div>
            )}

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
                <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                  <Tag color="cyan">{t(`quiz.types.${activeQuestionType}`)}</Tag>
                  {isVariant && <Tag color="purple">{t('quiz.variantTag')}</Tag>}
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
                  <div className="flex items-center gap-3">
                    <Button
                      type="primary"
                      onClick={handleSubmit}
                      loading={judging}
                      disabled={!userAnswer.trim()}
                      style={{ minWidth: 120 }}
                    >
                      {t('quiz.submit')}
                    </Button>
                    <button
                      onClick={handleSkip}
                      disabled={judging}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: 'var(--ctw-text-tertiary)',
                        cursor: judging ? 'default' : 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                        padding: 0,
                        opacity: judging ? 0.5 : 1,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { if (!judging) e.currentTarget.style.color = 'var(--ctw-text-secondary)' }}
                      onMouseLeave={(e) => { if (!judging) e.currentTarget.style.color = 'var(--ctw-text-tertiary)' }}
                    >
                      {t('quiz.skip')}
                    </button>
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

                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                        {t('quiz.explanation')}
                      </span>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', whiteSpace: 'pre-wrap', margin: '4px 0 0', lineHeight: 1.7 }}>
                        {result.explanation}
                      </p>
                    </div>

                    {/* Mastery delta */}
                    {result.mastery_score != null && (
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                          {t('quiz.mastery')}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: getMasteryColor(result.mastery_score), fontWeight: 600 }}>
                          {result.mastery_score}%
                        </span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                          color: result.mastery_delta > 0 ? 'var(--ctw-success)' : result.mastery_delta < 0 ? 'var(--ctw-error)' : 'var(--ctw-text-tertiary)',
                          fontWeight: 600,
                        }}>
                          {result.mastery_delta > 0 ? `+${result.mastery_delta}` : result.mastery_delta === 0 ? `+0 ${t('quiz.masteryCapReached')}` : result.mastery_delta}
                        </span>
                      </div>
                    )}

                    {/* Result action: 答对出新题，答错举一反三 */}
                    <div className="flex items-center gap-3">
                      <Button
                        type="primary"
                        onClick={result.is_correct ? handleNext : () => handleVariant(false)}
                        loading={result.is_correct ? generating : variantGenerating}
                      >
                        {t('quiz.next')}
                      </Button>
                    </div>
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

                {/* Knowledge point mastery for current domain */}
                {selectedDomain && currentDomainMeta && (
                  <div>
                    <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 10px' }}>
                      {t('quiz.domainStats')}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentDomainMeta.topics.map((tp) => {
                        const score = getTopicMasteryScore(tp.name)
                        const barColor = getMasteryColor(score)
                        return (
                          <div key={tp.id}>
                            <div className="flex justify-between items-center" style={{ marginBottom: 3 }}>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--ctw-text-secondary)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tp.name}
                              </span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: barColor, fontWeight: 600 }}>
                                {score > 0 ? `${score}%` : '-'}
                              </span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'var(--ctw-border-default)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: score > 0 ? `${Math.max(score, 3)}%` : '0%',
                                  background: barColor,
                                  borderRadius: 2,
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Fallback: global mastered/weak when no domain selected */}
                {!selectedDomain && (
                  <>
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
                  </>
                )}

                {/* View Weak Points button */}
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={handleOpenWeakness}
                    className="flex items-center justify-center gap-1.5"
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      color: '#0066FF',
                      background: 'rgba(0,102,255,0.06)',
                      border: '1px solid rgba(0,102,255,0.15)',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <EyeOutlined style={{ fontSize: 13 }} />
                    {t('quiz.viewWeaknesses')}
                  </button>
                </div>

                {stats.total === 0 && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)', margin: '12px 0 0' }}>
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

      {/* Weakness Drawer */}
      <Drawer
        title={t('quiz.weaknessTitle')}
        open={weaknessOpen}
        onClose={() => setWeaknessOpen(false)}
        width={400}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {weaknessLoading ? (
          <div className="flex items-center justify-center" style={{ padding: 40 }}>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#0066FF', animation: `loading-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        ) : weaknessList.length === 0 ? (
          <div className="text-center" style={{ padding: '40px 0', color: 'var(--ctw-text-tertiary)' }}>
            <p style={{ fontSize: 14 }}>{t('quiz.noWeakness')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weaknessList.map((w) => (
              <div
                key={w.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--ctw-border-default)',
                  background: 'var(--ctw-surface-card)',
                  opacity: w.status === 'mastered' ? 0.5 : 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--ctw-text-primary)',
                      textDecoration: w.status === 'mastered' ? 'line-through' : 'none',
                    }}
                  >
                    {w.knowledge_point}
                  </span>
                  {w.status === 'mastered' ? (
                    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,212,170,0.1)', color: 'var(--ctw-success)' }}>
                      {t('quiz.weaknessMastered')}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: w.source === 'interview' ? 'rgba(0,102,255,0.08)' : 'rgba(250,140,22,0.08)',
                        color: w.source === 'interview' ? '#0066FF' : 'var(--ctw-warning)',
                      }}
                    >
                      {w.source === 'interview' ? t('quiz.weaknessFromInterview') : t('quiz.weaknessFromQuiz')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

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
