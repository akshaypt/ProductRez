import { useEffect, useState } from 'react'
import { fmtGain, isWeakBullet } from '../lib/bullets'
import type { BulletFlag, ScoreReport } from '@scoring'
import { Icon } from './Icon'
import { SemiGauge } from './SemiGauge'
import { cx } from '../lib/util'
import { renderScoreCard } from '../lib/shareCard'
import { useApp } from '../state/app'

const FLAG_LABEL: Record<string, string> = {
  'no-metric': 'claims a result, no number',
  'weak-verb': 'weak opener',
  'no-verb': 'no action verb',
  'too-long': 'too long',
  'too-short': 'too short',
  'first-person': 'first person',
  passive: 'passive',
  buzzword: 'buzzword',
  'no-baseline-delta': 'number has no baseline',
  'missing-guardrail': 'no quality guardrail',
  'activity-only': 'activity, not outcome',
}

const barColor = (s: number) => (s >= 80 ? 'var(--green)' : s >= 62 ? 'var(--info)' : s >= 42 ? 'var(--amber)' : 'var(--red)')
const gradeColor = { ship: 'var(--green)', beta: 'var(--info)', alpha: 'var(--amber)', prototype: 'var(--red)' }

export function useCountUp(target: number, ms = 1100) {
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
  return (
    <div className="gauge" style={{ ['--gc' as string]: color }} role="img" aria-label={`Overall score ${value} out of 100`}>
      <div className="lbl">Overall score</div>
      <div className="num">
        <b>{n}</b>
        <small>/ 100</small>
      </div>
      <div className="track"><div className="val" style={{ width: on ? `${value}%` : '0%' }} /></div>
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
  const { toast } = useApp()
  const color = gradeColor[report.grade]
  const share = async () => {
    try {
      const blob = await renderScoreCard(report)
      const file = new File([blob], 'productrez-score.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My PM resume score: ${report.overall}/100` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'productrez-score.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        toast('Score card saved. It shows scores only: no name, no resume text.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Could not create the card', 'err')
    }
  }
  const potentialRaw = Math.min(100 - report.overall, report.findings.reduce((s, f) => s + f.gain, 0))
  const potential = Math.round(potentialRaw)
  const counts = { P0: 0, P1: 0, P2: 0 }
  report.findings.forEach((f) => counts[f.priority]++)
  const weakest = [...report.bullets].filter(isWeakBullet)

  return (
    <div className="report" data-testid="report">
      <aside className="summary">
        <div className="card" style={{ ['--gc' as string]: color }}>
          <div className="gauge" role="img" aria-label={`Overall score ${report.overall} out of 100`}><SemiGauge value={report.overall} size={250} decorative /></div>
          <div className="stamp" style={{ color }}>{report.gradeLabel}</div>
          <p style={{ marginTop: 6, fontSize: '0.93rem' }}>{report.headline}</p>
          <p className="faint" style={{ fontSize: '0.82rem', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>{report.level.note}</p>
        </div>
        <div className="card stack" style={{ gap: 14 }}>
          <div className="label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', color: 'var(--text-3)' }}>Breakdown</div>
          {report.dimensions.map((d) => (
            <div className="dim" key={d.id}>
              <div className="top">
                <span>{d.label}</span>
                <span className="mono">{d.score}</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={d.score} aria-valuemin={0} aria-valuemax={100} aria-label={d.label}>
                <i style={{ width: `${d.score}%`, background: barColor(d.score) }} />
              </div>
            </div>
          ))}
        </div>
        {report.strengths.length > 0 && (
          <div className="card soft">
            <h3 style={{ marginBottom: 8 }}>What’s working</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 4, fontSize: '0.9rem', color: 'var(--text-2)' }}>
              {report.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {onFix && (
          <button className="btn lg block" onClick={onFix}>
            <Icon name="pen" size={17} /> {fixLabel}
          </button>
        )}
        <button className="btn ghost block" onClick={share}>
          <Icon name="share" size={16} /> Share score card
        </button>
      </aside>

      <section className="report-main">
        <div className="row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="chip p0">{counts.P0} P0</span>
            <span className="chip p1">{counts.P1} P1</span>
            <span className="chip p2">{counts.P2} P2</span>
          </div>
          {potentialRaw >= 0.5 && <span className="gain" title="An estimate of how far the overall score can move if you fix everything listed. It is a ceiling, not a promise.">About {fmtGain(potentialRaw)} points possible</span>}
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
            {report.findings.length === 0 ? (
              <div className="card soft">
                <b>Nothing to fix.</b> This resume clears every check we run. Tailor it to each job description and apply.
              </div>
            ) : (
              <div className="tickets">
                {report.findings.map((f) => (
                  <div key={f.id} className={cx('ticket', f.priority.toLowerCase())} style={{ ['--i' as string]: Math.min(report.findings.indexOf(f), 10) }}>
                    <button aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}>
                      <span className={`chip ${f.priority.toLowerCase()}`}>{f.id.toUpperCase()}</span>
                      <span className="t">{f.title}</span>
                      <span className="gain" title="Estimated change to your overall score">{fmtGain(f.gain)}</span>
                      <Icon name="chev" size={14} style={{ transform: open === f.id ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--text-3)' }} />
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
                              {(f.evidenceBullets?.length ? f.evidenceBullets : f.evidence.map((e) => ({ ref: '', text: e }))).map((e, i) => (
                                <div className="ev" key={i}>
                                  {e.ref && <div className="faint" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 2 }}>{e.ref}</div>}
                                  “{e.text}”
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
          </div>
        )}

        {tab === 'bullets' && (
          <div role="tabpanel" className="card">
            <p className="muted" style={{ marginBottom: 6, fontSize: '0.9rem' }}>
              Each bullet rated for impact: <b>3</b> number + outcome + change, <b>2</b> has a number, <b>1</b> describes scope or an outcome, <b>0</b> activity only. Not every bullet needs a number, and bullets about what you built or led are not marked down for lacking one. {weakest.length > 0 ? `${weakest.length} ${weakest.length === 1 ? 'needs' : 'need'} work.` : 'None need work.'}
            </p>
            {report.bullets.map((b, i) => (
              <div key={i} className="bul">
                <span className={`imp l${b.impact}`} title={`Impact ${b.impact} of 3`}>{b.impact}</span>
                <div>
                  <div className="ctx">{b.ref ?? b.context}</div>
                  <div>{b.text}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <Meter level={b.impact} />
                    {b.flags.map((fl) => (
                      <span key={fl} className="chip bad">{FLAG_LABEL[fl] ?? fl}</span>
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
            <p className="muted" style={{ fontSize: '0.92rem' }}>PM interview loops test eight competencies. A number lights up when your bullets provide evidence for it.</p>
            <div className="skill-grid">
              {report.competencies.map((c) => (
                <div key={c.id} className={cx('skill', c.hits > 0 && 'on')}>
                  <span className="n">{c.hits}</span>
                  <b style={{ fontSize: '0.88rem' }}>{c.label}</b>
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
            <div className="card">
              <h3>Keywords from the job description you’re missing</h3>
              <p className="muted" style={{ margin: '6px 0 12px', fontSize: '0.9rem' }}>Only add these where they’re true, and inside real bullets. Stuffing hurts you with humans.</p>
              <div className="kw">
                {report.keywordMatch.missing.length === 0 && <span className="chip good">All key terms present</span>}
                {report.keywordMatch.missing.map((k) => <span key={k} className="chip bad">{k}</span>)}
              </div>
            </div>
            <div className="card">
              <h3>Already covered</h3>
              <div className="kw" style={{ marginTop: 12 }}>
                {report.keywordMatch.matched.map((k) => <span key={k} className="chip good">{k}</span>)}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
