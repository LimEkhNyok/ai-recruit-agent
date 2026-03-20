import { useState } from 'react'
import { Button } from 'antd'
import { motion } from 'motion/react'
import { useTranslation } from '../i18n'

const dimensionI18nKeys = {
  personality_fit: 'personalityFit',
  ability_fit: 'abilityFit',
  interest_fit: 'interestFit',
  value_fit: 'valueFit',
}

export default function MatchCard({ match, onInterview }) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation()

  const scoreColor =
    match.score >= 80
      ? '#00D4AA'
      : match.score >= 60
        ? '#0066FF'
        : 'var(--ctw-text-tertiary)'

  const isBeyond = match.is_beyond_cognition

  return (
    <div
      className="rounded-xl p-5 h-full flex flex-col"
      style={{
        border: '1px solid var(--ctw-border-default)',
        borderLeft: isBeyond ? '3px solid #00D4AA' : '1px solid var(--ctw-border-default)',
        backgroundColor: 'var(--ctw-surface-card)',
        transition: 'border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#0066FF'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 255, 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isBeyond ? '#00D4AA' : 'var(--ctw-border-default)'
        if (isBeyond) {
          e.currentTarget.style.borderLeftColor = '#00D4AA'
        }
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header: title + score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3
            className="mb-2"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: 0,
              marginBottom: 8,
              lineHeight: 1.3,
            }}
          >
            {match.job_title}
          </h3>
          <span
            className="inline-block px-2 py-0.5 rounded"
            style={{
              border: '1px solid var(--ctw-border-default)',
              fontSize: 12,
              color: 'var(--ctw-text-secondary)',
              lineHeight: '18px',
            }}
          >
            {match.job_category}
          </span>
        </div>

        {/* Score */}
        <div className="shrink-0 text-right">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28,
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {match.score}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 400,
              color: scoreColor,
              marginLeft: 1,
            }}
          >
            %
          </span>
        </div>
      </div>

      {/* Reason */}
      <p
        className="mb-3 flex-1"
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--ctw-text-secondary)',
          margin: 0,
          marginBottom: 12,
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
        }}
      >
        {match.reason}
      </p>

      {/* Expanded breakdown */}
      {expanded && match.breakdown && (
        <div
          className="mb-3 p-3 rounded-lg"
          style={{ backgroundColor: 'var(--ctw-surface-base)' }}
        >
          {Object.entries(match.breakdown).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-1.5">
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: 'var(--ctw-text-primary)',
                }}
              >
                {t(`matching.${dimensionI18nKeys[key]}`, key)}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="w-24 rounded-full overflow-hidden"
                  style={{
                    height: 4,
                    backgroundColor: 'var(--ctw-border-default)',
                  }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#0066FF' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--ctw-text-primary)',
                    width: 24,
                    textAlign: 'right',
                  }}
                >
                  {val}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="bg-transparent border-none cursor-pointer p-0"
          style={{
            fontSize: 13,
            color: '#0066FF',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {expanded ? t('matching.collapse') : t('matching.expand')}
        </button>
        <Button
          type="primary"
          size="small"
          onClick={() => onInterview(match.job_id)}
          style={{
            background: '#0066FF',
            borderColor: '#0066FF',
          }}
        >
          {t('matching.interview')}
        </Button>
      </div>
    </div>
  )
}
