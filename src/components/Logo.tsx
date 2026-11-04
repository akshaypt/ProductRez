export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="12" fill="#17141f" />
      <rect x="3" y="3" width="42" height="42" rx="12" fill="none" stroke="#17141f" strokeWidth="2" />
      <path d="M14 15h14a7 7 0 010 14H20v6" fill="none" stroke="#fbf6ec" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35" cy="34" r="6" fill="#ff5b35" stroke="#17141f" strokeWidth="2.5" />
      <path d="M32.3 34.2l2 2 3.5-3.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <LogoMark size={size} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.68, letterSpacing: '-0.03em' }}>
        Product<span style={{ color: 'var(--accent)' }}>Rez</span>
      </span>
    </span>
  )
}
