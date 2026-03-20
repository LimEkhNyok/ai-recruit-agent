import { useState, useEffect } from 'react'
import { Input, Button, Tag, Space, Modal, message, Row, Col } from 'antd'
import { getConfig, saveConfig, testConfig, getFeatures } from '../api/modelConfig'
import { getWallet, recharge, subscribe } from '../api/billing'
import useBillingStore from '../store/useBillingStore'
import { useTranslation } from '../i18n'

const CAPABILITY_LABELS = {
  supports_chat: 'settings.supportsChat',
  supports_stream: 'settings.supportsStream',
}

const FEATURE_LABELS = {
  assessment: 'features.assessment',
  matching: 'features.matching',
  interview: 'features.interview',
  career: 'features.career',
  resume: 'features.resume',
  quiz: 'features.quiz',
}

const FEATURE_CREDITS = {
  assessment: { credits: 100, yuan: 1.00, labelKey: 'settings.oneAssessment' },
  matching: { credits: 50, yuan: 0.50, labelKey: 'settings.oneMatching' },
  interview: { credits: 100, yuan: 1.00, labelKey: 'settings.oneInterview' },
  career: { credits: 50, yuan: 0.50, labelKey: 'settings.oneCareer' },
  resume: { credits: 50, yuan: 0.50, labelKey: 'settings.oneResume' },
  quiz: { credits: 10, yuan: 0.10, labelKey: 'settings.oneQuiz' },
}

const RECHARGE_TIERS = [
  { key: 'mini', label: '体验', price: 2, credits: 200, bonus: null },
  { key: 'starter', label: '入门', price: 5, credits: 500, bonus: null },
  { key: 'basic', label: '基础', price: 10, credits: 1000, bonus: null },
  { key: 'plus', label: '进阶', price: 30, credits: 3200, bonus: '送 200' },
  { key: 'premium', label: '畅享', price: 100, credits: 11000, bonus: '送 1000' },
]

function CapabilityTag({ ok, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 12px',
        borderRadius: 6,
        border: '1px solid var(--ctw-border-default)',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: 'var(--ctw-text-secondary)',
      }}
    >
      {ok ? (
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--ctw-success)' }} />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-error)" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {label}
    </span>
  )
}

