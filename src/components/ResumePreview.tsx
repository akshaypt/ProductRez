import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { ResumeData } from '@scoring'
import { templateById } from '@latex'
import { reviewBullet } from '@scoring'

interface Props {
  data: ResumeData
  template: string
  accent: string
  paper: 'a4' | 'letter'
  fontSize: 10 | 11
  boldMetrics?: boolean
  /** Fit the page to the container width */
  fit?: boolean
  width?: number
  onPages?: (pages: number, fill: number) => void
  /** Hatch + badge each bullet by impact (0 to 3) */
  xray?: boolean
  showBreaks?: boolean
}

const PAGE = { letter: { w: 816, h: 1056 }, a4: { w: 794, h: 1123 } }
const METRIC = /([$₹€£]\s?\d[\d,.]*\s?(?:[kKmMbB]\b|mn\b|bn\b|cr\b|crore\b|lakhs?\b)?|\d[\d,.]*\s?(?:%|x\b|×))/g

function rich(text: string, auto: boolean) {
  return text.split('**').map((seg, i) => {
    if (i % 2 === 1) return <strong key={i}>{seg}</strong>
    if (!auto) return seg
    return seg.split(METRIC).map((p, j) => (j % 2 === 1 ? <strong key={`${i}-${j}`}>{p}</strong> : p))
  })
}

const dates = (s: string, e: string) => [s, e].filter(Boolean).join(' – ')
const has = (s: string) => !!s && s.trim().length > 0

