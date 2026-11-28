import { useEffect, useState, type ReactNode } from 'react'

/** Counts up from zero once on mount. Respects reduced motion. */
export function useCount(target: number, ms = 900): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/** True after the first frame, so a CSS transition can run from the empty state to the real value. */
function useMounted(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id) }, [])
  return on
}

export const tone = (n: number): string => (n >= 80 ? 'var(--green)' : n >= 62 ? 'var(--info)' : n >= 42 ? 'var(--amber)' : 'var(--red)')

/**
 * A circular gauge. `ghost` draws a lighter arc after the value, used to show how far the score could still rise.
 */
export function Ring({ value, ghost = 0, size = 120, stroke = 10, color, children, label }: { value: number; ghost?: number; size?: number; stroke?: number; color?: string; children?: ReactNode; label: string }) {
  const on = useMounted()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  const g = Math.max(0, Math.min(100 - v, ghost))
  const col = color ?? tone(value)
  return (
    <div className="sd-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {g > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeOpacity={0.28} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(g / 100) * c} ${c}`} strokeDashoffset={-((v / 100) * c)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ opacity: on ? 1 : 0, transition: 'opacity .6s .5s' }} />
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${on ? (v / 100) * c : 0} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="sd-ring-in">{children}</div>
    </div>
  )
}

const SHORT: Record<string, string> = { impact: 'Impact', craft: 'PM craft', ownership: 'Ownership', ats_hygiene: 'ATS read', experience_fit: 'Level fit', writing: 'Clarity', jd_match: 'Job match' }
export const shortDim = (id: string, fallback: string): string => SHORT[id] ?? fallback

/** A radar of the scoring dimensions: the shape of the resume at a glance. */
export function Radar({ dims, size = 300 }: { dims: { id: string; label: string; score: number }[]; size?: number }) {
  const on = useMounted()
  const n = dims.length
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - 44
  const ang = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n
  const pt = (i: number, f: number): [number, number] => [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f]
  const poly = (f: (i: number) => number) => dims.map((_, i) => pt(i, f(i)).join(',')).join(' ')
  return (
    <svg className="sd-radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score by area: ${dims.map((d) => `${shortDim(d.id, d.label)} ${d.score}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={poly(() => f)} fill="none" stroke="var(--border)" strokeWidth={1} />)}
      {dims.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} /> })}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: on ? 'scale(1)' : 'scale(0.2)', opacity: on ? 1 : 0, transition: 'transform .9s cubic-bezier(.2,.8,.2,1), opacity .5s' }}>
        <polygon points={poly((i) => dims[i].score / 100)} fill="var(--info)" fillOpacity={0.16} stroke="var(--info)" strokeWidth={2} strokeLinejoin="round" />
        {dims.map((d, i) => { const [x, y] = pt(i, d.score / 100); return <circle key={d.id} cx={x} cy={y} r={4.5} fill={tone(d.score)} stroke="var(--surface)" strokeWidth={2} /> })}
      </g>
      {dims.map((d, i) => {
        const [x, y] = pt(i, 1.2)
        const a = Math.cos(ang(i))
        const anchor = a > 0.3 ? 'start' : a < -0.3 ? 'end' : 'middle'
        return (
          <g key={d.id}>
            <text x={x} y={y - 2} textAnchor={anchor} className="sd-radar-l">{shortDim(d.id, d.label)}</text>
            <text x={x} y={y + 13} textAnchor={anchor} className="sd-radar-v" fill={tone(d.score)}>{d.score}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** A thin horizontal progress bar. */
export function Meter({ value, color, label }: { value: number; color?: string; label: string }) {
  const on = useMounted()
  return (
    <div className="sd-meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i style={{ width: on ? `${Math.max(0, Math.min(100, value))}%` : '0%', background: color ?? tone(value) }} />
    </div>
  )
}
