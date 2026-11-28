import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../state/app'
import { parseAmount } from '../../lib/pay'
import type { ScoreReport } from '@ats'
import { analysisStore } from '../../lib/g/store'
import type { Analysis } from '../../lib/g/analyze'
import { Ico } from './icons'
import { fmtGain, isWeakBullet } from '../../lib/bullets'

type V = 'd' | 'm'

const ARC = 314

function Card({ v, title, badge, children, cls = '' }: { v: V; title: string; badge?: ReactNode; children: ReactNode; cls?: string }) {
  return v === 'd' ? (
    <div className={'bento-card ' + cls}><div className="b-head"><div className="b-title">{title}</div>{badge}</div>{children}</div>
  ) : (
    <div className="m-card"><div className="m-card-head"><span>{title}</span>{badge}</div>{children}</div>
  )
}

const tone = (n: number) => (n >= 85 ? 't-ok' : n >= 65 ? 't-warn' : 't-bad')
const fmt = (c: 'INR' | 'USD', n: number) => (c === 'INR' ? `₹${n}L` : `$${n}k`)
const FLAG: Record<string, string> = {
  'no-metric': 'Claims a result, no number', 'no-baseline-delta': 'Number has no baseline', 'weak-verb': 'Weak verb', 'no-verb': 'No action verb', 'too-long': 'Too long', 'too-short': 'Too short',
  'first-person': 'First person', passive: 'Passive voice', buzzword: 'Buzzword', 'missing-guardrail': 'No quality guardrail', 'activity-only': 'Activity only',
}

function Gauge({ v, score }: { v: V; score: number }) {
  const color = score >= 85 ? 'var(--emerald)' : 'var(--accent)'
  return v === 'd' ? (
    <div className="gauge-svg" style={{ margin: '0 auto 10px' }}>
      <svg viewBox="0 0 120 120"><circle className="gauge-bg" cx="60" cy="60" r="50" /><circle className="gauge-fg" cx="60" cy="60" r="50" style={{ stroke: color, strokeDashoffset: ARC - (ARC * score) / 100 }} /></svg>
      <div className="gauge-center"><span className="gauge-num" style={{ fontSize: 44, fontWeight: 900 }}>{score}</span></div>
    </div>
  ) : (
    <div className="gauge-mini">
      <svg viewBox="0 0 84 84"><circle className="gauge-bg" cx="42" cy="42" r="35" /><circle className="gauge-fg" cx="42" cy="42" r="35" style={{ stroke: color, strokeDashoffset: 220 - (220 * score) / 100 }} /></svg>
      <div className="gauge-num" style={{ fontSize: 28, fontWeight: 900, color }}>{score}</div>
    </div>
  )
}

