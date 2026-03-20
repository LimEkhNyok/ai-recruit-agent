import useThemeStore from '../store/useThemeStore'

const sizes = {
  sm: { text: 14, gap: 4 },
  md: { text: 17, gap: 5 },
  lg: { text: 22, gap: 6 },
}

export default function LogoMark({ size = 'md', onClick }) {
  const theme = useThemeStore((s) => s.theme)
  const s = sizes[size] || sizes.md
  const textColor = theme === 'dark' ? '#EDEDED' : '#0A0A0A'

  return (
    <div
      className="flex items-center cursor-pointer select-none"
      onClick={onClick}
      style={{ fontFamily: "'Sora', sans-serif", fontSize: s.text }}
    >
      <span style={{ fontWeight: 700, color: textColor }}>
        Code
      </span>
      <span style={{ fontWeight: 700, color: '#0066FF' }}>
        To
      </span>
      <span style={{ fontWeight: 700, color: textColor }}>
        Work
      </span>
    </div>
  )
}
