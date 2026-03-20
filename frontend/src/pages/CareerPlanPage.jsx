import { useState, useEffect } from 'react'
import { Button, message, Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { generatePlan, getPlan } from '../api/career'
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

const stageConfig = {
  short_term: { labelKey: 'shortTerm', color: '#0066FF' },
  mid_term: { labelKey: 'midTerm', color: '#0066FF' },
  long_term: { labelKey: 'longTerm', color: '#0066FF' },
}

const levelColors = {
  '初级': '#faad14',
  '中级': '#0066FF',
  '高级': '#00D4AA',
  '专家': '#7c3aed',
}

function TimelineNode({ stageKey, data, isLast, isCurrent, t, index }) {
  if (!data) return null

  const config = stageConfig[stageKey] || { labelKey: stageKey, color: '#0066FF' }

  return (
    <StaggerItem>
      <div className="relative flex" style={{ paddingLeft: 48, paddingBottom: isLast ? 0 : 32 }}>
        {/* Vertical line */}
        {!isLast && (
          <div
            className="absolute"
            style={{
              left: 19,
              top: 12,
              bottom: 0,
              width: 1,
              backgroundColor: 'var(--ctw-border-default)',
            }}
          />
        )}

        {/* Node circle */}
        <div
          className="absolute"
          style={{
            left: 16,
            top: 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: config.color,
            boxShadow: isCurrent
              ? `0 0 0 4px ${config.color}33, 0 0 12px ${config.color}44`
              : 'none',
          }}
        />

        <div className="flex-1 min-w-0">
          {/* Stage label */}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ctw-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t(`career.${config.labelKey}`)}
          </span>

          {/* Content block with border-left */}
          <div
            className="mt-2"
            style={{
              borderLeft: '2px solid #0066FF',
              paddingLeft: 16,
            }}
          >
            {data.title && (
              <h4
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--ctw-text-primary)',
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                {data.title}
              </h4>
            )}

            {data.goals && data.goals.length > 0 && (
              <div className="mb-3">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ctw-text-primary)',
                  }}
                >
                  {t('career.goals')}
                </span>
                <ul
                  className="mt-1 pl-4"
                  style={{
                    margin: 0,
                    marginTop: 4,
                    paddingLeft: 20,
                    listStyle: 'disc',
                  }}
                >
                  {data.goals.map((g, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 13,
                        lineHeight: 1.8,
                        color: 'var(--ctw-text-secondary)',
                      }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.actions && data.actions.length > 0 && (
              <div className="mb-3">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ctw-text-primary)',
                  }}
                >
                  {t('career.actions')}
                </span>
                <ul
                  className="mt-1 pl-4"
                  style={{
                    margin: 0,
                    marginTop: 4,
                    paddingLeft: 20,
                    listStyle: 'disc',
                  }}
                >
                  {data.actions.map((a, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 13,
                        lineHeight: 1.8,
                        color: 'var(--ctw-text-secondary)',
                      }}
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.milestones && data.milestones.length > 0 && (
              <div className="mb-3">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ctw-text-primary)',
                  }}
                >
                  {t('career.milestones')}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {data.milestones.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded"
                      style={{
                        fontSize: 12,
                        color: '#0066FF',
                        backgroundColor: 'rgba(0, 102, 255, 0.08)',
                        border: '1px solid rgba(0, 102, 255, 0.2)',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.vision && (
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--ctw-text-tertiary)',
                  margin: 0,
                }}
              >
                {data.vision}
              </p>
            )}
          </div>
        </div>
      </div>
    </StaggerItem>
  )
}