function Unlocked({ v, a, go }: { v: V; a: Analysis; go: (p: string) => void }) {
  const r = a.report
  const [cur, setCur] = useState('')
  const [exp, setExp] = useState('')
  const [cmp, setCmp] = useState<ScoreReport['compensation'] | null>(null)
  const { api, user } = useApp()
  const saveTimer = useRef<number | undefined>(undefined)
  const run = async (c: string, e: string) => {
    const n = (s: string) => parseAmount(s) ?? undefined
    if (!n(c) && !n(e)) return setCmp(null)
    const eng = await import('@ats')
    setCmp(eng.compareSalaryExpectations(r, { currentSalary: n(c), expectedSalary: n(e) }))
  }
  // The same pay record the score page uses: shown again here, and saved to the account after a pause in typing.
  useEffect(() => {
    if (!api || !user) return
    api.getPay().then((p) => {
      if (!p || p.currency !== r.compensation.currency) return
      const c = p.current === null ? '' : String(p.current)
      const e = p.expected === null ? '' : String(p.expected)
      setCur(c); setExp(e); void run(c, e)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, user])
  const persist = (c: string, e: string) => {
    if (!api || !user) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      if ((c.trim() && parseAmount(c) === null) || (e.trim() && parseAmount(e) === null)) return
      api.savePay({ currency: r.compensation.currency, current: parseAmount(c), expected: parseAmount(e) }).catch(() => {})
    }, 700)
  }
  const C = cmp ?? r.compensation
  const weakAll = r.bullets.filter(isWeakBullet).sort((x, y) => x.impact - y.impact)
  const weak = weakAll.slice(0, 3)
  const s = r.marketStanding
  const unit = C.currency === 'INR' ? 'L' : 'k'
  const pos = r.careerAnalysis.positives[0], neg = r.careerAnalysis.negatives[0]
  return (
    <div className={v === 'd' ? 'locked-grid' : 'stack-m'} style={{ filter: 'none', pointerEvents: 'auto', userSelect: 'auto', display: 'grid', gap: v === 'd' ? 20 : 10 }}>
      <Card v={v} title="Fix backlog" badge={<span className={'g-tag ' + (r.findings.length ? 't-warn' : 't-ok')}>{r.findings.length ? `${r.findings.length} to fix` : 'Nothing to fix'}</span>}>
        {r.findings.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>No blocking issues found. Polish the weaker bullets below.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {r.findings.slice(0, 6).map((f) => (
            <div key={f.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--surface-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 700 }}><span><span className={'g-tag ' + (f.priority === 'P0' ? 't-bad' : f.priority === 'P1' ? 't-warn' : 't-acc')}>{f.priority}</span> {f.title}</span><span style={{ color: 'var(--emerald)', whiteSpace: 'nowrap' }} title="Estimated change to your overall score">{fmtGain(f.gain)} pts</span></div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>{f.fix}</p>
              {(f.evidenceBullets ?? []).slice(0, 2).map((e, i) => (
                <div key={i} style={{ marginTop: 6, paddingLeft: 8, borderLeft: '2px solid var(--border-strong)', fontSize: 12, color: 'var(--ink-2)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>{e.ref}</div>“{e.text.length > 150 ? e.text.slice(0, 149) + '…' : e.text}”
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card v={v} title="Line-by-Line Bullet X-Ray" badge={<span className="g-tag t-warn">{weakAll.length} to fix of {r.bullets.length}</span>}>
        {weak.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>No bullet needs fixing. Bullets that describe what you built or led are not marked down for lacking a number.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {weak.map((b, i) => (
            <div key={i} className="diff-box before" style={v === 'm' ? { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 } : undefined}>
              <div className="diff-label"><span style={{ color: 'var(--rose)' }}>{b.ref ?? b.context}</span><span className="g-tag t-bad">Impact {b.impact}/3</span></div>
              <p>"{b.text}"</p>
              <div className="pill-row">{b.flags.map((f) => <span key={f} className="g-tag t-warn">{FLAG[f] ?? f}</span>)}</div>
            </div>
          ))}
        </div>
        {r.trendingSkills.some((t) => t.status === 'missing') && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 10 }}><b>2026 skills not yet proven:</b> {r.trendingSkills.filter((t) => t.status === 'missing').map((t) => t.label).join(', ')}.</p>
        )}
      </Card>

      <Card v={v} title="Market Standing & Career Story" badge={<span className={'g-tag ' + tone(s.percentile)}>{s.percentile}th percentile</span>}>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 10 }}>{s.summary}</p>
        <div className={v === 'd' ? 'track-grid' : ''} style={v === 'm' ? { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 10 } : undefined}>
          {[...s.trackReadiness].sort((x, y) => y.readinessScore - x.readinessScore).slice(0, 4).map((t) => <div className="track-pill" key={t.track} style={v === 'm' ? { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, textAlign: 'center' } : undefined}><strong style={v === 'm' ? { display: 'block', fontSize: 13 } : undefined}>{t.readinessScore}%</strong><span style={v === 'm' ? { fontSize: 10.5, color: 'var(--muted)' } : undefined}>{t.label}</span></div>)}
        </div>
        <div className={v === 'd' ? 'story-split' : ''} style={v === 'm' ? { display: 'grid', gap: 6 } : undefined}>
          {pos && <div className="story-box" style={v === 'm' ? { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontSize: 11.5 } : undefined}><h4 style={{ color: 'var(--emerald)' }}>+ {pos.title}</h4>{pos.detail}</div>}
          {neg && <div className="story-box" style={v === 'm' ? { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontSize: 11.5 } : undefined}><h4 style={{ color: 'var(--amber)' }}>! {neg.title}</h4>{neg.detail}</div>}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 10 }}><b>Next lever:</b> {s.nextBracketLever}</p>
      </Card>

      <Card v={v} title="Salary & Expectation Check" badge={<span className="g-tag t-acc">{C.currency === 'INR' ? '₹ LPA' : '$k'}</span>}>
        <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Market band for {C.cohortLabel}: <b>{fmt(C.currency, C.marketBand.min)}–{fmt(C.currency, C.marketBand.max)}</b> (median {fmt(C.currency, C.marketBand.median)}). Your resume-calibrated range: <b>{fmt(C.currency, C.resumeCalibratedBand.low)}–{fmt(C.currency, C.resumeCalibratedBand.high)}</b>.</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{C.resumeCalibratedBand.quartileNote}</p>
        {r.contextUsed.isPmResume === false && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}><b>Entry-level PM pay.</b> Your resume does not show product experience yet, so this is not a benchmark for your current job.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {([['Current', cur, setCur], ['Expected', exp, setExp]] as const).map(([l, val, set]) => (
            <label key={l} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{l.toUpperCase()} ({unit === 'L' ? '₹ LPA' : '$k'})
              <input type="number" inputMode="decimal" min={0} className="auth-input" style={{ marginTop: 4, marginBottom: 0 }} value={val} onChange={(e) => { const nc = l === 'Current' ? e.target.value : cur; const ne = l === 'Expected' ? e.target.value : exp; set(e.target.value); void run(nc, ne); persist(nc, ne) }} />
            </label>
          ))}
        </div>
        {cmp?.comparison?.currentSalary && <p style={{ fontSize: 12.5, marginTop: 10 }}><span className="g-tag t-warn">{cmp.comparison.currentSalary.verdictLabel}</span> {cmp.comparison.currentSalary.summary}</p>}
        {cmp?.comparison?.expectedSalary && <p style={{ fontSize: 12.5, marginTop: 8 }}><span className="g-tag t-ok">{cmp.comparison.expectedSalary.verdictLabel}</span> {cmp.comparison.expectedSalary.summary} {cmp.comparison.expectedSalary.actionNote}</p>}
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>Salary never changes your 0–100 resume score. What you enter is saved to your account, and only you can see it.</p>
      </Card>

      <Card v={v} title="Early Access PM Jobs (≤72h)" badge={<span className="g-tag t-ok">Signed in</span>}>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>Fresh PM roles matched to your profile are inside the app.</p>
        <button type="button" className={v === 'd' ? 'g-btn btn-primary' : 'btn-main'} onClick={() => go('/jobs')}>See fresh jobs <Ico n="arrow" sm /></button>
      </Card>
    </div>
  )
}

export function ReportView({ v, a, signedIn, onSignIn, onBack, go }: { v: V; a: Analysis; signedIn: boolean; onSignIn: () => void; onBack: () => void; go: (p: string) => void }) {
  const r = a.report
  const dims = r.dimensions
  const tag = [a.picks.level, a.picks.track, a.picks.company].filter(Boolean).join(' · ')
  const ready = r.grade === 'ship'
  const teaser = [
    { t: 'Line-by-Line Bullet X-Ray', b: <span className="g-tag t-warn">{r.bullets.filter(isWeakBullet).length} to fix</span>, p: `Detailed audit of all ${r.bullets.length} bullets, missing quality guardrails, repeated verbs, and modern PM skill proof.` },
    { t: 'Market Standing & Career Story', b: <span className={'g-tag ' + tone(r.marketStanding.percentile)}>{r.marketStanding.percentile}th percentile</span>, p: `Where you rank across PM tracks plus career strengths & risks. ${r.careerAnalysis.positives.length} strengths and ${r.careerAnalysis.negatives.length} risks found.` },
    { t: 'Salary & Expectation Check', b: <span className="g-tag t-acc">Interactive</span>, p: `Your market pay band (${fmt(r.compensation.currency, r.compensation.marketBand.min)}–${fmt(r.compensation.currency, r.compensation.marketBand.max)}) and an instant check on whether your expected salary is calibrated.` },
    { t: 'Early Access PM Jobs (≤72h)', b: <span className="g-tag t-ok">Matched to you</span>, p: 'Fresh PM roles from company career boards, ranked against your skills, track and pay band.' },
  ]
  const dimsEl = dims.map((d) => (
    <div className="mini-dim" key={d.id}><div className="mini-dim-top"><span>{d.label}</span><strong>{d.score}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${d.score}%` }} /></div></div>
  ))

  return (
    <section id="reportView" style={{ display: 'block' }}>
      <div className={v === 'd' ? 'container' : ''} style={v === 'm' ? { padding: 16 } : undefined}>
        {v === 'd' ? (
          <div className="rep-top">
            <button type="button" className="rep-back" onClick={onBack}><Ico n="back" sm /> Back</button>
            <div className="rep-ctx"><span>{a.resume.name}</span><span className="rep-pill">{tag}</span></div>
          </div>
        ) : (
          <button type="button" className="rep-back" onClick={onBack}><Ico n="back" sm /> Back</button>
        )}

        {v === 'd' ? (
          <div className="rep-hero-card">
            <div style={{ textAlign: 'center' }}>
              <Gauge v="d" score={r.overall} />
              <span className={'g-tag ' + (ready ? 't-ok' : tone(r.overall))}>{r.gradeLabel}</span>
            </div>
            <div className="mini-dims" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{dimsEl}</div>
          </div>
        ) : (
          <div className="m-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="m-card-head"><span>Overall PM Score</span><span className={'g-tag ' + tone(r.overall)}>{r.gradeLabel}</span></div>
            <div className="score-row" style={{ alignItems: 'center' }}>
              <Gauge v="m" score={r.overall} />
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                {dims.map((d) => (
                  <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}><span>{d.label.split(' ')[0]}</span><strong>{d.score}</strong></div>
                    <div style={{ height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${d.score}%`, height: '100%', background: 'linear-gradient(90deg,#fc8019,#10b981)' }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="sample-note" style={{ marginTop: 12 }}>{r.headline} Scores measure PM-resume quality and parse-ability. No real ATS publishes a 0–100 number, so treat this as a diagnostic, not a guarantee.</p>

        {signedIn ? (
          <div style={{ marginTop: 16 }}>
            <Unlocked v={v} a={a} go={go} />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button type="button" className={v === 'd' ? 'g-btn btn-primary' : 'btn-main'} style={v === 'm' ? { flex: 'initial' } : undefined} onClick={() => go('/score')}>Continue to ProductRez <Ico n="arrow" sm /></button>
            </div>
          </div>
        ) : (
          <div className="locked-wrap" style={{ marginTop: 16 }}>
            <div className="lock-gate">
              <div className="g-lock-card">
                <div className="g-lock-ico"><Ico n="lock" /></div>
                <h3>Sign in to unlock your full report</h3>
                <p>See your line-by-line bullet fixes, market percentile, salary expectation check, and matching early-access PM jobs.</p>
                <div className="lock-actions"><button type="button" className={v === 'd' ? 'g-btn btn-primary' : 'btn-main'} style={v === 'm' ? { width: '100%' } : undefined} onClick={onSignIn}>Sign In</button></div>
              </div>
            </div>
            <div className="locked-grid" aria-hidden="true">
              {teaser.map((t) => <Card key={t.t} v={v} title={t.t} badge={t.b}><p style={{ fontSize: v === 'd' ? 13 : 12, color: 'var(--ink-2)' }}>{t.p}</p></Card>)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function useAnalysis() {
  return analysisStore
}
