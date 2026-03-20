export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {icon && (
        <div className="text-fg-muted" style={{ fontSize: 40, lineHeight: 1 }}>
          {icon}
        </div>
      )}
      {title && (
        <h3
          className="text-fg mt-4"
          style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 600, margin: 0, marginTop: 16 }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          className="text-fg-secondary mt-2"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: 0, marginTop: 8, textAlign: 'center', maxWidth: 400 }}
        >
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 24 }}>
          {action}
        </div>
      )}
    </div>
  )
}
