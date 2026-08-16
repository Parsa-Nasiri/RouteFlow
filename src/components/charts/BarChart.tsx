import { useId } from 'react'

export interface BarDatum {
  label: string
  value: number
  hint?: string
}

/** Lightweight CSS bar chart with hover tooltips. */
export function BarChart({
  data,
  height = 150,
  color = 'rgb(var(--c-accent))',
  formatValue = (v: number) => String(v),
  ariaLabel,
}: {
  data: BarDatum[]
  height?: number
  color?: string
  formatValue?: (v: number) => string
  ariaLabel?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const roundedMax = niceCeil(max)
  const labelEvery = Math.max(1, Math.ceil(data.length / 9))
  const key = useId()

  return (
    <div role="img" aria-label={ariaLabel ?? `Bar chart, max ${formatValue(roundedMax)}`}>
      <div className="relative" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div
            key={f}
            className="pointer-events-none absolute inset-x-0 border-t border-line/70"
            style={{ bottom: `${f * 100}%` }}
            aria-hidden
          />
        ))}
        <div className="absolute inset-0 flex items-end justify-between gap-[3px]">
          {data.map((d, i) => {
            const h = d.value === 0 ? 0 : Math.max(4, (d.value / roundedMax) * 100)
            return (
              <div key={`${key}-${i}`} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px] transition-all duration-300 group-hover:opacity-80"
                  style={{
                    height: `${h}%`,
                    backgroundColor: d.value === 0 ? 'rgb(var(--c-border2))' : color,
                    opacity: d.value === 0 ? 0.5 : 1,
                  }}
                />
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink opacity-0 shadow-pop transition-opacity duration-100 group-hover:opacity-100">
                  {d.hint ?? `${d.label}: ${formatValue(d.value)}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between gap-[3px]">
        {data.map((d, i) => (
          <div
            key={`${key}-l-${i}`}
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

function niceCeil(v: number): number {
  if (v <= 5) return 5
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / (magnitude / 2)) * (magnitude / 2)
}
