import { useEffect, useRef } from 'react'

export default function ChatBubble({ role, content }) {
  const isAI = role === 'ai'
  const bubbleRef = useRef(null)

  useEffect(() => {
    const el = bubbleRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })
  }, [])

  if (isAI) {
    return (
      <div ref={bubbleRef} className="flex gap-3 mb-4 items-start">
        {/* AI avatar */}
        <div
          className="shrink-0 flex items-center justify-center rounded-full font-mono"
          style={{
            width: 24,
            height: 24,
            background: '#0066FF',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          AI
        </div>
        {/* AI content - no background */}
        <div
          className="max-w-[75%] font-body whitespace-pre-wrap"
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: 'var(--ctw-text-primary)',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div ref={bubbleRef} className="flex gap-3 mb-4 items-start flex-row-reverse">
      {/* User content */}
      <div
        className="max-w-[75%] px-4 py-3 font-body whitespace-pre-wrap"
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: 'var(--ctw-text-primary)',
          background: 'var(--ctw-surface-hover, rgba(0,0,0,0.04))',
          borderRadius: '16px 16px 4px 16px',
        }}
      >
        {content}
      </div>
    </div>
  )
}
