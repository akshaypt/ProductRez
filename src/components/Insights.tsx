import { useState } from 'react'
import type { ScoreReport } from '@ats'

const money = (c: 'INR' | 'USD', n: number) => (c === 'INR' ? `₹${n}L` : `$${n}k`)
const tone = (n: number) => (n >= 80 ? 'var(--green)' : n >= 62 ? 'var(--info)' : n >= 42 ? 'var(--amber)' : 'var(--red)')

/** What the v2 engine knows beyond the score: where you rank, your career arc, what the market pays, and 2026 skills. */
export function Insights({ report }: { report: ScoreReport }) {
  const s = report.marketStanding
  const ca = report.careerAnalysis
  const [cur, setCur] = useState('')
  const [exp, setExp] = useState('')
  const [cmp, setCmp] = useState<ScoreReport['compensation'] | null>(null)
  const comp = cmp ?? report.compensation
  const unit = comp.currency === 'INR' ? '₹ LPA' : '$k'
  const num = (v: string) => (Number(v) > 0 ? Number(v) : undefined)
  const recheck = async (c: string, e: string) => {
    if (!num(c) && !num(e)) return setCmp(null)
    const eng = await import('@ats')
    setCmp(eng.compareSalaryExpectations(report, { currentSalary: num(c), expectedSalary: num(e) }))
  }
  const tracks = [...s.trackReadiness].sort((a, b) => b.readinessScore - a.readinessScore)
  const trending = report.trendingSkills

  return (
    <div className="stack" style={{ gap: 16, marginTop: 24 }} data-testid="insights">
      <h2 style={{ fontSize: '1.5rem' }}>Beyond the score</h2>
      <div className="grid2">
        <div className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Where you stand</h3>
            <span className="chip good">{s.percentile}th percentile</span>
          </div>
          <p className="muted" style={{ fontSize: '0.95rem' }}>{s.summary}</p>
          <div className="stack" style={{ gap: 10 }}>
            {tracks.map((t) => (
              <div className="dim" key={t.track}>
                <div className="top"><span>{t.label}</span><span className="mono">{t.readinessScore}%</span></div>
                <div className="bar" role="progressbar" aria-valuenow={t.readinessScore} aria-valuemin={0} aria-valuemax={100} aria-label={t.label}><i style={{ width: `${t.readinessScore}%`, background: tone(t.readinessScore) }} /></div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.92rem' }}><b>Next lever:</b> <span className="muted">{s.nextBracketLever}</span></p>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Your career story</h3>
            <span className="chip">{ca.progressionLabel}</span>
          </div>
          <p className="muted" style={{ fontSize: '0.95rem' }}>{ca.progressionSummary}</p>
          <div className="stack" style={{ gap: 8 }}>
            {ca.positives.slice(0, 3).map((p) => (
              <div key={p.title} style={{ fontSize: '0.92rem' }}><b style={{ color: 'var(--green)' }}>+ {p.title}.</b> <span className="muted">{p.detail}</span></div>
            ))}
            {ca.negatives.slice(0, 2).map((p) => (
              <div key={p.title} style={{ fontSize: '0.92rem' }}><b style={{ color: 'var(--amber)' }}>! {p.title}.</b> <span className="muted">{p.detail}</span></div>
            ))}
          </div>
          <p className="faint" style={{ fontSize: '0.82rem' }}>{ca.tenureStats.totalRoles} roles over {ca.tenureStats.careerSpanYears} years{ca.tenureStats.avgMonthsPerRole ? `, about ${ca.tenureStats.avgMonthsPerRole} months each` : ''}.</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>What the market pays</h3>
            <span className="chip">{comp.cohortLabel.split('·')[0].trim()}</span>
          </div>
          <p style={{ fontSize: '0.95rem' }}>Market band <b>{money(comp.currency, comp.marketBand.min)} to {money(comp.currency, comp.marketBand.max)}</b>, median {money(comp.currency, comp.marketBand.median)}. Your resume supports <b>{money(comp.currency, comp.resumeCalibratedBand.low)} to {money(comp.currency, comp.resumeCalibratedBand.high)}</b>.</p>
          <p className="faint" style={{ fontSize: '0.85rem' }}>{comp.resumeCalibratedBand.quartileNote}</p>
          <div className="grid2" style={{ gap: 10 }}>
            <label className="field"><span className="label">Current ({unit})</span><input className="input" type="number" inputMode="decimal" min={0} value={cur} onChange={(e) => { setCur(e.target.value); void recheck(e.target.value, exp) }} /></label>
            <label className="field"><span className="label">Expected ({unit})</span><input className="input" type="number" inputMode="decimal" min={0} value={exp} onChange={(e) => { setExp(e.target.value); void recheck(cur, e.target.value) }} /></label>
          </div>
          {cmp?.comparison?.currentSalary && <p style={{ fontSize: '0.92rem' }}><span className="chip warn">{cmp.comparison.currentSalary.verdictLabel}</span> <span className="muted">{cmp.comparison.currentSalary.summary}</span></p>}
          {cmp?.comparison?.expectedSalary && <p style={{ fontSize: '0.92rem' }}><span className="chip good">{cmp.comparison.expectedSalary.verdictLabel}</span> <span className="muted">{cmp.comparison.expectedSalary.summary} {cmp.comparison.expectedSalary.actionNote}</span></p>}
          <p className="faint" style={{ fontSize: '0.8rem' }}>Salary never changes your resume score, and nothing you type here is saved.</p>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <h3>2026 skills check</h3>
          <div className="stack" style={{ gap: 10 }}>
            {trending.map((t) => (
              <div key={t.id} style={{ fontSize: '0.92rem' }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontWeight: 500 }}>{t.label}</b>
                  <span className={`chip ${t.status === 'proven_in_bullets' ? 'good' : t.status === 'listed_only' ? 'warn' : 'bad'}`}>{t.status === 'proven_in_bullets' ? 'proven' : t.status === 'listed_only' ? 'listed only' : 'missing'}</span>
                </div>
                {t.status !== 'proven_in_bullets' && <p className="muted" style={{ fontSize: '0.88rem', marginTop: 4 }}>{t.suggestion}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
