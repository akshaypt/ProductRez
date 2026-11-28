import { Fragment, useMemo, useState } from 'react'
import type { ScoreReport } from '@ats'
import { Icon } from '../Icon'
import { Meter, shortDim, tone } from './charts'
import { fmtGain, isWeakBullet } from '../../lib/bullets'
import { ordinal } from '../../lib/pay'

type Finding = ScoreReport['findings'][number]
type Bullet = ScoreReport['bullets'][number]

const PRIORITY: Record<string, { name: string; cls: string }> = { P0: { name: 'Critical', cls: 'bad' }, P1: { name: 'Important', cls: 'warn' }, P2: { name: 'Polish', cls: 'info' } }

/** The fixes, most important first. Details stay folded until asked for, so the list can be scanned. */
export function FixList({ findings }: { findings: Finding[] }) {
  const [open, setOpen] = useState<string | null>(findings[0]?.id ?? null)
  if (findings.length === 0) return <div className="sd-empty-state"><Icon name="check" size={22} strokeWidth={3} /><b>Nothing to fix</b><span>This resume clears every check we run. Tailor it to each job and apply.</span></div>
  return (
    <ol className="sd-fixes">
      {findings.map((f, i) => {
        const p = PRIORITY[f.priority]
        const isOpen = open === f.id
        const proof = f.evidenceBullets?.length ? f.evidenceBullets : f.evidence.map((t) => ({ ref: '', text: t }))
        return (
          <li key={f.id} className={`sd-fix ${p.cls}`} style={{ ['--i' as string]: Math.min(i, 8) }}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : f.id)}>
              <span className="sd-fix-n">{i + 1}</span>
              <span className="sd-fix-main">
                <span className="sd-fix-t">{f.title}</span>
                <span className="sd-fix-m"><span className={`sd-pill ${p.cls}`}>{p.name}</span><span className="sd-tag">{shortDim(f.dimension, f.dimension)}</span></span>
              </span>
              <span className="sd-gain" title="Estimated change to your overall score">{fmtGain(f.gain)} <small>pts</small></span>
              <Icon name="chevd" size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
            {isOpen && (
              <div className="sd-fix-body">
                <div className="sd-fix-cols">
                  <div><h4>Why it matters</h4><p>{f.why}</p></div>
                  <div><h4>How to fix it</h4><p>{f.fix}</p></div>
                </div>
                {proof.length > 0 && (
                  <div className="sd-proof">
                    <h4>On your resume</h4>
                    {proof.map((e, k) => (
                      <blockquote key={k}>{e.ref && <cite>{e.ref}</cite>}{e.text}</blockquote>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

const NUMBER = /(\$?₹?\d[\d,.]*\s?(?:%|x|×|k|m|mn|bn|cr|crore|lakhs?|million|billion|\+)?)/gi
/** Wraps the figures in a bullet so the eye finds the evidence first. */
function Figures({ text }: { text: string }) {
  const parts = text.split(NUMBER)
  return <>{parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</>
}

const STRENGTH = ['Weak', 'Light', 'Good', 'Strong']
const SOFT_FLAG: Record<string, string> = { 'no-baseline-delta': 'Add a baseline' }
const FLAG: Record<string, string> = {
  'no-metric': 'Claims a result, no number', 'weak-verb': 'Weak opener', 'no-verb': 'No action verb', 'too-long': 'Too long', 'too-short': 'Too short',
  'first-person': 'First person', passive: 'Passive', buzzword: 'Buzzword', 'missing-guardrail': 'No quality guardrail', 'activity-only': 'Activity, not outcome',
}

/** Every bullet, grouped by the role it sits under, with how strong it is and what to change. */
export function BulletsPanel({ bullets }: { bullets: Bullet[] }) {
  const [filter, setFilter] = useState<'all' | 'fix' | 'strong'>('all')
  const fixes = bullets.filter(isWeakBullet).length
  const strong = bullets.filter((b) => b.impact >= 2 && !isWeakBullet(b)).length
  const shown = bullets.filter((b) => (filter === 'fix' ? isWeakBullet(b) : filter === 'strong' ? b.impact >= 2 && !isWeakBullet(b) : true))
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Bullet[]; all: Bullet[] }[] = []
    for (const b of shown) {
      let g = out.find((x) => x.key === `${b.section}:${b.roleIndex}`)
      if (!g) { g = { key: `${b.section}:${b.roleIndex}`, label: b.context, items: [], all: bullets.filter((x) => x.section === b.section && x.roleIndex === b.roleIndex) }; out.push(g) }
      g.items.push(b)
    }
    return out
  }, [shown, bullets])
  if (bullets.length === 0) return <div className="sd-empty-state"><Icon name="list" size={22} /><b>No bullets found</b><span>Make sure your experience uses bullet points.</span></div>
  return (
    <div className="sd-bullets">
      <div className="sd-seg" role="group" aria-label="Filter bullets">
        {([['all', `All ${bullets.length}`], ['fix', `To fix ${fixes}`], ['strong', `Strong ${strong}`]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      <p className="sd-hint">Not every bullet needs a number. Lines about a system you built or a team you led are not marked down for lacking one.</p>
      {shown.length === 0 && <p className="sd-empty">Nothing here. {filter === 'fix' ? 'No bullet needs fixing.' : 'No bullets match.'}</p>}
      {groups.map((g) => (
        <section key={g.key} className="sd-role">
          <header>
            <h3>{g.label}</h3>
            <span>{g.all.filter((b) => b.hasMetric).length} of {g.all.length} quantified</span>
          </header>
          {g.items.map((b) => {
            const weak = isWeakBullet(b)
            const flags = b.flags.filter((f) => FLAG[f] && (['no-metric', 'weak-verb', 'no-verb', 'activity-only', 'passive', 'missing-guardrail', 'first-person', 'too-long', 'too-short', 'buzzword'].includes(f)))
            const soft = b.flags.filter((f) => SOFT_FLAG[f])
            return (
              <article key={`${b.section}${b.roleIndex}${b.index}`} className={'sd-bullet' + (weak ? ' weak' : b.impact >= 2 ? ' strong' : '')}>
                <span className="sd-bn" title={b.ref}>{b.index || '·'}</span>
                <div className="sd-bt">
                  <p><Figures text={b.text} /></p>
                  {(flags.length > 0 || soft.length > 0) && (
                    <div className="sd-flags">
                      {flags.map((f) => <span key={f} className="sd-pill warn">{FLAG[f]}</span>)}
                      {soft.map((f) => <span key={f} className="sd-pill soft">{SOFT_FLAG[f]}</span>)}
                    </div>
                  )}
                </div>
                <span className={`sd-str s${b.impact}`} title={`Impact ${b.impact} of 3`}><i /><i /><i /><small>{STRENGTH[b.impact]}</small></span>
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}

/** The eight PM competencies as tiles, and the 2026 skills with what to do about the gaps. */
export function SkillsPanel({ report }: { report: ScoreReport }) {
  const [openC, setOpenC] = useState<string | null>(null)
  const [openT, setOpenT] = useState<string | null>(null)
  const proven = report.competencies.filter((c) => c.proven).length
  return (
    <div className="sd-skills">
      <div className="sd-sec-h"><h3>PM competencies</h3><span>{proven} of {report.competencies.length} proven in your bullets</span></div>
      <div className="sd-tiles">
        {report.competencies.map((c) => {
          const state = c.proven ? 'proven' : c.inSummaryOrSkillsOnly ? 'listed' : 'none'
          const isOpen = openC === c.id
          return (
            <button key={c.id} type="button" className={`sd-tile ${state}`} aria-expanded={isOpen} onClick={() => setOpenC(isOpen ? null : c.id)}>
              <span className="sd-tile-i">{state === 'proven' ? <Icon name="check" size={14} strokeWidth={3} /> : state === 'listed' ? '◐' : '○'}</span>
              <b>{c.label}</b>
              <small>{c.hits > 0 ? `${c.hits} bullet${c.hits > 1 ? 's' : ''}` : state === 'listed' ? 'Only in summary or skills' : 'No evidence yet'}</small>
              {isOpen && <em>{c.proven ? c.interviewSignal : c.missingHint}</em>}
            </button>
          )
        })}
      </div>

      <div className="sd-sec-h"><h3>2026 skills</h3><span>What hiring managers now look for</span></div>
      <ul className="sd-trend">
        {report.trendingSkills.map((t) => {
          const isOpen = openT === t.id
          const st = t.status === 'proven_in_bullets' ? { l: 'Proven', c: 'good' } : t.status === 'listed_only' ? { l: 'Listed only', c: 'warn' } : { l: 'Missing', c: 'bad' }
          return (
            <li key={t.id}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenT(isOpen ? null : t.id)} disabled={t.status === 'proven_in_bullets'}>
                <span className="sd-trend-t">{t.label}{t.relevance === 'core' && <small>core</small>}</span>
                <span className={`sd-pill ${st.c}`}>{st.l}</span>
                {t.status !== 'proven_in_bullets' && <Icon name="chevd" size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />}
              </button>
              {isOpen && (
                <div className="sd-trend-b">
                  <p>{t.suggestion}</p>
                  {t.exampleBullet && <blockquote><cite>Example bullet</cite>{t.exampleBullet}</blockquote>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const dur = (m: number | null) => (m === null ? '' : m < 12 ? `${m} mo` : `${Math.floor(m / 12)}y${m % 12 ? ` ${m % 12}m` : ''}`)

/** Where the resume ranks, how it fits each PM track, and the shape of the career. */
export function StandingPanel({ report }: { report: ScoreReport }) {
  const s = report.marketStanding
  const ca = report.careerAnalysis
  const tracks = [...s.trackReadiness].sort((a, b) => b.readinessScore - a.readinessScore)
  const roles = report.parsed.experience
  const maxM = Math.max(12, ...roles.map((r) => r.months ?? 0))
  return (
    <div className="sd-standing">
      <section className="sd-block">
        <div className="sd-sec-h"><h3>Where you rank</h3><span>{s.benchmarkCohort}</span></div>
        <div className="sd-rank" role="img" aria-label={`${ordinal(s.percentile)} percentile, ${s.tierLabel}`}>
          <div className="sd-rank-bar"><i /><i /><i /><i /></div>
          <div className="sd-rank-pin" style={{ left: `${Math.max(2, Math.min(98, s.percentile))}%` }}><b>{ordinal(s.percentile)}</b><span>percentile</span></div>
          <div className="sd-rank-scale"><span style={{ left: 0 }}>Developing</span><span style={{ left: '50%' }}>Top 50%</span><span style={{ left: '75%' }}>Top 25%</span><span style={{ left: '90%' }}>Top 10%</span></div>
        </div>
        <p className="sd-lever"><Icon name="zap" size={15} /> <span><b>Next lever.</b> {s.nextBracketLever}</span></p>
      </section>

      <section className="sd-block">
        <div className="sd-sec-h"><h3>Fit by PM track</h3><span>How ready you look for each</span></div>
        <ul className="sd-tracks">
          {tracks.map((t) => (
            <li key={t.track}>
              <div><b>{t.label}</b><span className={`sd-pill ${t.fitLabel === 'strong' ? 'good' : t.fitLabel === 'competitive' ? 'info' : 'warn'}`}>{t.fitLabel}</span></div>
              <Meter value={t.readinessScore} label={`${t.label} readiness`} />
              <em>{t.readinessScore}%</em>
            </li>
          ))}
        </ul>
      </section>

      <section className="sd-block wide">
        <div className="sd-sec-h"><h3>Your career</h3><span>{ca.progressionLabel} · {ca.tenureStats.totalRoles} roles over {ca.tenureStats.careerSpanYears} years</span></div>
        <ul className="sd-timeline">
          {roles.map((r) => (
            <li key={r.id}>
              <div className="sd-tl-l"><b>{r.title || 'Role'}</b><span>{r.company}</span></div>
              <div className="sd-tl-bar"><i className={r.months !== null && r.months < 12 ? 'short' : ''} style={{ width: `${r.months === null ? 6 : Math.max(5, (r.months / maxM) * 100)}%` }} /></div>
              <div className="sd-tl-d"><b>{dur(r.months)}</b><span>{[r.start, r.end].filter(Boolean).join(' – ')}</span></div>
            </li>
          ))}
        </ul>
        <div className="sd-points">
          {ca.positives.slice(0, 3).map((p) => <div key={p.title} className="sd-point good"><Icon name="check" size={15} strokeWidth={3} /><div><b>{p.title}</b><span>{p.detail}</span></div></div>)}
          {ca.negatives.slice(0, 3).map((p) => <div key={p.title} className="sd-point warn"><Icon name="info" size={15} /><div><b>{p.title}</b><span>{p.detail}</span></div></div>)}
        </div>
      </section>
    </div>
  )
}

export { tone }
