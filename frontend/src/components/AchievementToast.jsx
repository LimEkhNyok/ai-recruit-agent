import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import useAchievementStore from '../store/useAchievementStore'
import { useTranslation } from '../i18n'

const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
}

export default function AchievementToast() {
  const { newlyUnlocked, shiftUnlocked } = useAchievementStore()
  const [current, setCurrent] = useState(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!current && newlyUnlocked.length > 0) {
      setCurrent(newlyUnlocked[0])
      shiftUnlocked()
    }
  }, [newlyUnlocked, current, shiftUnlocked])

  useEffect(() => {
    if (current) {
      const timer = setTimeout(() => setCurrent(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [current])

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 10001,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              background: 'var(--ctw-surface-card, #fff)',
              border: `2px solid ${RARITY_COLORS[current.rarity] || '#F59E0B'}`,
              borderRadius: 12,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: `0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px ${RARITY_COLORS[current.rarity] || '#F59E0B'}33`,
              minWidth: 240,
              pointerEvents: 'auto',
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{current.icon}</span>
            <div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: RARITY_COLORS[current.rarity] || '#F59E0B',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}>
                {t(`achievement.rarity.${current.rarity}`)}
              </div>
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--ctw-text-primary)',
              }}>
                {current.name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
