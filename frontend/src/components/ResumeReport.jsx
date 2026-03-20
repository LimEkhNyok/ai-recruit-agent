import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../i18n'

function CountUpNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (value == null) return
    let start = 0
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate)
      }
    }
    ref.current = requestAnimationFrame(animate)
    return () => ref.current && cancelAnimationFrame(ref.current)
  }, [value, duration])

  return <>{display}</>
}

function SectionItem({ children, borderColor, icon, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        paddingLeft: 16,
        marginBottom: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div className="flex items-start gap-2">
        <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-primary)' }}>
          {children}
        </span>
      </div>
    </div>
  )
}

export default function ResumeReport({ analysis, filename }) {
  const { t } = useTranslation()

  if (!analysis) return null

  const { basic_info, strengths, weaknesses, suggestions, suitable_directions, overall_score, overall_comment } = analysis

  return (
    <div>
      {/* Score */}
      <div className="text-center" style={{ marginBottom: 32 }}>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: 'var(--ctw-text-tertiary)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {t('resume.overallScore')}
        </p>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #0066FF, #00D4AA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <CountUpNumber value={overall_score} />
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '4px 0 0' }}>
          {filename}
        </p>
      </div>

      {/* Basic Info */}
      {basic_info && (
        <div style={{ marginBottom: 32 }}>
          <h4
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '32px 0 16px',
            }}
          >
            {t('resume.basicInfo')}
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {basic_info.name && (
              <InfoRow label={t('resume.name')} value={basic_info.name} />
            )}
            {basic_info.education && (
              <InfoRow label={t('resume.education')} value={basic_info.education} />
            )}
            {basic_info.work_years && (
              <InfoRow label={t('resume.workYears')} value={basic_info.work_years} />
            )}
            {basic_info.current_role && (
              <InfoRow label={t('resume.currentRole')} value={basic_info.current_role} />
            )}
          </div>
          {basic_info.skills && basic_info.skills.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)' }}>
                {t('resume.skills')}
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {basic_info.skills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      padding: '2px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--ctw-border-default)',
                      color: 'var(--ctw-text-secondary)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <div>
          <h4
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '32px 0 16px',
            }}
          >
            {t('resume.strengths')}
          </h4>
          {strengths.map((s, i) => (
            <SectionItem
              key={i}
              borderColor="var(--ctw-success)"
              delay={i * 100}
              icon={
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--ctw-success)', marginTop: 4 }} />
              }
            >
              {s}
            </SectionItem>
          ))}
        </div>
      )}

      {/* Weaknesses */}
      {weaknesses && weaknesses.length > 0 && (
        <div>
          <h4
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '32px 0 16px',
            }}
          >
            {t('resume.weaknesses')}
          </h4>
          {weaknesses.map((s, i) => (
            <SectionItem
              key={i}
              borderColor="var(--ctw-warning)"
              delay={i * 100}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--ctw-warning)" stroke="none" style={{ marginTop: 2 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              }
            >
              {s}
            </SectionItem>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div>
          <h4
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '32px 0 16px',
            }}
          >
            {t('resume.suggestions')}
          </h4>
          {suggestions.map((s, i) => (
            <SectionItem
              key={i}
              borderColor="var(--ctw-brand)"
              delay={i * 100}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              }
            >
              {s}
            </SectionItem>
          ))}
        </div>
      )}

      {/* Suitable Directions */}
      {suitable_directions && suitable_directions.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h4
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '0 0 12px',
            }}
          >
            {t('resume.suitableDirections')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {suitable_directions.map((d, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  padding: '4px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--ctw-border-default)',
                  color: 'var(--ctw-text-secondary)',
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overall Comment */}
      {overall_comment && (
        <div style={{ marginTop: 32 }}>
          <h4
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '0 0 12px',
            }}
          >
            {t('resume.overallComment')}
          </h4>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', margin: 0, lineHeight: 1.7 }}>
            {overall_comment}
          </p>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--ctw-text-tertiary)' }}>{label}</span>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
