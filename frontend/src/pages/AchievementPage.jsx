import { useState, useEffect } from 'react'
import { Spin } from 'antd'
import { getAchievements } from '../api/achievement'
import { useTranslation } from '../i18n'

const RARITY_COLORS = {
  common: 'var(--ctw-text-tertiary, #9CA3AF)',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
}

const RARITY_BG = {
  common: 'rgba(156,163,175,0.06)',
  rare: 'rgba(59,130,246,0.06)',
  epic: 'rgba(139,92,246,0.06)',
  legendary: 'rgba(245,158,11,0.06)',
}

export default function AchievementPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t, language } = useTranslation()

  useEffect(() => {
    loadAchievements()
  }, [language])

  const loadAchievements = async () => {
    try {
      const res = await getAchievements()
      setData(res.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <Spin />
      </div>
    )
  }

  if (!data) return null

  // Group by category
  const grouped = {}
  for (const ach of data.achievements) {
    const cat = ach.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ach)
  }

  const progressPercent = data.total > 0 ? Math.round((data.unlocked / data.total) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div style={{
        border: '1px solid var(--ctw-border-default)',
        borderRadius: 12,
        padding: 24,
        background: 'var(--ctw-surface-card)',
        marginBottom: 24,
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ctw-text-primary)',
            margin: 0,
          }}>
            {t('achievement.title')}
          </h2>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: 'var(--ctw-text-secondary)',
          }}>
            {data.unlocked} / {data.total}
          </span>
        </div>
        <div style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--ctw-border-default)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #0066FF, #00D4AA)',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Achievement groups */}
      {Object.entries(grouped).map(([category, achievements]) => (
        <div key={category} style={{ marginBottom: 28 }}>
          <h3 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ctw-text-primary)',
            margin: '0 0 14px',
            paddingBottom: 8,
            borderBottom: '1px solid var(--ctw-border-default)',
          }}>
            {category}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {achievements.map((ach) => (
              <AchievementCard key={ach.id} achievement={ach} t={t} language={language} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDate(dateStr, language) {
  const d = new Date(dateStr)
  if (language === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('zh-CN')
}

function AchievementCard({ achievement: ach, t, language }) {
  const borderColor = RARITY_COLORS[ach.rarity] || RARITY_COLORS.common
  const bgColor = ach.unlocked ? RARITY_BG[ach.rarity] || RARITY_BG.common : 'var(--ctw-surface-card)'
  const isHidden = ach.category_id === 'hidden'

  const progress = ach.progress
  const hasProgress = !isHidden && progress && progress.current > 0 && !ach.unlocked

  return (
    <div style={{
      border: `1px solid ${ach.unlocked ? borderColor : 'var(--ctw-border-default)'}`,
      borderRadius: 10,
      padding: 16,
      background: bgColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 8,
      opacity: ach.unlocked ? 1 : 0.7,
      transition: 'all 0.2s',
      position: 'relative',
    }}>
      {/* Counter badge for counter-type achievements */}
      {ach.counter_value != null && ach.counter_value > 0 && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: borderColor,
          background: ach.unlocked ? 'rgba(255,255,255,0.8)' : 'var(--ctw-surface-default)',
          padding: '1px 6px',
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
        }}>
          x{ach.counter_value}
        </span>
      )}

      {/* Icon */}
      <span style={{ fontSize: 32, lineHeight: 1 }}>
        {ach.unlocked ? ach.icon : isHidden ? '❓' : '🔒'}
      </span>

      {/* Name */}
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        color: ach.unlocked ? 'var(--ctw-text-primary)' : 'var(--ctw-text-tertiary)',
        lineHeight: 1.3,
      }}>
        {(!isHidden || ach.unlocked) ? ach.name : '???'}
      </span>

      {/* Description and progress */}
      {ach.unlocked ? (
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: 'var(--ctw-text-secondary)',
            display: 'block',
            marginBottom: 4,
          }}>
            {ach.description}
          </span>
          {ach.unlocked_at && (
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              color: 'var(--ctw-text-tertiary)',
            }}>
              {formatDate(ach.unlocked_at, language)}
            </span>
          )}
        </div>
      ) : hasProgress ? (
        <div style={{ width: '100%' }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: 'var(--ctw-text-tertiary)',
            display: 'block',
            marginBottom: 6,
          }}>
            {ach.description}
          </span>
          <div style={{
            height: 4,
            borderRadius: 2,
            background: 'var(--ctw-border-default)',
            overflow: 'hidden',
            marginBottom: 4,
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round((progress.current / progress.target) * 100)}%`,
              background: borderColor,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--ctw-text-tertiary)',
          }}>
            {progress.current}/{progress.target}
          </span>
        </div>
      ) : (
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: 'var(--ctw-text-tertiary)',
        }}>
          {isHidden && !ach.unlocked ? t('achievement.hiddenHint') : ach.description}
        </span>
      )}

      {/* Rarity label */}
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 10,
        color: borderColor,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {t(`achievement.rarity.${ach.rarity}`)}
      </span>
    </div>
  )
}
