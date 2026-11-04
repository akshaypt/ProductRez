export function LogoMark({ size = 32 }: { size?: number }) {
  const id = `lg${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path d="M13 11.5h9a5.5 5.5 0 010 11h-5.5V29" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29.5" cy="28" r="4.6" fill="#fff" />
      <path d="M27.4 28.1l1.5 1.5 2.7-2.9" fill="none" stroke="#6d5cf0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 700, fontSize: size * 0.62, letterSpacing: '-0.035em' }}>
        ProductRez
      </span>
    </span>
  )
}