/** HTML twin of the LaTeX templates. Close, not pixel-identical: the .tex is the source of truth. */
export function ResumePreview({ data, template, accent, paper, fontSize, boldMetrics = false, fit = true, width, onPages, showBreaks = true, xray = false }: Props) {
  const meta = templateById(template)
  const page = PAGE[paper]
  const wrap = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const [contentH, setContentH] = useState(page.h)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const calc = () => setScale(width ? width / page.w : Math.min(1, el.clientWidth / page.w))
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [page.w, width])

  useEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () => {
      const kids = Array.from(el.children).filter((c) => !c.classList.contains('pb')) as HTMLElement[]
      const last = kids[kids.length - 1]
      const natural = last ? last.offsetTop + last.offsetHeight + parseFloat(getComputedStyle(el).paddingBottom || '0') : el.scrollHeight
      setContentH(Math.max(el.scrollHeight, natural))
      const pages = Math.max(1, Math.ceil((natural - 4) / page.h))
      onPages?.(pages, Math.min(1, Math.max(0, (natural - (pages - 1) * page.h) / page.h)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data, template, paper, fontSize, accent, page.h, onPages])

  const base = fontSize === 11 ? 14.6 : 13.3
  const pad = { ledger: '0.55in 0.65in', roadmap: '0.55in 0.7in', sprint: '0.4in 0.5in', northstar: '0.6in 0.75in', launchpad: '0.5in 0.65in', ink: '0.6in 0.8in' }[meta.id] ?? '0.55in 0.65in'
  const a = `#${accent}`
  const style: CSSProperties = { width: page.w, minHeight: page.h, padding: pad, fontFamily: meta.previewFont, fontSize: base * (meta.dense ? 0.97 : 1), lineHeight: meta.dense ? 1.22 : 1.3 }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const common: CSSProperties = { marginTop: meta.dense ? 7 : 11, marginBottom: 4 }
    if (meta.headingStyle === 'rule')
      return (
        <div style={common}>
          <div style={{ fontVariant: meta.id === 'ledger' ? 'small-caps' : undefined, textTransform: meta.id === 'sprint' ? 'uppercase' : undefined, fontWeight: 700, fontSize: meta.id === 'sprint' ? '0.8em' : '1.15em', color: meta.id === 'sprint' ? a : '#111', borderBottom: `1px solid ${meta.id === 'sprint' ? a : '#111'}`, paddingBottom: 1 }}>{title}</div>
          <div style={{ marginTop: 4 }}>{children}</div>
        </div>
      )
    if (meta.headingStyle === 'caps')
      return (
        <div style={common}>
          <div style={{ textTransform: 'uppercase', fontWeight: 700, color: a, borderBottom: `1.5px solid ${a}`, paddingBottom: 1 }}>{title}</div>
          <div style={{ marginTop: 4 }}>{children}</div>
        </div>
      )
    if (meta.headingStyle === 'center')
      return (
        <div style={common}>
          <div style={{ textAlign: 'center', fontVariant: 'small-caps', fontWeight: 700, color: a, fontSize: '1.15em' }}>{title}</div>
          <div style={{ borderTop: '0.5px solid #111', margin: '2px 0 4px' }} />
          {children}
        </div>
      )
    if (meta.headingStyle === 'bar')
      return (
        <div style={common}>
          <div style={{ background: a, color: '#fff', fontWeight: 700, textTransform: 'uppercase', padding: '1px 5px' }}>{title}</div>
          <div style={{ marginTop: 4 }}>{children}</div>
        </div>
      )
    return (
      <div style={common}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{title}</div>
        <div style={{ marginTop: 2 }}>{children}</div>
      </div>
    )
  }

  const Bullets = ({ items }: { items: string[] }) => {
    const rows = items.filter(has)
    if (!rows.length) return null
    return (
      <ul style={{ margin: meta.dense ? '1px 0 3px' : '2px 0 4px', paddingLeft: '1.15em', listStyle: 'disc' }}>
        {rows.map((b, i) => (
          <li key={i} className={xray ? `xr xr${reviewBullet(b.replace(/\*\*/g, ''), 'experience', '', true).impact}` : undefined} style={{ marginBottom: meta.dense ? 0 : 1.5 }}>
            {rich(b, boldMetrics)}
            {xray && <i className="xrb" title="Impact 0 to 3">{reviewBullet(b.replace(/\*\*/g, ''), 'experience', '', true).impact}</i>}
          </li>
        ))}
      </ul>
    )
  }

  const Role = ({ l1, r1, l2, r2 }: { l1: string; r1: string; l2?: string; r2?: string }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <b>{l1}</b>
        <span style={{ fontSize: '0.92em', whiteSpace: 'nowrap' }}>{r1}</span>
      </div>
      {(has(l2 ?? '') || has(r2 ?? '')) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontStyle: meta.id === 'launchpad' ? 'normal' : 'italic', color: meta.id === 'launchpad' ? a : meta.id === 'roadmap' ? '#444' : undefined, fontWeight: meta.id === 'launchpad' ? 700 : undefined, fontSize: '0.95em' }}>
          <span>{l2}</span>
          <span>{r2}</span>
        </div>
      )}
    </div>
  )

  const b = data.basics
  const contact = [b.email, b.phone, b.location, b.linkedin, b.website].filter(has).join('  |  ')
  const center = meta.align === 'center'
  const blocks: Record<string, React.ReactNode> = {
    summary: has(data.summary) && (
      <Section title="Summary" key="summary">
        <div>{rich(data.summary, boldMetrics)}</div>
      </Section>
    ),
    experience: data.experience.some((x) => has(x.company) || has(x.title) || x.bullets.some(has)) && (
      <Section title="Experience" key="experience">
        {data.experience
          .filter((x) => has(x.company) || has(x.title) || x.bullets.some(has))
          .map((x) => (
            <div key={x.id} style={{ marginBottom: 5 }}>
              {has(x.company) ? <Role l1={x.company} r1={dates(x.start, x.end)} l2={x.title} r2={x.location} /> : <Role l1={x.title} r1={dates(x.start, x.end)} />}
              <Bullets items={x.bullets} />
            </div>
          ))}
      </Section>
    ),
    projects: data.projects.some((p) => has(p.name) || p.bullets.some(has)) && (
      <Section title="Projects" key="projects">
        {data.projects
          .filter((p) => has(p.name) || p.bullets.some(has))
          .map((p) => (
            <div key={p.id} style={{ marginBottom: 5 }}>
              <Role l1={p.name + (has(p.tag) ? ` | ${p.tag}` : '')} r1={p.link} />
              <Bullets items={p.bullets} />
            </div>
          ))}
      </Section>
    ),
    education: data.education.some((e) => has(e.school) || has(e.degree)) && (
      <Section title="Education" key="education">
        {data.education
          .filter((e) => has(e.school) || has(e.degree))
          .map((e) => (
            <div key={e.id} style={{ marginBottom: 4 }}>
              <Role l1={e.school} r1={dates(e.start, e.end)} l2={e.degree} r2={e.location} />
              <Bullets items={e.details.split(/[;\n]/).map((s) => s.trim())} />
            </div>
          ))}
      </Section>
    ),
    skills: data.skills.some((s) => has(s.items)) && (
      <Section title="Skills" key="skills">
        {data.skills
          .filter((s) => has(s.items))
          .map((s) => (
            <div key={s.id}>
              <b>{s.label || 'Skills'}:</b> {s.items}
            </div>
          ))}
      </Section>
    ),
    extras: data.extras.some((x) => x.items.some(has)) && (
      <>
        {data.extras
          .filter((x) => x.items.some(has))
          .map((x) => (
            <Section title={x.title || 'Additional'} key={x.id}>
              <Bullets items={x.items} />
            </Section>
          ))}
      </>
    ),
  }

  const pages = Math.max(1, Math.ceil((contentH - 4) / page.h))
  return (
    <div ref={wrap} style={{ width: '100%' }}>
      <div style={{ width: page.w * scale, height: Math.max(page.h, contentH) * scale, position: 'relative' }}>
        <div className="paper-scale" style={{ transform: `scale(${fit ? scale : 1})` }}>
          <div ref={inner} className="paper" style={style} data-testid="resume-paper">
            <div style={{ textAlign: center ? 'center' : 'left' }}>
              <div style={{ fontSize: { ledger: '2.1em', roadmap: '2.3em', sprint: '1.8em', northstar: '2.1em', launchpad: '2.3em', ink: '1.8em' }[meta.id], fontWeight: meta.id === 'northstar' ? 400 : 800, fontVariant: meta.id === 'ledger' || meta.id === 'northstar' ? 'small-caps' : undefined, color: meta.id === 'roadmap' ? a : '#111', lineHeight: 1.1, fontFamily: meta.previewFont }}>{b.name || 'Your Name'}</div>
              {has(b.headline) && <div style={{ fontStyle: meta.id === 'northstar' || meta.id === 'ink' ? 'italic' : 'normal', fontWeight: meta.id === 'launchpad' || meta.id === 'sprint' ? 700 : 400, color: meta.id === 'launchpad' || meta.id === 'sprint' ? a : '#444', marginTop: 2, fontSize: '1.05em' }}>{b.headline}</div>}
              <div style={{ fontSize: '0.88em', marginTop: 3, color: '#222', wordBreak: 'break-word' }}>{contact}</div>
              {meta.id === 'northstar' && <div style={{ borderTop: `1px solid ${a}`, marginTop: 6 }} />}
            </div>
            {meta.order.map((k) => blocks[k])}
            {showBreaks &&
              Array.from({ length: pages - 1 }, (_, i) => (
                <div className="pb" key={i} style={{ top: (i + 1) * page.h }} />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
