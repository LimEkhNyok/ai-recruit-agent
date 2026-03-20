import { useState, useEffect, useRef } from 'react'
import { Table, Tag, Card } from 'antd'
import { getStats, getRecent } from '../api/usage'
import { useTranslation } from '../i18n'

const FEATURE_LABELS = {
  assessment: 'features.assessment',
  matching: 'features.matching',
  interview: 'features.interview',
  career: 'features.career',
  resume: 'features.resume',
  quiz: 'features.quiz',
  unknown: 'unknown',
}

const FEATURE_COLORS = {
  assessment: 'blue',
  matching: 'green',
  interview: 'purple',
  career: 'orange',
  resume: 'cyan',
  quiz: 'magenta',
}

function CountUpNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (value == null || value === 0) {
      setDisplay(0)
      return
    }
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

  return <>{display.toLocaleString()}</>
}

export default function UsagePage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, rRes] = await Promise.all([getStats(), getRecent(50)])
        setStats(sRes.data)
        setRecent(rRes.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
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

  const byFeature = stats?.by_feature || {}

  const columns = [
    {
      title: <span style={thStyle}>{t('usage.time')}</span>,
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {v ? new Date(v).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: <span style={thStyle}>{t('usage.feature')}</span>,
      dataIndex: 'feature',
      key: 'feature',
      width: 100,
      render: (v) => <Tag color={FEATURE_COLORS[v] || 'default'}>{t(FEATURE_LABELS[v]) || v}</Tag>,
    },
    {
      title: <span style={thStyle}>{t('usage.tokens')}</span>,
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      width: 100,
      render: (v) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {v ? v.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={thStyle}>{t('usage.request')}</span>,
      dataIndex: 'request_tokens',
      key: 'request_tokens',
      width: 90,
      render: (v) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {v ? v.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={thStyle}>{t('usage.thinking')}</span>,
      dataIndex: 'thinking_tokens',
      key: 'thinking_tokens',
      width: 90,
      render: (v) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {v ? v.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={thStyle}>{t('usage.response')}</span>,
      dataIndex: 'response_tokens',
      key: 'response_tokens',
      width: 90,
      render: (v) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {v ? v.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={thStyle}>{t('usage.latency')}</span>,
      dataIndex: 'latency_ms',
      key: 'latency_ms',
      width: 80,
      render: (v) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {v != null ? `${(v / 1000).toFixed(1)}s` : '-'}
        </span>
      ),
    },
    {
      title: <span style={thStyle}>{t('usage.status')}</span>,
      dataIndex: 'success',
      key: 'success',
      width: 70,
      render: (v) =>
        v ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ),
    },
  ]

  const statCards = [
    { label: t('usage.totalCalls'), value: stats?.total_calls || 0 },
    { label: t('usage.successCalls'), value: stats?.success_calls || 0 },
    { label: t('usage.totalTokens'), value: stats?.total_tokens || 0 },
    {
      label: t('usage.tokenBreakdown'),
      value: null,
      custom: (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--ctw-text-primary)' }}>
          {(stats?.request_tokens || 0).toLocaleString()} / {(stats?.thinking_tokens || 0).toLocaleString()} / {(stats?.response_tokens || 0).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ctw-text-primary)',
            margin: 0,
          }}
        >
          {t('usage.title')}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '4px 0 0' }}>
          {t('usage.subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
        className="stats-grid"
      >
        {statCards.map((card, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--ctw-border-default)',
              borderRadius: 12,
              padding: '20px 24px',
              background: 'var(--ctw-surface-card)',
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'var(--ctw-text-tertiary)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {card.label}
            </p>
            {card.custom ? (
              <div style={{ marginTop: 8 }}>{card.custom}</div>
            ) : (
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 36,
                  fontWeight: 700,
                  color: 'var(--ctw-text-primary)',
                  marginTop: 8,
                  lineHeight: 1.1,
                }}
              >
                <CountUpNumber value={card.value} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* By Feature */}
      <div
        style={{
          border: '1px solid var(--ctw-border-default)',
          borderRadius: 12,
          padding: '20px 24px',
          background: 'var(--ctw-surface-card)',
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ctw-text-primary)',
            margin: '0 0 16px',
          }}
        >
          {t('usage.byFeature')}
        </h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(FEATURE_LABELS)
            .filter(([k]) => k !== 'unknown')
            .map(([key, labelKey]) => (
              <div key={key} className="flex items-center gap-2">
                <Tag color={FEATURE_COLORS[key]}>{t(labelKey)}</Tag>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--ctw-text-primary)' }}>
                  {byFeature[key] || 0}
                </span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)' }}>
                  {t('usage.times')}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Usage Table */}
      <Card
        style={{
          border: '1px solid var(--ctw-border-default)',
          borderRadius: 12,
          background: 'var(--ctw-surface-card)',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <h3
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ctw-text-primary)',
              margin: '0 0 16px',
            }}
          >
            {t('usage.recentUsage')}
          </h3>
        </div>
        <Table
          dataSource={recent}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: false }}
          className="ctw-table"
        />
      </Card>

      <style>{`
        .ctw-table .ant-table {
          background: transparent !important;
        }
        .ctw-table .ant-table-thead > tr > th {
          background: transparent !important;
          border-bottom: 1px solid var(--ctw-border-default) !important;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--ctw-text-tertiary) !important;
        }
        .ctw-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid var(--ctw-border-default) !important;
        }
        .ctw-table .ant-table-tbody > tr:hover > td {
          background: var(--ctw-surface-hover) !important;
        }
        .ctw-table .ant-table-cell {
          border-right: none !important;
        }
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

const thStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--ctw-text-tertiary)',
}
