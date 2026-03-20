import { useState, useEffect } from 'react'
import { Tag, Button, Modal, message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import RadarChart from '../components/RadarChart'
import { getProfile } from '../api/assessment'
import { useTranslation } from '../i18n'
import FadeIn from '../components/motion/FadeIn'
import StaggerContainer, { StaggerItem } from '../components/motion/StaggerContainer'

const abilityI18nKeys = {
  logical_analysis: 'logicalAnalysis',
  communication: 'communication',
  creativity: 'creativity',
  execution: 'execution',
  leadership: 'leadership',
  teamwork: 'teamwork',
  learning: 'learning',
  stress_tolerance: 'stressTolerance',
}

const interestI18nKeys = {
  tech_development: 'techDevelopment',
  product_design: 'productDesign',
  data_analysis: 'dataAnalysis',
  marketing: 'marketing',
  project_management: 'projectManagement',
  content_creation: 'contentCreation',
  user_research: 'userResearch',
  business_operation: 'businessOperation',
}

const valueI18nKeys = {
  achievement: 'achievement',
  stability: 'stability',
  freedom: 'freedom',
  social_impact: 'socialImpact',
  growth: 'growth',
  work_life_balance: 'workLifeBalance',
}

const workStyleI18nKeys = {
  independent_vs_team: 'independentVsTeam',
  detail_vs_big_picture: 'detailVsBigPicture',
  planned_vs_flexible: 'plannedVsFlexible',
  fast_vs_steady: 'fastVsSteady',
}

function AnimatedBar({ label, value, delay = 0 }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="w-28 text-right shrink-0"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ctw-text-primary)',
        }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--ctw-border-default)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: '#0066FF' }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--ctw-text-primary)',
          width: 32,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function LoadingCursor() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: 400 }}
    >
      <motion.span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 24,
          color: 'var(--ctw-text-tertiary)',
        }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {'>_'}
      </motion.span>
    </div>
  )
}

function ScoreSection({ title, entries, i18nKeyMap, t, baseDelay = 0 }) {
  return (
    <div
      className="py-6"
      style={{ borderBottom: '1px solid var(--ctw-border-default)' }}
    >
      <h3
        className="mb-4"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--ctw-text-primary)',
          margin: 0,
          marginBottom: 16,
        }}
      >
        {title}
      </h3>
      <StaggerContainer staggerDelay={0.06}>
        {Object.entries(entries).map(([k, v], i) => (
          <StaggerItem key={k}>
            <AnimatedBar
              label={t(`profile.${i18nKeyMap[k]}`, k)}
              value={v}
              delay={baseDelay + i * 0.06}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getProfile()
        setProfile(res.data)
      } catch {
        message.info(t('profile.noProfile'))
        navigate('/assessment?force=1', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  const handleReassess = () => {
    Modal.confirm({
      title: t('profile.confirmReassess'),
      content: t('profile.confirmReassessDesc'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => navigate('/assessment?force=1'),
    })
  }

  if (loading) {
    return <LoadingCursor />
  }

  if (!profile) return null

  const { personality, abilities, interests, values, work_style, summary } = profile

  const abilityKeys = Object.keys(abilities)
  const abilityIndicators = abilityKeys.map(
    (k) => t(`profile.${abilityI18nKeys[k]}`, k)
  )
  const abilityValues = abilityKeys.map((k) => abilities[k])

  const createdDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : ''

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
              {t('profile.title')}
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
              {t('profile.subtitle')}
              {createdDate && (
                <span
                  className="ml-3"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: 'var(--ctw-text-tertiary)',
                  }}
                >
                  {createdDate}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button ghost onClick={handleReassess}>
              {t('profile.reassess')}
            </Button>
            <Button ghost onClick={() => navigate('/matching')}>
              {t('profile.startMatching')}
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Radar Chart */}
      <FadeIn delay={0.1}>
        <div className="flex justify-center mb-8">
          <RadarChart
            indicators={abilityIndicators}
            values={abilityValues}
            title={t('profile.abilities')}
          />
        </div>
      </FadeIn>

      {/* Summary + MBTI */}
      <FadeIn delay={0.2}>
        <div
          className="py-6"
          style={{ borderBottom: '1px solid var(--ctw-border-default)' }}
        >
          <h3
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: 0,
              marginBottom: 12,
            }}
          >
            {t('profile.summary')}
          </h3>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              color: 'var(--ctw-text-secondary)',
              margin: 0,
              marginBottom: 12,
            }}
          >
            {summary}
          </p>
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--ctw-text-primary)',
              }}
            >
              {t('profile.mbtiType')}
            </span>
            <Tag color="blue" style={{ fontSize: 14 }}>
              {personality?.mbti_type}
            </Tag>
          </div>
          {personality?.description && (
            <p
              className="mt-2"
              style={{
                fontSize: 13,
                color: 'var(--ctw-text-tertiary)',
                margin: 0,
                marginTop: 8,
              }}
            >
              {personality.description}
            </p>
          )}
        </div>
      </FadeIn>

      {/* Abilities */}
      <FadeIn delay={0.3}>
        <ScoreSection
          title={t('profile.abilities')}
          entries={abilities}
          i18nKeyMap={abilityI18nKeys}
          t={t}
          baseDelay={0}
        />
      </FadeIn>

      {/* Interests */}
      <FadeIn delay={0.4}>
        <ScoreSection
          title={t('profile.interests')}
          entries={interests}
          i18nKeyMap={interestI18nKeys}
          t={t}
          baseDelay={0}
        />
      </FadeIn>

      {/* Values */}
      <FadeIn delay={0.5}>
        <ScoreSection
          title={t('profile.values')}
          entries={values}
          i18nKeyMap={valueI18nKeys}
          t={t}
          baseDelay={0}
        />
      </FadeIn>

      {/* Work Style */}
      <FadeIn delay={0.6}>
        <div className="py-6">
          <h3
            className="mb-4"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: 0,
              marginBottom: 16,
            }}
          >
            {t('profile.workStyle')}
          </h3>
          <StaggerContainer staggerDelay={0.06}>
            {Object.entries(work_style).map(([k, v]) => (
              <StaggerItem key={k}>
                <AnimatedBar
                  label={t(`profile.${workStyleI18nKeys[k]}`, k)}
                  value={v}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>
    </div>
  )
}
