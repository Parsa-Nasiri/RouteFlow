import { useId } from 'react'

export interface AreaDatum {
  label: string
  value: number
}

/** Smooth SVG area chart. Text labels live outside the SVG so they never stretch. */
export function AreaChart({
  data,
  height = 160,
  color = 'rgb(var(--c-accent))',
  formatValue = (v: number) => String(v),
  ariaLabel,
}: {
  data: AreaDatum[]
  height?: number
  color?: string
  formatValue?: (v: number) => string
  ariaLabel?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const W = 600
  const H = 160
  const PAD_T = 12
  const PAD_B = 8
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  const toXY = (i: number, v: number) => ({
    x: data.length <= 1 ? 0 : (i / (data.length - 1)) * W,
    y: H - PAD_B - (v / max) * (H - PAD_T - PAD_B),
  })
  const pts = data.map((d, i) => toXY(i, d.value))
  const line = smoothPath(pts)
  const area = `${line} L ${W},${H} L 0,${H} Z`
  const avg = data.reduce((a, d) => a + d.value, 0) / Math.max(1, data.length)
  const avgY = toXY(0, avg).y
  const labelEvery = Math.max(1, Math.ceil(data.length / 9))

  return (
    <div role="img" aria-label={ariaLabel ?? `Trend chart, peak ${formatValue(max)}`}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={PAD_B + f * (H - PAD_T - PAD_B)}
              y2={PAD_B + f * (H - PAD_T - PAD_B)}
              stroke="rgb(var(--c-border))"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1="0"
            x2={W}
            y1={avgY}
            y2={avgY}
            stroke="rgb(var(--c-text3))"
            strokeWidth="1"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
            opacity="0.6"
          />
          <path d={area} fill={`url(#grad-${uid})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2.25"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10.5px] font-medium text-ink3">
          avg {formatValue(Math.round(avg))}
        </div>
      </div>
      <div className="mt-1 flex justify-between gap-[3px]">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 truncate text-center text-[10.5px] text-ink3"
            aria-hidden={i % labelEvery !== 0}
          >
            {i % labelEvery === 0 ? d.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

function niceMax(v: number): number {
  if (v <= 5) return 5
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / (magnitude / 2)) * (magnitude / 2)
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length < 3) return `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')}`
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}
