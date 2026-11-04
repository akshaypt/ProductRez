import { useEffect, useRef, useState, type RefObject } from 'react'
import { reviewBullet, scoreResume, type ScoreReport } from '@scoring'
import { Icon } from '../Icon'

/* ------------------------------------------------------------------ demo resume (illustrative) */
export const DEMO: { weak: string; strong: string }[] = [
  { weak: 'Responsible for managing the product backlog and working with engineers', strong: 'Prioritised a 140-item backlog across 3 squads, cutting average cycle time from 21 to 13 days' },
  { weak: 'Helped improve onboarding for new users', strong: 'Redesigned onboarding after 30 user interviews, lifting 7-day activation from 38% to 52%' },
  { weak: 'Worked on pricing page changes', strong: 'Ran 6 pricing-page A/B tests, raising trial-to-paid conversion 14% (from 4.1% to 4.7%)' },
  { weak: 'Participated in launch planning with marketing and sales', strong: 'Led go-to-market for the Teams plan with Sales and Marketing, reaching $1.2M ARR in two quarters' },
]
export const demoText = (bullets: string[]) => `Jordan Lee
Product Manager
jordan.lee@example.com | +1 415 555 0100 | San Francisco, CA | linkedin.com/in/jordanlee

Summary
Product manager with four years in B2B SaaS, focused on onboarding, pricing and growth. Comfortable working across engineering, design, sales and marketing.

Experience
Product Manager, Acme Cloud    San Francisco, CA    Jan 2022 - Present
${bullets.map((b) => `• ${b}`).join('\n')}

Associate Product Manager, Beta Systems    Austin, TX    Jul 2020 - Dec 2021
• Wrote requirements and acceptance criteria for the reporting module, shipped to 2,400 customers
• Analysed funnel data in SQL and Amplitude to find the three largest drop-offs in signup, reducing abandonment 9%
• Interviewed 18 customers to validate the roadmap and cut two low-value features

Education
B.S. Business Administration, State University    2016 - 2020

Skills
Product: Roadmapping, Discovery, Experimentation, Pricing · Tools: SQL, Amplitude, Jira, Figma`

