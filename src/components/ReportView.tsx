import { useEffect, useState } from 'react'
import type { BulletFlag, ScoreReport } from '@scoring'
import { Icon } from './Icon'
import { Radar } from './Radar'
import { cx } from '../lib/util'

const FLAG_LABEL: Record<BulletFlag, string> = {
  'no-metric': 'no metric',
  'weak-verb': 'weak opener',
  'no-verb': 'no action verb',
  'too-long': 'too long',
  'too-short': 'too short',
  'first-person': 'first person',
  passive: 'passive',
  buzzword: 'buzzword',
}

const barColor = (s: number) => (s >= 80 ? 'var(--green)' : s >= 62 ? '#6cc99a' : s >= 42 ? 'var(--amber)' : 'var(--red)')
const gradeColor = { ship: 'var(--green)', beta: 'var(--brand)', alpha: 'var(--amber)', prototype: 'var(--red)' }

export function useCountUp(target: number, ms = 1200) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(target)
      return
    }
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

export function Gauge({ value, color }: { value: number; color: string }) {
  const n = useCountUp(value)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60)
    return () => clearTimeout(t)
  }, [])
  const r = 88
  const c = 2 * Math.PI * r
  return (
    <div className="gauge" style={{ ['--gc' as string]: color }} role="img" aria-label={`Overall score ${value} out of 100`}>
      <svg viewBox="0 0 200 200">
        <circle className="track" cx="100" cy="100" r={r} fill="none" strokeWidth="18" />
        <circle className="val" cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={on ? c * (1 - value / 100) : c} />
      </svg>
      <div className="num">
        <div>
          <b>{n}</b>
          <small>/ 100</small>
        </div>
      </div>
    </div>
  )
}

function Meter({ level }: { level: 0 | 1 | 2 | 3 }) {
  return (
    <span className={`meter l${level}`} aria-label={`impact ${level} of 3`}>
      <i />
      <i />
      <i />
    </span>
  )
}

