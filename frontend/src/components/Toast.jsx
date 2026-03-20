import { useState, useEffect, useCallback, createRef } from 'react'
import { createRoot } from 'react-dom/client'

let addToast = null

function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((type, message) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message, entering: true }])
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, entering: false } : t)))
    }, 10)
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    }, 2700)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    addToast = add
    return () => { addToast = null }
  }, [add])

  const colorMap = {
    success: 'var(--ctw-brand-cyan, #00D4AA)',
    error: 'var(--ctw-error, #EF4444)',
    info: 'var(--ctw-brand, #0066FF)',
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'stretch',
            background: 'var(--ctw-surface-card)',
            border: '1px solid var(--ctw-border-default)',
            borderRadius: 8,
            overflow: 'hidden',
            minWidth: 240,
            maxWidth: 420,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            transform: t.entering ? 'translateY(-20px)' : t.leaving ? 'translateY(-10px)' : 'translateY(0)',
            opacity: t.entering ? 0 : t.leaving ? 0 : 1,
          }}
        >
          <div
            style={{
              width: 3,
              flexShrink: 0,
              background: colorMap[t.type] || colorMap.info,
            }}
          />
          <div
            style={{
              padding: '10px 16px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: 'var(--ctw-text-primary)',
            }}
          >
            {t.message}
          </div>
        </div>
      ))}
    </div>
  )
}

let containerMounted = false

function ensureContainer() {
  if (containerMounted) return
  containerMounted = true
  const div = document.createElement('div')
  div.id = 'ctw-toast-root'
  document.body.appendChild(div)
  const root = createRoot(div)
  root.render(<ToastContainer />)
}

const toast = {
  success(msg) {
    ensureContainer()
    setTimeout(() => addToast?.('success', msg), 0)
  },
  error(msg) {
    ensureContainer()
    setTimeout(() => addToast?.('error', msg), 0)
  },
  info(msg) {
    ensureContainer()
    setTimeout(() => addToast?.('info', msg), 0)
  },
}

export default toast
