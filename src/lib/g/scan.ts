import { useEffect, useState } from 'react'
import type { ScoreReport } from '@ats'

/** How long the review animation runs. The score is ready at once; this is the pace a careful read takes, so people trust what they see. */
export const SCAN_MS = 9000

export interface ScanStage { title: string; lines: string[] }

const n = (x: number, one: string, many = one + 's') => `${x} ${x === 1 ? one : many}`

/** The stages shown while reviewing. Every line states something the engine actually found in this resume. */
export function scanPlan(r: ScoreReport): ScanStage[] {
  const s = r.stats
  const topComp = r.competencies.filter((c) => c.proven).length
  return [
    { title: 'Reading your resume', lines: [
      `Parsed ${s.words.toLocaleString()} words${s.pages ? ` across ${n(s.pages, 'page')}` : ''}`,
      `Found ${n(s.roles, 'role')} and ${n(s.bullets, 'bullet point')}`,
      'Mapping titles, dates and the shape of your career',
    ] },
    { title: 'Rating every bullet', lines: [
      `${s.bulletsWithMetrics} of ${s.bullets} bullets carry a number`,
      `${s.bulletsWithDelta} show a before and after change`,
      'Scoring ownership, scope and outcome language',
    ] },
    { title: 'Checking PM craft', lines: [
      `Testing ${r.competencies.length} PM competencies against your evidence`,
      `${topComp} proven by results, the rest only mentioned or missing`,
      `Reading ${n(r.trendingSkills.length, 'trending 2026 skill signal')}`,
    ] },
    { title: 'Benchmarking the market', lines: [
      `Comparing you with ${r.marketStanding.benchmarkCohort}`,
      `Checking readiness across ${r.marketStanding.trackReadiness.length} PM tracks`,
      'Placing you against the hiring bar for your level',
    ] },
    { title: 'Testing ATS parsing', lines: [
      'Simulating how an applicant tracking system reads the file',
      'Checking headings, date formats, columns and contact details',
      'Looking for anything a parser would drop or scramble',
    ] },
    { title: 'Building your fix list', lines: [
      `Setting the pay band in ${r.compensation.currency}`,
      `Ranking ${n(r.findings.length, 'fix', 'fixes')} by score gain`,
      'Writing your report',
    ] },
  ]
}

export interface ScanView { pct: number; stage: number; shown: { stage: number; text: string }[] }

/** Drives the animation from the clock. Lines appear one at a time inside each stage, progress never jumps and never reaches 100 early. */
export function useScanTimeline(active: boolean, plan: ScanStage[] | null, total = SCAN_MS): ScanView {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active) { setT(0); return }
    const t0 = performance.now()
    const id = window.setInterval(() => setT(performance.now() - t0), 90)
    return () => window.clearInterval(id)
  }, [active])
  if (!active || !plan) return { pct: 0, stage: -1, shown: [] }
  const per = total / plan.length
  const stage = Math.min(plan.length - 1, Math.floor(t / per))
  const within = (t - stage * per) / per
  const shown: ScanView['shown'] = []
  plan.forEach((st, i) => st.lines.forEach((text, j) => {
    const at = i * per + per * (0.08 + j * 0.3)
    if (t >= at) shown.push({ stage: i, text })
  }))
  // Slightly eased so each stage has a short stall, like real work.
  const eased = (stage + within * within * (3 - 2 * within)) / plan.length
  return { pct: Math.min(99, Math.round(eased * 100)), stage, shown }
}
