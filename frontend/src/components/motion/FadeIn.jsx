import { motion } from 'motion/react'

const directionOffset = {
  up: { y: 8 },
  down: { y: -8 },
  left: { x: 8 },
  right: { x: -8 },
}

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  className,
  style,
}) {
  const offset = directionOffset[direction] || directionOffset.up
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
