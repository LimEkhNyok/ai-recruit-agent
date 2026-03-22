import { useState, useEffect } from 'react'
import { Drawer, message, Popconfirm, Skeleton } from 'antd'
import {
  DeleteOutlined,
  RedoOutlined,
  FileTextOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  TagOutlined,
} from '@ant-design/icons'
import { getHistory, getInterviewDetail, deleteInterview } from '../api/interview'

const dimKeys = {
  professional_skill: 'professionalSkill',
  communication: 'communication',
  problem_solving: 'problemSolving',
  culture_fit: 'cultureFit',
  growth_potential: 'growthPotential',
}

function EvaluationDetail({ evaluation, jobTitle, t }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showBars, setShowBars] = useState(false)

  useEffect(() => {
    if (!evaluation) return
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
  }, [evaluation])

  if (!evaluation) return null
  const dims = evaluation.dimensions || {}

  return (
    <div>
      {/* Recommendation badge */}
      <div className="text-center" style={{ marginBottom: 16 }}>
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
      <div className="text-center" style={{ marginBottom: 24 }}>
        <span
          className="font-mono"
          style={{
            fontSize: 56,
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
        <p className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', marginTop: 4 }}>
          {t('interview.report.overallScore')}
        </p>
      </div>

      {/* Dimension bars */}
      <div style={{ marginBottom: 20 }}>
        <h4 className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 12 }}>
          {t('interview.report.dimensions')}
        </h4>
        {Object.entries(dims).map(([key, dim]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-secondary)' }}>
                {t(`interview.report.${dimKeys[key]}`, key)}
              </span>
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--ctw-text-primary)' }}>
                {dim.score}
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--ctw-border-default)', overflow: 'hidden' }}>
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
          </div>
        ))}
      </div>

      {/* Strengths */}
      {evaluation.strengths?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 8 }}>
            {t('interview.report.strengths')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.strengths.map((s, i) => (
              <span key={i} className="font-body" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(0,212,170,0.08)', color: 'var(--ctw-success)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {evaluation.weaknesses?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 8 }}>
            {t('interview.report.weaknesses')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.weaknesses.map((s, i) => (
              <span key={i} className="font-body" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(250,140,22,0.08)', color: 'var(--ctw-warning)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {evaluation.improvement_suggestions?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', marginBottom: 8 }}>
            {t('interview.report.suggestions')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {evaluation.improvement_suggestions.map((s, i) => (
              <div key={i} className="font-body" style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ctw-text-secondary)', paddingLeft: 12, borderLeft: '2px solid #0066FF' }}>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall comment */}
      {evaluation.overall_comment && (
        <p className="font-body" style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ctw-text-secondary)' }}>
          {evaluation.overall_comment}
        </p>
      )}
    </div>
  )
}

function InterviewReviewView({ chatHistory, t }) {
  if (!chatHistory || chatHistory.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {chatHistory.map((msg, i) => {
        const isUser = msg.role === 'user'
        const text = msg.parts?.[0]?.text || ''
        const review = msg.review

        return (
          <div key={i}>
            {/* Chat bubble */}
            <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
              {!isUser && (
                <div
                  className="shrink-0 flex items-center justify-center rounded-full font-mono"
                  style={{ width: 24, height: 24, background: '#0066FF', color: '#fff', fontSize: 10, fontWeight: 600, marginTop: 2 }}
                >
                  AI
                </div>
              )}
              <div
                className="font-body whitespace-pre-wrap"
                style={{
                  maxWidth: '80%',
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: 'var(--ctw-text-primary)',
                  ...(isUser
                    ? { background: 'var(--ctw-surface-hover, rgba(0,0,0,0.04))', borderRadius: '14px 14px 4px 14px', padding: '8px 14px' }
                    : {}),
                }}
              >
                {text}
              </div>
            </div>

            {/* Review annotation for user messages */}
            {isUser && review && (
              <div
                style={{
                  marginTop: 8,
                  marginRight: 8,
                  marginLeft: 'auto',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--ctw-surface-hover, rgba(0,102,255,0.04))',
                  border: '1px solid var(--ctw-border-default)',
                }}
              >
                {/* Summary */}
                {review.summary && (
                  <p className="font-body" style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ctw-text-secondary)', margin: 0 }}>
                    <MessageOutlined style={{ fontSize: 11, marginRight: 6, color: '#0066FF' }} />
                    {review.summary}
                  </p>
                )}

                {/* Suggestions (deep mode) */}
                {review.depth === 'deep' && review.suggestions?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ctw-text-tertiary)' }}>
                      {t('interview.reviewSuggestions')}
                    </span>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                      {review.suggestions.map((s, j) => (
                        <li key={j} className="font-body" style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--ctw-text-secondary)' }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Knowledge tags (deep mode) */}
                {review.depth === 'deep' && (
                  <div className="flex flex-wrap gap-1" style={{ marginTop: 8 }}>
                    {review.related_knowledge?.map((k, j) => (
                      <span key={`r-${j}`} className="font-body" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,212,170,0.1)', color: 'var(--ctw-success)' }}>
                        {k}
                      </span>
                    ))}
                    {review.missing_knowledge?.map((k, j) => (
                      <span key={`m-${j}`} className="font-body" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(250,140,22,0.1)', color: 'var(--ctw-warning)' }}>
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function InterviewHistoryDrawer({ open, onClose, onReinterview, t }) {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // list | evaluation | review
  const [selectedItem, setSelectedItem] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadHistory()
      setView('list')
      setSelectedItem(null)
    }
  }, [open])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await getHistory()
      setHistoryList(res.data.interviews || [])
    } catch {
      message.error(t('interview.deleteFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteInterview(id)
      message.success(t('interview.deleteSuccess'))
      setHistoryList((prev) => prev.filter((item) => item.id !== id))
    } catch {
      message.error(t('interview.deleteFailed'))
    }
  }

  const handleViewResult = (item) => {
    setSelectedItem(item)
    setView('evaluation')
  }

  const handleViewReview = async (item) => {
    setSelectedItem(item)
    setDetailLoading(true)
    setView('review')
    try {
      const res = await getInterviewDetail(item.id)
      setDetailData(res.data)
    } catch {
      message.error(t('interview.chatFailed'))
    } finally {
      setDetailLoading(false)
    }
  }

  const handleReinterview = (item) => {
    onClose()
    onReinterview(item)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const renderTitle = () => {
    if (view === 'evaluation') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ctw-text-secondary)', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeftOutlined style={{ fontSize: 14 }} />
          </button>
          <span>{selectedItem?.job_title} - {t('interview.report.title')}</span>
        </div>
      )
    }
    if (view === 'review') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ctw-text-secondary)', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeftOutlined style={{ fontSize: 14 }} />
          </button>
          <span>{t('interview.reviewTitle')}</span>
        </div>
      )
    }
    return t('interview.historyTitle')
  }

  return (
    <Drawer
      title={renderTitle()}
      open={open}
      onClose={onClose}
      width={480}
      styles={{ body: { padding: '16px 24px' } }}
    >
      {view === 'list' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} active paragraph={{ rows: 2 }} />
              ))}
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center" style={{ padding: '60px 0', color: 'var(--ctw-text-tertiary)' }}>
              <p className="font-body" style={{ fontSize: 14, marginBottom: 16 }}>{t('interview.noHistory')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--ctw-border-default)',
                    background: 'var(--ctw-surface-card)',
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="flex items-center gap-2">
                      <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                        {item.job_title || 'Unknown'}
                      </span>
                      {item.interview_type === 'custom_jd' && (
                        <span className="font-body" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,102,255,0.08)', color: '#0066FF' }}>
                          {t('interview.customJd')}
                        </span>
                      )}
                    </div>
                    {item.evaluation?.overall_score != null && (
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: '#0066FF' }}>
                        {item.evaluation.overall_score}{t('interview.score')}
                      </span>
                    )}
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                    <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)' }}>
                      {formatDate(item.created_at)}
                    </span>
                    <span className="flex items-center gap-1 font-body" style={{ fontSize: 12 }}>
                      {item.status === 'completed' ? (
                        <>
                          <CheckCircleFilled style={{ fontSize: 11, color: 'var(--ctw-success)' }} />
                          <span style={{ color: 'var(--ctw-success)' }}>{t('interview.completed')}</span>
                        </>
                      ) : (
                        <>
                          <ClockCircleFilled style={{ fontSize: 11, color: 'var(--ctw-warning)' }} />
                          <span style={{ color: 'var(--ctw-warning)' }}>{t('interview.inProgress')}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.status === 'completed' && item.evaluation && (
                      <button
                        onClick={() => handleViewResult(item)}
                        className="flex items-center gap-1 font-body"
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--ctw-border-default)',
                          background: 'transparent',
                          color: 'var(--ctw-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <FileTextOutlined style={{ fontSize: 11 }} />
                        {t('interview.viewResult')}
                      </button>
                    )}
                    {item.status === 'completed' && (
                      <button
                        onClick={() => handleViewReview(item)}
                        className="flex items-center gap-1 font-body"
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--ctw-border-default)',
                          background: 'transparent',
                          color: 'var(--ctw-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <MessageOutlined style={{ fontSize: 11 }} />
                        {t('interview.viewReview')}
                      </button>
                    )}
                    <button
                      onClick={() => handleReinterview(item)}
                      className="flex items-center gap-1 font-body"
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--ctw-border-default)',
                        background: 'transparent',
                        color: '#0066FF',
                        cursor: 'pointer',
                      }}
                    >
                      <RedoOutlined style={{ fontSize: 11 }} />
                      {t('interview.reinterview')}
                    </button>
                    <Popconfirm
                      title={t('interview.deleteConfirm')}
                      onConfirm={() => handleDelete(item.id)}
                      okText={t('common.confirm')}
                      cancelText={t('common.cancel')}
                    >
                      <button
                        className="flex items-center gap-1 font-body"
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--ctw-border-default)',
                          background: 'transparent',
                          color: 'var(--ctw-error)',
                          cursor: 'pointer',
                        }}
                      >
                        <DeleteOutlined style={{ fontSize: 11 }} />
                        {t('common.delete')}
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'evaluation' && selectedItem && (
        <EvaluationDetail evaluation={selectedItem.evaluation} jobTitle={selectedItem.job_title} t={t} />
      )}

      {view === 'review' && (
        detailLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detailData ? (
          <InterviewReviewView chatHistory={detailData.chat_history} t={t} />
        ) : null
      )}
    </Drawer>
  )
}
