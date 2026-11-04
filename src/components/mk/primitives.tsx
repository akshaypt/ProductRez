import { useRef, type ReactNode } from 'react'
import { useCountUp, useInView, useScrollVar } from '../../lib/motion'

/** Two-tone headline whose words slide up from a mask when scrolled into view. */
export function Headline({ parts, as: Tag = 'h2', className = 'rz-h2', delay = 0 }: { parts: { t: string; mute?: boolean }[]; as?: 'h1' | 'h2'; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLHeadingElement>({ threshold: 0.3 })
  let i = 0
  return (
    <Tag ref={ref as never} className={`${className} ${seen ? 'in-view' : ''}`} style={{ ['--delay' as string]: `${delay}ms` }}>
      {parts.map((p, k) => (
        <span key={k} className={p.mute ? 'mute' : undefined}>
          {p.t.split(' ').filter(Boolean).map((w) => (
            <span key={`${k}-${i}`} className="hw" style={{ ['--i' as string]: i++ }}>
              <span>{w}</span>
              {' '}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  )
}

/** Section label pill that sits on a hairline which draws in across the frame. */
export function LabelRow({ children, tone = '' }: { children: ReactNode; tone?: '' | 'red' | 'teal' | 'dk' }) {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.6 })
  return (
    <div ref={ref} className={`rz-labelrow ${seen ? 'go' : ''}`}>
      <span className="seg1" />
      <span className={`rz-pill ${tone}`}>{children}</span>
      <span className="seg2" />
    </div>
  )
}

/** Paragraph whose words light up as you scroll (scroll-scrubbed). Wrap phrases in [[...]] to highlight in blue. */
export function Scrub({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useScrollVar(ref, 'enter')
  const words: { w: string; hi: boolean }[] = []
  text.split(/(\[\[.*?\]\])/).forEach((chunk) => {
    const hi = chunk.startsWith('[[')
    chunk.replace(/^\[\[|\]\]$/g, '').split(' ').filter(Boolean).forEach((w) => words.push({ w, hi }))
  })
  return (
    <p ref={ref} className="scrub">
      {words.map((x, i) => (
        <span key={i} className={`sw ${x.hi ? 'hi' : ''}`} style={{ ['--i' as string]: i, ['--n' as string]: words.length }}>
          {x.w}{' '}
        </span>
      ))}
    </p>
  )
}

export function Donut({ pct, center, label }: { pct: number; center: string; label: string }) {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.5 })
  const c = 2 * Math.PI * 62
  return (
    <div ref={ref} className="rz-stat">
      <div className="donut">
        <svg viewBox="0 0 150 150"><circle className="tr" cx="75" cy="75" r="62" fill="none" strokeWidth="14" /><circle className="va" cx="75" cy="75" r="62" fill="none" strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={seen ? c * (1 - pct / 100) : c} /></svg>
        <b>{center}</b>
      </div>
      <div className="lbl">{label}</div>
    </div>
  )
}

export function CountStat({ value, suffix = '', label, dots }: { value: number; suffix?: string; label: string; dots?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.5 })
  const n = useCountUp(value, seen)
  return (
    <div ref={ref} className="rz-stat">
      <div className="big" style={{ fontSize: '3.4rem', marginTop: '1.2rem' }}>{Math.round(n)}{suffix}</div>
      {dots ? (
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: dots }, (_, i) => <i key={i} style={{ width: 14, height: 14, borderRadius: 4, background: seen ? ['#ff5c5c','#ff8a4c','#ffb020','#d6c43a','#7bd88f','#34d399','#4dc3d8','#8fa8ff'][i % 8] : '#262626', transition: `background .5s var(--ease) ${i * 110}ms` }} />)}
        </div>
      ) : <div />}
      <div className="lbl">{label}</div>
    </div>
  )
}
