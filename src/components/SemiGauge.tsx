import { useEffect, useState } from 'react'
import { useTween } from '../lib/useTween'

const label = (n: number) => (n >= 85 ? 'Excellent' : n >= 70 ? 'Good' : n >= 50 ? 'Fair' : 'Needs work')

/** Semicircle score gauge with a red → amber → green arc and a sliding marker. */
export function SemiGauge({ value, size = 220, caption = true, decorative = false }: { value: number; size?: number; caption?: boolean; decorative?: boolean }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80)
    return () => clearTimeout(t)
  }, [])
  const shown = useTween(value, 1100)
  const deg = on ? -90 + (value / 100) * 180 : -90
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [100 + 78 * Math.cos((Math.PI * (a - 180)) / 180), 100 + 78 * Math.sin((Math.PI * (a - 180)) / 180)]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M ${x0} ${y0} A 78 78 0 0 1 ${x1} ${y1}`
  }
  return (
    <div className="semi" style={{ width: size }} {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Score ${value} out of 100` })}>
      <svg viewBox="0 0 200 118" width="100%">
        <path d={arc(0, 180)} fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
        <path d={arc(0, 62)} fill="none" stroke="var(--gauge-1)" strokeWidth="14" strokeLinecap="round" />
        <path d={arc(62, 118)} fill="none" stroke="var(--gauge-2)" strokeWidth="14" />
        <path d={arc(118, 180)} fill="none" stroke="var(--gauge-3)" strokeWidth="14" strokeLinecap="round" />
        <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: '100px 100px', transition: 'transform 1.2s var(--ease)' }}>
          <circle cx="100" cy="22" r="8.5" fill="var(--surface)" stroke="var(--text)" strokeWidth="2.5" />
        </g>
      </svg>
      <div className="semi-num">
        <b>{shown}</b>
        {caption && <span>{label(value)}</span>}
      </div>
      <div className="semi-ends"><span>0</span><span>100</span></div>
    </div>
  )
}
