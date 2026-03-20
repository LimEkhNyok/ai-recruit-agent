import { useMemo } from 'react'
import useThemeStore from '../store/useThemeStore'

export default function RadarChart({ indicators, values, title }) {
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const size = 480
  const center = size / 2
  const maxRadius = size * 0.38
  const levels = 4
  const angleStep = (2 * Math.PI) / indicators.length

  const gridColor = isDark ? '#404040' : '#E5E5E5'
  const fillColor = isDark ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 102, 255, 0.10)'
  const lineColor = '#0066FF'
  const textColor = 'var(--ctw-text-secondary)'

  const getPoint = (index, radius) => {
    const angle = angleStep * index - Math.PI / 2
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  }

  const gridPolygons = useMemo(() => {
    const polys = []
    for (let level = 1; level <= levels; level++) {
      const r = (maxRadius / levels) * level
      const points = indicators
        .map((_, i) => {
          const p = getPoint(i, r)
          return `${p.x},${p.y}`
        })
        .join(' ')
      polys.push(points)
    }
    return polys
  }, [indicators.length])

  const axisLines = useMemo(() => {
    return indicators.map((_, i) => {
      const p = getPoint(i, maxRadius)
      return { x1: center, y1: center, x2: p.x, y2: p.y }
    })
  }, [indicators.length])

  const dataPoints = useMemo(() => {
    return values
      .map((v, i) => {
        const r = (v / 100) * maxRadius
        const p = getPoint(i, r)
        return `${p.x},${p.y}`
      })
      .join(' ')
  }, [values, indicators.length])

  const labelPositions = useMemo(() => {
    const labelRadius = maxRadius + 24
    return indicators.map((name, i) => {
      const p = getPoint(i, labelRadius)
      let anchor = 'middle'
      if (p.x < center - 10) anchor = 'end'
      else if (p.x > center + 10) anchor = 'start'
      return { x: p.x, y: p.y, name, anchor }
    })
  }, [indicators])

  const dotPositions = useMemo(() => {
    return values.map((v, i) => {
      const r = (v / 100) * maxRadius
      return getPoint(i, r)
    })
  }, [values, indicators.length])

  return (
    <div className="w-full" style={{ maxWidth: size }}>
      {title && (
        <div
          className="text-center mb-2"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ctw-text-primary)',
          }}
        >
          {title}
        </div>
      )}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        style={{ maxHeight: 400 }}
      >
        {/* Grid polygons */}
        {gridPolygons.map((points, i) => (
          <polygon
            key={`grid-${i}`}
            points={points}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line
            key={`axis-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={gridColor}
            strokeWidth={1}
          />
        ))}

        {/* Data area */}
        <polygon
          points={dataPoints}
          fill={fillColor}
          stroke={lineColor}
          strokeWidth={2}
        />

        {/* Data dots */}
        {dotPositions.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill={lineColor}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}

        {/* Labels */}
        {labelPositions.map((label, i) => (
          <text
            key={`label-${i}`}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor}
            dominantBaseline="central"
            fill={textColor}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 400,
            }}
          >
            {label.name}
          </text>
        ))}
      </svg>
    </div>
  )
}
