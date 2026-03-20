export default function LoadingSkeleton({ variant = 'cursor' }) {
  if (variant === 'skeleton') {
    return (
      <div
        className="animate-shimmer"
        style={{
          width: '100%',
          height: 16,
          borderRadius: 8,
          background: 'linear-gradient(90deg, var(--ctw-surface-hover) 25%, var(--ctw-surface-card) 50%, var(--ctw-surface-hover) 75%)',
          backgroundSize: '200% 100%',
        }}
      />
    )
  }

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
