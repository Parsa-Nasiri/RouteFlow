import React from 'react'

export function ProgressRing({
  value,
  size = 64,
  thickness = 6,
  color = 'rgb(var(--c-accent))',
  track = 'rgb(var(--c-border))',
  children,
  className = '',
  label,
}: {
  value: number
  size?: number
  thickness?: number
  color?: string
  track?: string
  children?: React.ReactNode
  className?: string
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  return (
    <div
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
