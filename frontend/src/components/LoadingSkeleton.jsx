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
