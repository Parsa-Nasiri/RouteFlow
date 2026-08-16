import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

const fieldBase =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50'

export function Field({
  label,
  error,
  hint,
  children,
  className = '',
}: {
  label?: React.ReactNode
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink2">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12.5px] font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12.5px] text-ink3">{hint}</span>
      ) : null}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; error?: string }>(
  function Input({ className = '', invalid, error, ...rest }, ref) {
    return (
      <>
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={`${fieldBase} ${invalid ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-line focus:border-primary'} ${className}`}
          {...rest}
        />
        {error && !rest['aria-describedby'] && (
          <span className="mt-1.5 block text-[12.5px] font-medium text-danger">{error}</span>
        )}
      </>
    )
  }
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className = '', invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${fieldBase} min-h-[88px] resize-y ${invalid ? 'border-danger focus:border-danger' : 'border-line focus:border-primary'} ${className}`}
        {...rest}
      />
    )
  }
)

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className = '', invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${fieldBase} cursor-pointer appearance-none pr-9 ${invalid ? 'border-danger' : 'border-line focus:border-primary'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3"
      />
    </div>
  )
})

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  title?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex rounded-xl bg-surface2 p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`flex-1 whitespace-nowrap rounded-lg font-medium transition-all duration-150 ${
              size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-1.5 text-[13.5px]'
            } ${active ? 'bg-surface text-ink shadow-sm' : 'text-ink2 hover:text-ink'}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