function PricingPanel({ wallet, onRecharge, onSubscribe, recharging, subscribing, t }) {
  return (
    <div>
      {/* Wallet Display */}
      {wallet && (
        <div
          style={{
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
            background: 'var(--ctw-surface-card)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-8">
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)', margin: 0 }}>
                  {t('settings.balance')}
                </p>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--ctw-text-primary)' }}>
                  {wallet.balance}
                </span>
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)', margin: 0 }}>
                  {t('settings.freeQuiz')}
                </p>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--ctw-text-primary)' }}>
                  {wallet.free_quiz_remaining}
                </span>
              </div>
            </div>
            {wallet.subscription_active && (
              <Tag color="gold" style={{ fontSize: 13, padding: '4px 12px' }}>
                {wallet.subscription_plan === 'weekly' ? t('settings.weekly') : t('settings.monthly')}
              </Tag>
            )}
          </div>
        </div>
      )}

      {/* Three column pricing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="pricing-grid">
        {/* Pay-as-you-go */}
        <div
          style={{
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            padding: 20,
            background: 'var(--ctw-surface-card)',
          }}
        >
          <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 4px' }}>
            {t('settings.payAsYouGo')}
          </h4>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--ctw-text-tertiary)', margin: '0 0 16px' }}>
            {t('settings.creditsRate')}
          </p>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 8px' }}>
            {t('settings.featureCredits')}
          </p>
          <div style={{ marginBottom: 16 }}>
            {Object.entries(FEATURE_CREDITS).map(([key, item]) => (
              <div
                key={key}
                className="flex justify-between py-1"
                style={{ borderBottom: '1px solid var(--ctw-border-default)', fontSize: 12 }}
              >
                <span style={{ color: 'var(--ctw-text-secondary)' }}>{t(item.labelKey)}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--ctw-text-primary)' }}>
                  ~{item.credits}
                </span>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 8px' }}>
            {t('settings.rechargeTiers')}
          </p>
          {RECHARGE_TIERS.map((tier) => (
            <Button
              key={tier.key}
              block
              className="mb-2 text-left"
              style={{ height: 'auto', padding: '8px 12px' }}
              onClick={() => onRecharge(tier.key)}
              loading={recharging === tier.key}
            >
              <div className="flex justify-between items-center w-full">
                <div>
                  <strong>¥{tier.price}</strong>
                  <span style={{ color: 'var(--ctw-text-secondary)', marginLeft: 8 }}>{tier.credits}</span>
                </div>
                {tier.bonus && (
                  <Tag color="orange" style={{ marginRight: 0 }}>{tier.bonus}</Tag>
                )}
              </div>
            </Button>
          ))}
        </div>

        {/* Weekly */}
        <div
          style={{
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            padding: 20,
            background: 'var(--ctw-surface-card)',
            textAlign: 'center',
          }}
        >
          <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 4px' }}>
            {t('settings.weekly')}
          </h4>
          <div style={{ margin: '16px 0' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: 'var(--ctw-brand)' }}>
              ¥9.9
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-tertiary)' }}> / 7</span>
          </div>
          <div style={{ textAlign: 'left', fontSize: 13, marginBottom: 24 }}>
            <FeatureCheckItem text={t('settings.unlimited')} />
            <FeatureCheckItem text={t('settings.noCredits')} />
            <FeatureCheckItem text={t('settings.shortTermBest')} />
          </div>
          <Button
            type="primary"
            block
            onClick={() => onSubscribe('weekly')}
            loading={subscribing === 'weekly'}
            disabled={wallet?.subscription_active}
          >
            {wallet?.subscription_active ? t('settings.subscribed') : t('settings.subscribe')}
          </Button>
        </div>

        {/* Monthly - Recommended */}
        <div
          style={{
            border: '2px solid var(--ctw-brand)',
            borderRadius: 12,
            padding: 20,
            background: 'var(--ctw-surface-card)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: -1,
              right: 16,
              background: 'var(--ctw-brand)',
              color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '0 0 6px 6px',
              letterSpacing: '0.05em',
            }}
          >
            {t('settings.recommended')}
          </span>
          <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 4px' }}>
            {t('settings.monthly')}
          </h4>
          <div style={{ margin: '16px 0' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: 'var(--ctw-brand)' }}>
              ¥29.9
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-tertiary)' }}> / 30</span>
          </div>
          <div style={{ textAlign: 'left', fontSize: 13, marginBottom: 24 }}>
            <FeatureCheckItem text={t('settings.unlimited')} />
            <FeatureCheckItem text={t('settings.noCredits')} />
            <FeatureCheckItem text={t('settings.dailyCost')} />
          </div>
          <Button
            type="primary"
            block
            onClick={() => onSubscribe('monthly')}
            loading={subscribing === 'monthly'}
            disabled={wallet?.subscription_active}
          >
            {wallet?.subscription_active ? t('settings.subscribed') : t('settings.subscribe')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FeatureCheckItem({ text }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ctw-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--ctw-text-primary)' }}>{text}</span>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [mode, setMode] = useState('byok')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [features, setFeatures] = useState(null)
  const [savedConfig, setSavedConfig] = useState(null)
  const [showPricing, setShowPricing] = useState(false)
  const [wallet, setWallet] = useState(null)
  const [recharging, setRecharging] = useState(null)
  const [subscribing, setSubscribing] = useState(null)

  const { fetchWallet: refreshGlobalWallet } = useBillingStore()
  const { t } = useTranslation()

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, featRes] = await Promise.all([getConfig(), getFeatures()])
        const cfg = cfgRes.data
        setSavedConfig(cfg)
        setMode(cfg.mode || 'platform')
        setBaseUrl(cfg.base_url || '')
        setModel(cfg.model || '')
        setApiKeyMasked(cfg.api_key_masked || '')
        setFeatures(featRes.data)
        if (cfg.last_test_status) {
          setTestResult({
            supports_chat: cfg.supports_chat,
            supports_stream: cfg.supports_stream,
            supports_json: cfg.supports_json,
            supports_embedding: cfg.supports_embedding,
          })
        }
        if (cfg.mode === 'platform' && cfg.last_test_status) {
          setShowPricing(true)
          try {
            const walletRes = await getWallet()
            setWallet(walletRes.data)
          } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleTest = async () => {
    if (!baseUrl || !model || !apiKey) {
      message.warning(t('settings.fillRequired'))
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testConfig({ base_url: baseUrl, model, api_key: apiKey })
      setTestResult(res.data)
      if (res.data.supports_chat) {
        message.success(t('settings.testPassed'))
      } else {
        message.error(t('settings.testFailed'))
      }
    } catch (err) {
      message.error(err.response?.data?.detail || t('settings.testError'))
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = mode === 'byok'
        ? { mode: 'byok', base_url: baseUrl, model, api_key: apiKey }
        : { mode: 'platform' }
      const res = await saveConfig(payload)
      setSavedConfig(res.data)
      setApiKeyMasked(res.data.api_key_masked || '')
      setTestResult({
        supports_chat: res.data.supports_chat,
        supports_stream: res.data.supports_stream,
        supports_json: res.data.supports_json,
        supports_embedding: res.data.supports_embedding,
      })
      const featRes = await getFeatures()
      setFeatures(featRes.data)
      message.success(t('settings.saveSuccess'))

      if (mode === 'platform') {
        setShowPricing(true)
        try {
          const walletRes = await getWallet()
          setWallet(walletRes.data)
          refreshGlobalWallet()
        } catch {}
      } else {
        setShowPricing(false)
        refreshGlobalWallet()
      }
    } catch (err) {
      message.error(err.response?.data?.detail || t('settings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleRecharge = async (tier) => {
    setRecharging(tier)
    try {
      const res = await recharge(tier)
      message.success(`${t('settings.rechargeSuccess')} +${res.data.credits_gained}`)
      setWallet((prev) => prev ? { ...prev, balance: res.data.balance } : prev)
      refreshGlobalWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || t('settings.rechargeFailed'))
    } finally {
      setRecharging(null)
    }
  }

  const handleSubscribe = async (planType) => {
    setSubscribing(planType)
    try {
      await subscribe(planType)
      message.success(t('settings.subscribeSuccess'))
      const walletRes = await getWallet()
      setWallet(walletRes.data)
      refreshGlobalWallet()
    } catch (err) {
      message.error(err.response?.data?.detail || t('settings.subscribeFailed'))
    } finally {
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            color: 'var(--ctw-text-tertiary)',
          }}
        >
          {'>'}_<span className="animate-cursor-blink">|</span>
        </span>
      </div>
    )
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--ctw-border-default)',
    background: 'var(--ctw-surface-input)',
    color: 'var(--ctw-text-primary)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{ maxWidth: showPricing ? 900 : 720, margin: '0 auto' }}>
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
          {t('settings.title')}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-secondary)', margin: '4px 0 0' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Mode Switch - Custom Segmented */}
      <div
        style={{
          border: '1px solid var(--ctw-border-default)',
          borderRadius: 12,
          padding: 24,
          background: 'var(--ctw-surface-card)',
          marginBottom: 24,
        }}
      >
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 16px' }}>
          {t('settings.selectMode')}
        </p>
        <div
          style={{
            display: 'inline-flex',
            borderRadius: 8,
            border: '1px solid var(--ctw-border-default)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => {
              Modal.info({
                title: t('settings.platformNotReady'),
                content: t('settings.platformModeDesc'),
                okText: t('common.confirm'),
              })
            }}
            style={{
              padding: '10px 24px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'platform' ? 'var(--ctw-text-primary)' : 'transparent',
              color: mode === 'platform' ? 'var(--ctw-surface-card)' : 'var(--ctw-text-secondary)',
              opacity: 0.5,
            }}
          >
            {t('settings.platformMode')}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 4,
                border: '1px solid var(--ctw-warning)',
                color: 'var(--ctw-warning)',
              }}
            >
              {t('settings.platformNotReady')}
            </span>
          </button>
          <button
            onClick={() => { setMode('byok'); setTestResult(null) }}
            style={{
              padding: '10px 24px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'byok' ? 'var(--ctw-text-primary)' : 'transparent',
              color: mode === 'byok' ? 'var(--ctw-surface-card)' : 'var(--ctw-text-secondary)',
            }}
          >
            {t('settings.byokMode')}
          </button>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--ctw-text-tertiary)', margin: '8px 0 0' }}>
          {mode === 'byok' ? t('settings.byokModeDesc') : t('settings.platformModeDesc')}
        </p>
      </div>

      {/* API Config */}
      {mode === 'byok' && (
        <div
          style={{
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            padding: 24,
            background: 'var(--ctw-surface-card)',
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 20px' }}>
            {t('settings.apiConfig')}
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', display: 'block', marginBottom: 6 }}>
              {t('settings.baseUrl')}
            </label>
            <Input
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', display: 'block', marginBottom: 6 }}>
              {t('settings.model')}
            </label>
            <Input
              placeholder="gpt-4o / deepseek-chat / gemini-pro ..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', display: 'block', marginBottom: 6 }}>
              {t('settings.apiKey')}
              {apiKeyMasked && !apiKey && (
                <span style={{ fontWeight: 400, color: 'var(--ctw-text-tertiary)', marginLeft: 8, fontSize: 12 }}>
                  {t('settings.currentKey')}: {apiKeyMasked}
                </span>
              )}
            </label>
            <Input.Password
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={inputStyle}
            />
          </div>

          <Space>
            <Button onClick={handleTest} loading={testing}>
              {t('settings.testConnection')}
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!testResult?.supports_chat && !apiKeyMasked}
            >
              {t('settings.saveConfig')}
            </Button>
          </Space>

          {/* Test Result */}
          {testResult && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                border: '1px solid var(--ctw-border-default)',
                background: 'var(--ctw-surface-hover)',
              }}
            >
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 12px' }}>
                {t('settings.testResult')}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CAPABILITY_LABELS).map(([key, labelKey]) => (
                  <CapabilityTag key={key} ok={testResult[key]} label={t(labelKey)} />
                ))}
              </div>
              {testResult.errors && Object.keys(testResult.errors).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {Object.entries(testResult.errors).map(([key, err]) => (
                    <p key={key} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--ctw-text-tertiary)', margin: '2px 0' }}>
                      {key}: {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Platform not ready */}
      {mode === 'platform' && !showPricing && (
        <div
          style={{
            border: '1px solid var(--ctw-warning)',
            borderRadius: 12,
            padding: 20,
            background: 'var(--ctw-surface-card)',
            marginBottom: 24,
          }}
        >
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-primary)', margin: 0 }}>
            {t('settings.platformNotReady')}
          </p>
        </div>
      )}

      {/* Pricing */}
      {mode === 'platform' && showPricing && (
        <div
          style={{
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            padding: 24,
            background: 'var(--ctw-surface-card)',
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 20px' }}>
            {t('settings.pricing')}
          </h3>
          <PricingPanel
            wallet={wallet}
            onRecharge={handleRecharge}
            onSubscribe={handleSubscribe}
            recharging={recharging}
            subscribing={subscribing}
            t={t}
          />
        </div>
      )}

      {/* Feature Availability */}
      {features && (
        <div
          style={{
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 12,
            padding: 24,
            background: 'var(--ctw-surface-card)',
          }}
        >
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--ctw-text-primary)', margin: '0 0 16px' }}>
            {t('settings.featureAvailability')}
          </h3>
          <div>
            {Object.entries(FEATURE_LABELS).map(([key, labelKey]) => (
              <div
                key={key}
                className="flex items-center justify-between"
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--ctw-border-default)',
                }}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ctw-text-primary)' }}>
                  {t(labelKey)}
                </span>
                {features[key] ? (
                  <span
                    style={{
                      fontSize: 12,
                      padding: '2px 10px',
                      borderRadius: 4,
                      border: '1px solid var(--ctw-success)',
                      color: 'var(--ctw-success)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    OK
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      padding: '2px 10px',
                      borderRadius: 4,
                      border: '1px solid var(--ctw-error)',
                      color: 'var(--ctw-error)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    N/A
                  </span>
                )}
              </div>
            ))}
          </div>
          {!features.interview && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'var(--ctw-warning)',
                margin: '12px 0 0',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--ctw-warning)',
              }}
            >
              {t('settings.streamRequired')}
            </p>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