function SkillItem({ skill, t }) {
  const currentColor = levelColors[skill.current_level] || 'var(--ctw-text-tertiary)'
  const targetColor = levelColors[skill.target_level] || '#0066FF'

  return (
    <div
      className="py-4"
      style={{ borderBottom: '1px solid var(--ctw-border-default)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ctw-text-primary)',
          }}
        >
          {skill.skill}
        </span>
        {skill.timeline && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--ctw-text-tertiary)',
            }}
          >
            {skill.timeline}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-2 py-0.5 rounded text-xs"
          style={{
            color: currentColor,
            border: `1px solid ${currentColor}`,
          }}
        >
          {skill.current_level}
        </span>
        <span style={{ color: 'var(--ctw-text-tertiary)', fontSize: 12 }}>→</span>
        <span
          className="px-2 py-0.5 rounded text-xs"
          style={{
            color: targetColor,
            border: `1px solid ${targetColor}`,
          }}
        >
          {skill.target_level}
        </span>
      </div>

      {skill.resources && skill.resources.length > 0 && (
        <div>
          <span
            style={{
              fontSize: 12,
              color: 'var(--ctw-text-tertiary)',
            }}
          >
            {t('career.resources')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {skill.resources.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded"
                style={{
                  fontSize: 11,
                  color: 'var(--ctw-text-secondary)',
                  backgroundColor: 'var(--ctw-surface-base)',
                  border: '1px solid var(--ctw-border-default)',
                }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CareerPlanPage() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const navigate = useNavigate()
  const { loading: guardLoading, available, featureLabel } = useFeatureGuard("career")
  const { markApiUsed } = useThemeStore()
  const { t } = useTranslation()

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await getPlan()
        if (!ignore) setPlan(res.data)
      } catch {
        if (ignore) return
        if (!ignore) setGenerating(true)
        try {
          const res = await generatePlan()
          if (!ignore) {
            setPlan(res.data)
            markApiUsed()
          }
        } catch (err) {
          if (!ignore) message.error(err.response?.data?.detail || t('career.generateFailed'))
        } finally {
          if (!ignore) setGenerating(false)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await generatePlan()
      setPlan(res.data)
      markApiUsed()
      message.success(t('career.regenerateSuccess'))
    } catch (err) {
      message.error(err.response?.data?.detail || t('career.regenerateFailed'))
    } finally {
      setRegenerating(false)
    }
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

  if (loading || generating) {
    return (
      <LoadingCursor
        title={generating ? t('career.generating') : t('common.loading')}
        subtitle={t('career.generatingSubtitle')}
      />
    )
  }

  if (!plan) return null

  const pc = plan.plan_content || {}
  const skills = pc.skill_roadmap || []

  const stages = [
    { key: 'short_term', data: pc.short_term },
    { key: 'mid_term', data: pc.mid_term },
    { key: 'long_term', data: pc.long_term },
  ].filter((s) => s.data)

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--ctw-text-primary)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {t('career.title')}
            </h1>
            <p
              className="mt-1"
              style={{
                fontSize: 14,
                color: 'var(--ctw-text-secondary)',
                margin: 0,
                marginTop: 4,
              }}
            >
              {t('career.subtitle')}
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              color: 'var(--ctw-text-primary)',
              background: 'transparent',
              border: '1px solid var(--ctw-border-default)',
              borderRadius: 8,
              cursor: regenerating ? 'not-allowed' : 'pointer',
              opacity: regenerating ? 0.6 : 1,
              transition: 'border-color 200ms',
            }}
            onMouseEnter={(e) => !regenerating && (e.currentTarget.style.borderColor = '#0066FF')}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ctw-border-default)'}
          >
            {regenerating ? t('common.loading') : t('career.regenerate')}
          </button>
        </div>
      </FadeIn>

      {/* Career Direction */}
      {pc.career_direction && (
        <FadeIn delay={0.1}>
          <div
            className="mb-8 p-5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.06), rgba(0, 212, 170, 0.06))',
              border: '1px solid var(--ctw-border-default)',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: 'var(--ctw-text-tertiary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {t('career.direction')}
            </span>
            <h2
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ctw-text-primary)',
                margin: 0,
              }}
            >
              {pc.career_direction}
            </h2>
          </div>
        </FadeIn>
      )}

      {/* Development Roadmap / Timeline */}
      {stages.length > 0 && (
        <FadeIn delay={0.2}>
          <div
            className="mb-8 pb-6"
            style={{ borderBottom: '1px solid var(--ctw-border-default)' }}
          >
            <h3
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: 0,
                marginBottom: 24,
              }}
            >
              {t('career.roadmap')}
            </h3>

            <StaggerContainer staggerDelay={0.15}>
              {stages.map((stage, i) => (
                <TimelineNode
                  key={stage.key}
                  stageKey={stage.key}
                  data={stage.data}
                  isLast={i === stages.length - 1}
                  isCurrent={i === 0}
                  t={t}
                  index={i}
                />
              ))}
            </StaggerContainer>
          </div>
        </FadeIn>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <FadeIn delay={0.3}>
          <div
            className="mb-8 pb-2"
            style={{ borderBottom: '1px solid var(--ctw-border-default)' }}
          >
            <h3
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: 0,
                marginBottom: 8,
              }}
            >
              {t('career.skills')}
            </h3>

            <StaggerContainer staggerDelay={0.08}>
              {skills.map((s, i) => (
                <StaggerItem key={i}>
                  <SkillItem skill={s} t={t} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeIn>
      )}

      {/* Resume Advice */}
      {plan.resume_advice && (
        <FadeIn delay={0.4}>
          <div
            className="mb-8 pb-6"
            style={{ borderBottom: '1px solid var(--ctw-border-default)' }}
          >
            <h3
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: 0,
                marginBottom: 12,
              }}
            >
              {t('career.resumeAdvice')}
            </h3>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--ctw-text-secondary)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {plan.resume_advice}
            </p>
          </div>
        </FadeIn>
      )}

      {/* Overall Advice */}
      {pc.overall_advice && (
        <FadeIn delay={0.5}>
          <div className="pb-6">
            <h3
              style={{
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
                margin: 0,
                marginBottom: 12,
              }}
            >
              {t('career.overallAdvice')}
            </h3>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--ctw-text-secondary)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {pc.overall_advice}
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  )
}