export function ReportView({ report, onFix, fixLabel = 'Fix this in the Writer' }: { report: ScoreReport; onFix?: () => void; fixLabel?: string }) {
  const [tab, setTab] = useState<'backlog' | 'bullets' | 'craft' | 'match'>('backlog')
  const [open, setOpen] = useState<string | null>(report.findings[0]?.id ?? null)
  const [hot, setHot] = useState<string | null>(null)
  const color = gradeColor[report.grade]
  const potential = Math.min(100 - report.overall, Math.round(report.findings.reduce((s, f) => s + f.gain, 0)))
  const counts = { P0: 0, P1: 0, P2: 0 }
  report.findings.forEach((f) => counts[f.priority]++)
  const weakest = [...report.bullets].filter((b) => b.impact <= 1)

  return (
    <div className="report" data-testid="report">
      <aside className="summary">
        <div className="card">
          <Gauge value={report.overall} color={color} />
          <div className="stamp">
            <span className="sticker" style={{ color }}>
              {report.gradeLabel}
            </span>
          </div>
          <p style={{ marginTop: 14, fontWeight: 600, textAlign: 'center' }}>{report.headline}</p>
          <p className="faint" style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 6 }}>
            {report.level.note}
          </p>
        </div>
        <div className="card flat stack" style={{ gap: 14 }}>
          <Radar dims={report.dimensions} hot={hot} onHot={setHot} />
          {report.dimensions.map((d) => (
            <div className={`dim ${hot === d.id ? 'hot' : ''}`} key={d.id} onMouseEnter={() => setHot(d.id)} onMouseLeave={() => setHot(null)}>
              <div className="top">
                <span>{d.label}</span>
                <span className="mono">{d.score}</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={d.score} aria-valuemin={0} aria-valuemax={100} aria-label={d.label}>
                <i style={{ width: `${d.score}%`, background: barColor(d.score) }} />
              </div>
              <span className="faint" style={{ fontSize: '0.78rem' }}>
                {d.verdict}
              </span>
            </div>
          ))}
        </div>
        {report.strengths.length > 0 && (
          <div className="card flat soft">
            <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>What’s working</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 4, fontSize: '0.92rem' }}>
              {report.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {onFix && (
          <button className="btn lg block" onClick={onFix}>
            <Icon name="pen" size={18} /> {fixLabel}
          </button>
        )}
      </aside>

      <section>
        <div className="row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
          <div className="row">
            <span className="chip p0">{counts.P0} P0</span>
            <span className="chip p1">{counts.P1} P1</span>
            <span className="chip p2">{counts.P2} P2</span>
          </div>
          {potential > 0 && <span className="gain">+{potential} pts available</span>}
        </div>
        <div className="tabs" role="tablist" aria-label="Report sections">
          {(
            [
              ['backlog', `Fix backlog (${report.findings.length})`],
              ['bullets', `Bullet X-ray (${report.stats.bullets})`],
              ['craft', 'PM competencies'],
              ...(report.keywordMatch ? [['match', `Job match ${report.keywordMatch.percent}%`]] : []),
            ] as [typeof tab, string][]
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'backlog' && (
          <div role="tabpanel">
            {report.findings.length === 0 && (
              <div className="card soft">
                <b>Nothing to fix.</b> This resume clears every check we run. Tailor it to each job description and apply.
              </div>
            )}
            {report.findings.map((f) => (
              <div key={f.id} className={cx('ticket', f.priority.toLowerCase())}>
                <button aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}>
                  <span className={`chip ${f.priority.toLowerCase()}`}>{f.id.toUpperCase()}</span>
                  <span className="t">{f.title}</span>
                  <span className="gain">+{f.gain}</span>
                </button>
                {open === f.id && (
                  <div className="body">
                    <div>
                      <h4>Why it matters</h4>
                      {f.why}
                    </div>
                    <div>
                      <h4>How to fix it</h4>
                      {f.fix}
                    </div>
                    {f.evidence.length > 0 && (
                      <div>
                        <h4>From your resume</h4>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {f.evidence.map((e, i) => (
                            <div className="ev" key={i}>
                              “{e}”
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'bullets' && (
          <div role="tabpanel" className="card flat">
            <p className="muted" style={{ marginBottom: 6 }}>
              Every bullet rated for impact: <b>3</b> number + outcome + change, <b>2</b> has a number, <b>1</b> mentions an outcome, <b>0</b> activity only. {weakest.length > 0 && `${weakest.length} need work.`}
            </p>
            {report.bullets.map((b, i) => (
              <div key={i} className={`bul s${b.impact}`}>
                <div className="rail-c" />
                <div>
                  <div className="ctx">{b.context}</div>
                  <div>{b.text}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <Meter level={b.impact} />
                    {b.flags.map((fl) => (
                      <span key={fl} className="chip bad">
                        {FLAG_LABEL[fl]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {report.bullets.length === 0 && <p className="muted">No bullets found. Make sure your experience uses bullet points.</p>}
          </div>
        )}

        {tab === 'craft' && (
          <div role="tabpanel" className="stack">
            <p className="muted">PM interview loops test eight competencies. These tiles light up when your bullets provide evidence for them.</p>
            <div className="skill-grid">
              {report.competencies.map((c) => (
                <div key={c.id} className={cx('skill', c.hits > 0 && 'on')}>
                  <span className="n">{c.hits}</span>
                  <b style={{ fontSize: '0.9rem' }}>{c.label}</b>
                  <span className="faint" style={{ fontSize: '0.75rem' }}>
                    {c.hits > 0 ? `${c.hits} bullet${c.hits > 1 ? 's' : ''}` : c.covered ? 'only in summary/skills' : 'no evidence'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'match' && report.keywordMatch && (
          <div role="tabpanel" className="stack">
            <div className="card flat">
              <h3>Keywords in the job description you’re missing</h3>
              <p className="muted" style={{ margin: '6px 0 10px' }}>
                Only add these where they’re true, and inside real bullets. Stuffing hurts you with humans.
              </p>
              <div className="kw">
                {report.keywordMatch.missing.length === 0 && <span className="chip good">All key terms present</span>}
                {report.keywordMatch.missing.map((k) => (
                  <span key={k} className="chip bad">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="card flat">
              <h3>Already covered</h3>
              <div className="kw" style={{ marginTop: 10 }}>
                {report.keywordMatch.matched.map((k) => (
                  <span key={k} className="chip good">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
