export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path d="M11 8.5h6.2a4.6 4.6 0 010 9.2H14.2v5.8" fill="none" stroke="var(--ink-fg)" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" />
      <circle cx="23" cy="22.5" r="2.1" fill="var(--ink-fg)" />
    </svg>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <LogoMark size={size} />
      <span className="logo-word" style={{ fontWeight: 650, fontSize: size * 0.6, letterSpacing: '-0.025em' }}>ProductRez</span>
    </span>
  )
}
