import { useState, useEffect } from 'react'
import { message, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import MatchCard from '../components/MatchCard'
import { triggerMatch, getResults, analyzeJD } from '../api/matching'
import useFeatureGuard from '../hooks/useFeatureGuard'
import useThemeStore from '../store/useThemeStore'
import { useTranslation } from '../i18n'
import FadeIn from '../components/motion/FadeIn'
import StaggerContainer, { StaggerItem } from '../components/motion/StaggerContainer'

function LoadingCursor({ title, subtitle }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      style={{ minHeight: 400 }}
    >
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
      {title && (
        <div className="text-center mt-2">
          <h2
            style={{
              fontFamily: "'Sora', 'DM Sans', sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: 0,
              marginBottom: 4,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
                color: 'var(--ctw-text-secondary)',
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      style={{ minHeight: 300 }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        style={{ color: 'var(--ctw-text-tertiary)' }}
      >
        <rect
          x="4"
          y="8"
          width="40"
          height="32"
          rx="4"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <line
          x1="4"
          y1="18"
          x2="44"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="13" r="2" fill="currentColor" />
        <circle cx="20" cy="13" r="2" fill="currentColor" />
        <line
          x1="14"
          y1="26"
          x2="34"
          y2="26"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="18"
          y1="32"
          x2="30"
          y2="32"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          fontSize: 14,
          color: 'var(--ctw-text-tertiary)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {text}
      </span>
    </div>
  )
}

export default function MatchingPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rematching, setRematching] = useState(false)
  const [jdText, setJdText] = useState('')
  const [jdAnalyzing, setJdAnalyzing] = useState(false)
  const [jdResult, setJdResult] = useState(null)
  const [jdExpanded, setJdExpanded] = useState(false)
  const navigate = useNavigate()
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("matching")
  const { markApiUsed } = useThemeStore()
  const { t } = useTranslation()

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const cached = await getResults()
        if (!ignore && cached.data.results && cached.data.results.length > 0) {
          setResults(cached.data.results)
          setLoading(false)
          return
        }
      } catch {}

      if (ignore) return
      try {
        const res = await triggerMatch()
        if (!ignore) {
          setResults(res.data.results)
          markApiUsed()
        }
      } catch (err) {
        if (!ignore) message.error(err.response?.data?.detail || t('matching.matchFailed'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const handleInterview = (jobId) => {
    navigate(`/interview?job_id=${jobId}`)
  }

  const handleRematch = async () => {
    setRematching(true)
    try {
      const res = await triggerMatch()
      setResults(res.data.results)
      markApiUsed()
      message.success(t('matching.rematchSuccess'))
    } catch (err) {
      message.error(err.response?.data?.detail || t('matching.matchFailed'))
    } finally {
      setRematching(false)
    }
  }

  const handleAnalyzeJD = async () => {
    if (!jdText.trim()) return
    setJdAnalyzing(true)
    try {
      const res = await analyzeJD(jdText.trim())
      setJdResult(res.data)
      markApiUsed()
    } catch (err) {
      message.error(err.response?.data?.detail || t('matching.jdAnalyzeFailed'))
    } finally {
      setJdAnalyzing(false)
    }
  }

  const handleJdInterview = () => {
    navigate('/interview', { state: { jd_context: jdResult } })
  }

  if (guardLoading) {
    return <LoadingCursor />
  }

  if (available === false) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ minHeight: 400 }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          style={{ color: 'var(--ctw-warning)' }}
        >
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="24" y1="14" x2="24" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="34" r="1.5" fill="currentColor" />
        </svg>
        <h2
          style={{
            fontFamily: "'Sora', 'DM Sans', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ctw-text-primary)',
            margin: 0,
          }}
        >
          {t('guard.featureUnavailable')}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--ctw-text-secondary)',
            margin: 0,
          }}
        >
          {t('guard.featureUnavailableDesc')}
        </p>
        <Button type="primary" onClick={() => navigate('/settings')}>
          {t('common.goSettings')}
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <LoadingCursor
        title={t('matching.analyzing')}
        subtitle={t('matching.analyzingSubtitle')}
      />
    )
  }

  if (!results || results.length === 0) {
    return <EmptyState text={t('matching.noResults')} />
  }

  const normal = results.filter((r) => !r.is_beyond_cognition)
  const beyond = results.filter((r) => r.is_beyond_cognition)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      <FadeIn>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: 0,
                marginBottom: 4,
              }}
            >
              {t('matching.title')}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--ctw-text-secondary)',
                margin: 0,
              }}
            >
              {t('matching.subtitle')}
            </p>
          </div>
          <button
            onClick={handleRematch}
            disabled={rematching}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              color: 'var(--ctw-text-primary)',
              background: 'transparent',
              border: '1.5px solid var(--ctw-text-tertiary)',
              borderRadius: 8,
              cursor: rematching ? 'not-allowed' : 'pointer',
              opacity: rematching ? 0.6 : 1,
              transition: 'border-color 200ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => !rematching && (e.currentTarget.style.borderColor = '#0066FF')}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ctw-text-tertiary)'}
          >
            {rematching ? t('common.loading') : t('matching.rematch')}
          </button>
        </div>
      </FadeIn>

      {/* JD Analysis Section */}
      <FadeIn delay={0.05}>
        <div
          style={{
            marginBottom: 32,
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            background: 'var(--ctw-surface-card)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setJdExpanded(!jdExpanded)}
            className="flex items-center justify-between w-full"
            style={{
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ctw-text-primary)',
            }}
          >
            <span
              className="font-display"
              style={{ fontSize: 15, fontWeight: 600 }}
            >
              {t('matching.jdSection')}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--ctw-text-tertiary)',
                transition: 'transform 200ms',
                transform: jdExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>

          {jdExpanded && (
            <div style={{ padding: '0 20px 20px' }}>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder={t('matching.jdPlaceholder')}
                className="font-body"
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: 12,
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: '1px solid var(--ctw-border-default)',
                  borderRadius: 8,
                  background: 'var(--ctw-surface-input)',
                  color: 'var(--ctw-text-primary)',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div className="flex justify-end" style={{ marginTop: 12 }}>
                <button
                  onClick={handleAnalyzeJD}
                  disabled={!jdText.trim() || jdAnalyzing}
                  className="font-body"
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#fff',
                    background: !jdText.trim() || jdAnalyzing ? 'var(--ctw-text-disabled)' : 'var(--ctw-text-primary)',
                    border: 'none',
                    borderRadius: 8,
                    cursor: !jdText.trim() || jdAnalyzing ? 'not-allowed' : 'pointer',
                    transition: 'background 200ms',
                  }}
                >
                  {jdAnalyzing ? t('matching.analyzingJD') : t('matching.analyzeJD')}
                </button>
              </div>

              {jdResult && (
                <div style={{ marginTop: 20 }}>
                  <h3
                    className="font-display"
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--ctw-text-primary)',
                      marginBottom: 16,
                    }}
                  >
                    {jdResult.title}
                  </h3>

                  {jdResult.tech_stack?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', display: 'block', marginBottom: 6 }}>
                        {t('matching.jdTechStack')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {jdResult.tech_stack.map((s, i) => (
                          <span
                            key={i}
                            className="font-mono"
                            style={{
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(0, 102, 255, 0.08)',
                              color: 'var(--ctw-brand)',
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {jdResult.key_points?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', display: 'block', marginBottom: 6 }}>
                        {t('matching.jdKeyPoints')}
                      </span>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {jdResult.key_points.map((s, i) => (
                          <li key={i} className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-secondary)', lineHeight: 1.8 }}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {jdResult.requirements?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', display: 'block', marginBottom: 6 }}>
                        {t('matching.jdRequirements')}
                      </span>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {jdResult.requirements.map((s, i) => (
                          <li key={i} className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-secondary)', lineHeight: 1.8 }}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {jdResult.bonus?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', display: 'block', marginBottom: 6 }}>
                        {t('matching.jdBonus')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {jdResult.bonus.map((s, i) => (
                          <span
                            key={i}
                            className="font-body"
                            style={{
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 4,
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

                  {jdResult.responsibilities && (
                    <div style={{ marginBottom: 14 }}>
                      <span className="font-body" style={{ fontSize: 12, color: 'var(--ctw-text-tertiary)', display: 'block', marginBottom: 6 }}>
                        {t('matching.jdResponsibilities')}
                      </span>
                      <p className="font-body" style={{ fontSize: 13, color: 'var(--ctw-text-secondary)', lineHeight: 1.7, margin: 0 }}>
                        {jdResult.responsibilities}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleJdInterview}
                    className="font-body w-full"
                    style={{
                      marginTop: 8,
                      padding: '10px 0',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#fff',
                      background: 'var(--ctw-text-primary)',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'opacity 200ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    {t('matching.jdInterview')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Recommended section */}
      {normal.length > 0 && (
        <FadeIn delay={0.1}>
          <h2
            className="mb-4"
            style={{
              fontFamily: "'Sora', 'DM Sans', sans-serif",
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: 0,
              marginBottom: 16,
            }}
          >
            {t('matching.recommended')}
          </h2>
          <StaggerContainer
            staggerDelay={0.08}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {normal.map((m) => (
              <StaggerItem key={m.job_id}>
                <MatchCard match={m} onInterview={handleInterview} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>
      )}

      {/* Divider + Beyond section */}
      {beyond.length > 0 && (
        <FadeIn delay={0.3}>
          <div
            className="my-16"
            style={{
              height: 1,
              backgroundColor: 'var(--ctw-border-default)',
            }}
          />

          <div className="flex items-center gap-3 mb-4">
            <h2
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: 0,
              }}
            >
              {t('matching.beyond')}
            </h2>
            <span
              className="px-2 py-0.5 rounded"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 500,
                color: '#00D4AA',
                border: '1px solid #00D4AA',
                letterSpacing: '0.05em',
                lineHeight: '16px',
              }}
            >
              {t('matching.discovery')}
            </span>
          </div>
          <p
            className="mb-4"
            style={{
              fontSize: 14,
              color: 'var(--ctw-text-secondary)',
              margin: 0,
              marginBottom: 16,
            }}
          >
            {t('matching.beyondSubtitle')}
          </p>

          <StaggerContainer
            staggerDelay={0.08}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {beyond.map((m) => (
              <StaggerItem key={m.job_id}>
                <MatchCard match={m} onInterview={handleInterview} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>
      )}
    </div>
  )
}
