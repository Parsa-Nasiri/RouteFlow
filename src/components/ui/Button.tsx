import React, { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-strong active:bg-primary-strong',
  secondary:
    'bg-surface text-ink border border-line hover:border-line2 hover:bg-surface2',
  ghost: 'text-ink2 hover:bg-surface2 hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex select-none items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    />
  )
})

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
  tone?: 'default' | 'ghost' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', tone = 'ghost', className = '', type = 'button', ...rest },
  ref
) {
  const sizeCls = size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl'
  const toneCls =
    tone === 'danger'
      ? 'text-danger hover:bg-danger-soft'
      : tone === 'default'
        ? 'text-ink border border-line bg-surface hover:border-line2'
        : 'text-ink2 hover:bg-surface2 hover:text-ink'
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${sizeCls} ${toneCls} ${className}`}
      {...rest}
    />
  )
})
