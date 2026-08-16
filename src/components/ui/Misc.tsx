import React from 'react'
import { Check } from 'lucide-react'
import { RouteArt } from '@/components/ui/Brand'
import { hexA } from '@/lib/constants'

export function Card({
  children,
  className = '',
  padded = true,
  hover = false,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
  hover?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-card ${padded ? 'p-5' : ''} ${
        hover ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink3">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline'

const chipTones: Record<ChipTone, string> = {
  neutral: 'bg-surface2 text-ink2',
  accent: 'bg-primary-soft text-primary-strong',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger-soft text-danger',
  outline: 'border border-line text-ink2',
}

export function Chip({
  children,
  tone = 'neutral',
  color,
  className = '',
  title,
}: {
  children: React.ReactNode
  tone?: ChipTone
  /** optional hex color — tints the chip and shows a colored dot */
  color?: string
  className?: string
  title?: string
}) {
  if (color) {
    return (
      <span
        title={title}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium text-ink2 ${className}`}
        style={{ backgroundColor: hexA(color, 0.12) }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{children}</span>
      </span>
    )
  }
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${chipTones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function ProgressBar({
  value,
  color = 'rgb(var(--c-accent))',
  className = '',
  thickness = 8,
}: {
  value: number
  color?: string
  className?: string
  thickness?: number
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-surface2 ${className}`}
      style={{ height: thickness }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  size = 'md',
  className = '',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const box = size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`group inline-flex shrink-0 items-center justify-center rounded-[7px] border transition-all duration-150 ${box} ${
        checked
          ? 'border-primary bg-primary text-white'
          : 'border-line2 bg-surface hover:border-primary/70'
      } ${className}`}
    >
      {checked && <Check size={size === 'sm' ? 12 : 14} strokeWidth={3} className="animate-check-pop" />}
    </button>
  )
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line2 bg-surface2/50 text-center ${
        compact ? 'px-6 py-8' : 'px-6 py-12'
      }`}
    >
      <RouteArt className="mb-4 text-ink3/50" />
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  className = '',
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`flex items-center gap-3.5 ${className}`} padded={false}>
      <div className="p-4 pl-5 sm:pl-5">
        <div className="text-[12px] font-medium uppercase tracking-wide text-ink3">{label}</div>
        <div className="tnum mt-1 font-display text-[26px] font-semibold leading-none text-ink">
          {value}
        </div>
        {sub && <div className="mt-1.5 text-[12.5px] text-ink3">{sub}</div>}
      </div>
      {icon && (
        <div className="ml-auto hidden h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl bg-primary-soft text-primary-strong mr-5 sm:flex">
          {icon}
        </div>
      )}
    </Card>
  )
}