export function useDemoReport(fixed: boolean[]): { bullets: string[]; report: ScoreReport } {
  const bullets = DEMO.map((d, i) => (fixed[i] ? d.strong : d.weak))
  const [report, setReport] = useState(() => scoreResume({ text: demoText(bullets), targetLevel: 'pm' }, new Date('2026-11-04')))
  useEffect(() => setReport(scoreResume({ text: demoText(bullets), targetLevel: 'pm' }, new Date('2026-11-04'))), [fixed.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  return { bullets, report }
}
export const impactColor = (n: number) => (n === 3 ? 'var(--green)' : n === 2 ? 'var(--text-2)' : n === 1 ? 'var(--text-3)' : 'var(--surface-3)')
export const bulletImpact = (t: string) => reviewBullet(t, 'experience', '', true).impact

export function Tickets({ report, max = 3 }: { report: ScoreReport; max?: number }) {
  return (
    <div className="aw-tk">
      {report.findings.slice(0, max).map((f) => (
        <div key={f.id}><span className={`chip ${f.priority.toLowerCase()}`}>{f.priority}</span><span>{f.title}</span></div>
      ))}
      {report.findings.length === 0 && <div><span className="chip good">OK</span><span>No blockers remaining</span></div>}
    </div>
  )
}

/* ------------------------------------------------------------------ jobs + path (sample content) */
export const JOBS = [
  ['Senior Product Manager, Payments', 'Lumen Pay', 'San Francisco, CA', 'US', 'Today'],
  ['Product Manager, AI Assistants', 'Tandem AI', 'Remote, United States', 'US', 'Today'],
  ['Associate Product Manager', 'Chaiwala Commerce', 'Gurugram, India', 'IN', 'Today'],
  ['Product Manager, Fintech Lending', 'Kiln Finance', 'Bengaluru, India', 'IN', 'Yesterday'],
  ['Group Product Manager, Platform', 'Halcyon Cloud', 'New York, NY', 'US', 'Yesterday'],
  ['Senior Product Manager, Payments', 'Rupee Rail', 'Mumbai, India', 'IN', 'Yesterday'],
] as const

export function JobsList({ country, saved, onSave, limit = 5 }: { country: 'all' | 'US' | 'IN'; saved: Set<string>; onSave: (id: string) => void; limit?: number }) {
  const rows = JOBS.filter((j) => country === 'all' || j[3] === country).slice(0, limit)
  return (
    <div key={country}>
      {rows.map((j, i) => (
        <div className="aw-job" key={j[0] + j[1]} style={{ ['--i' as string]: i }}>
          <div className="aw-tile">{j[1][0]}</div>
          <div><div className="t">{j[0]}</div><small>{j[1]} · {j[2]}</small></div>
          <span className={`chip ${j[4] === 'Today' ? 'accent' : ''}`}>{j[4]}</span>
          <button className={`tag ${saved.has(j[0] + j[1]) ? 'on' : ''}`} data-aw={i === 0 ? 'save0' : undefined} onClick={() => onSave(j[0] + j[1])} style={{ cursor: 'pointer' }}>{saved.has(j[0] + j[1]) ? 'Saved' : 'Save'}</button>
        </div>
      ))}
    </div>
  )
}

export const STEPS = ['Understand the PM job', 'Learn to talk to customers', 'Craft your transition story', 'Get data-literate (SQL)', 'Run a mini product project', 'Practise interviews']
export function PathList({ done, onToggle }: { done: boolean[]; onToggle: (i: number) => void }) {
  return (
    <div>
      {STEPS.map((s, i) => (
        <div className="aw-step" key={s} data-aw={`s${i}`} onClick={() => onToggle(i)} role="checkbox" aria-checked={done[i]} tabIndex={0} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onToggle(i)}>
          <span className={`aw-check ${done[i] ? 'on' : ''}`}>{done[i] && <Icon name="check" size={12} strokeWidth={3.2} />}</span>
          <span style={{ opacity: done[i] ? 0.5 : 1, textDecoration: done[i] ? 'line-through' : 'none', transition: 'opacity .3s' }}>{s}</span>
          <span className="mono" style={{ color: 'var(--text-3)' }}>W{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ scripted cursor */
export interface CursorApi { move: (el: Element | null) => void; press: () => void; hide: () => void }
export function useCursor(screen: RefObject<HTMLElement | null>) {
  const [c, setC] = useState({ x: 40, y: 40, vis: false, down: false })
  const api: CursorApi = {
    move: (el) => {
      const s = screen.current
      if (!el || !s) return
      const r = el.getBoundingClientRect()
      const b = s.getBoundingClientRect()
      setC((p) => ({ ...p, x: r.left - b.left + Math.min(r.width * 0.55, 60), y: r.top - b.top + r.height * 0.6, vis: true }))
    },
    press: () => {
      setC((p) => ({ ...p, down: true }))
      setTimeout(() => setC((p) => ({ ...p, down: false })), 280)
    },
    hide: () => setC((p) => ({ ...p, vis: false })),
  }
  return { state: c, api }
}

export function CursorEl({ x, y, vis, down }: { x: number; y: number; vis: boolean; down: boolean }) {
  return (
    <div className={`cursor ${vis ? 'vis' : ''} ${down ? 'down' : ''}`} style={{ transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.8L10.5 19z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    </div>
  )
}

/** Runs a timed script of cursor moves + clicks. Each step: move at t-700ms, press+run at t. */
export function useScript(root: RefObject<HTMLElement | null>, cursor: CursorApi, steps: { t: number; sel?: string; run: () => void }[], active: boolean, stopRef: RefObject<boolean>) {
  useEffect(() => {
    if (!active) return
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((s) => {
      if (s.sel) timers.push(setTimeout(() => !stopRef.current && cursor.move(root.current?.querySelector(`[data-aw="${s.sel}"]`) ?? null), Math.max(0, s.t - 700)))
      timers.push(setTimeout(() => { if (stopRef.current) return; if (s.sel) cursor.press(); s.run() }, s.t))
    })
    const last = Math.max(...steps.map((s) => s.t))
    timers.push(setTimeout(() => cursor.hide(), last + 900))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
