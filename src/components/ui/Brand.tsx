export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl bg-primary shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64" fill="none">
        <path
          d="M18 44 C 18 30, 30 34, 32 24 C 33.5 16, 44 16, 46 22"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="18" cy="44" r="6" fill="white" />
        <circle cx="46" cy="22" r="6" fill="white" />
      </svg>
    </div>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={compact ? 32 : 38} />
      <div className="leading-tight">
        <div className="font-display text-[17px] font-semibold tracking-tight text-ink">
          RouteFlow
        </div>
        {!compact && <div className="text-[11px] font-medium text-ink3">Your day, routed</div>}
      </div>
    </div>
  )
}

/** Dotted-route illustration used in empty states. */
export function RouteArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 72"
      className={className}
      fill="none"
      aria-hidden
      width="140"
      height="72"
    >
      <path
        d="M16 56 C 30 56, 30 24, 52 24 C 74 24, 76 48, 98 48 C 116 48, 118 20, 132 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 7.5"
        className="animate-dash-draw"
      />
      <circle cx="16" cy="56" r="6" className="fill-surface stroke-current" strokeWidth="2.5" />
      <circle cx="98" cy="48" r="6" className="fill-surface stroke-current" strokeWidth="2.5" />
      <circle cx="52" cy="24" r="5" className="fill-primary" />
      <circle cx="132" cy="20" r="7" className="fill-primary" />
      <path d="M129.5 17.5 l2 2 3.5-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
