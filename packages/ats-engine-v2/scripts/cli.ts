import { readFileSync } from 'node:fs'
import { scoreResume } from '../src/index.ts'
import type { CandidateBackground, CompanyArchetype, MarketRegion, PmExperienceBand, PmTrack, TargetLevel } from '../src/types.ts'
import { STRONG_AI_PM } from '../tests/fixtures.ts'

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : undefined
}

const file = arg('file')
const jdFile = arg('jd')
const text = file ? readFileSync(file, 'utf8') : STRONG_AI_PM
const jobDescription = jdFile ? readFileSync(jdFile, 'utf8') : undefined

const report = scoreResume({
  text,
  jobDescription,
  targetLevel: (arg('level') as TargetLevel) ?? 'auto',
  pmExperience: (arg('pm-exp') as PmExperienceBand) ?? 'auto',
  track: (arg('track') as PmTrack) ?? 'generalist',
  companyArchetype: (arg('company') as CompanyArchetype) ?? 'scaleup',
  market: (arg('market') as MarketRegion) ?? 'india',
  background: (arg('bg') as CandidateBackground) ?? 'auto',
  pageCount: arg('pages') ? Number(arg('pages')) : undefined,
  currentSalary: arg('current-salary') ? Number(arg('current-salary')) : undefined,
  expectedSalary: arg('expected-salary') ? Number(arg('expected-salary')) : undefined,
})

console.log('\n=== ProductRez PM ATS Score ===')
console.log(`Source:   ${file ?? 'Built-in sample (STRONG_AI_PM)'}`)
console.log(`Overall:  ${report.overall}/100 (${report.gradeLabel})`)
console.log(`Headline: ${report.headline}`)
console.log(
  `Context:  level=${report.contextUsed.level}, pmExp=${report.contextUsed.pmExperience}, totalYOE=${report.contextUsed.totalYears}, track=${report.contextUsed.track}, company=${report.contextUsed.companyArchetype}, market=${report.contextUsed.market}`,
)

console.log('\n--- Dimensions ---')
for (const d of report.dimensions) {
  console.log(`  ${d.label.padEnd(28)} ${String(d.score).padStart(3)}/100  (w=${Math.round(d.weight * 100)}%)  [${d.verdict}]  ${d.summary}`)
}

console.log('\n--- Findings (Top 8) ---')
if (report.findings.length === 0) {
  console.log('  None — strong resume!')
} else {
  for (const f of report.findings.slice(0, 8)) {
    console.log(`  [${f.priority}] ${f.title} (+${f.gain} pts)`)
    console.log(`       Fix: ${f.fix}`)
  }
}

console.log('\n--- 2026 Trending Skills ---')
for (const t of report.trendingSkills) {
  console.log(`  ${t.label.padEnd(42)} ${t.status} (${t.relevance})`)
}

console.log('\n--- Market Standing ---')
console.log(`  Percentile: ${report.marketStanding.percentile}th (${report.marketStanding.tierLabel})`)
console.log(`  Cohort:     ${report.marketStanding.benchmarkCohort}`)
console.log(`  Summary:    ${report.marketStanding.summary}`)
console.log(`  Track Fit:  ${report.marketStanding.trackReadiness.map((t) => `${t.label} ${t.readinessScore}%`).join(' | ')}`)
console.log(`  Next Lever: ${report.marketStanding.nextBracketLever}`)

console.log('\n--- Career So Far ---')
console.log(`  Arc: ${report.careerAnalysis.progressionLabel} — ${report.careerAnalysis.progressionSummary}`)
console.log(
  `  Tenure: ${report.careerAnalysis.tenureStats.totalRoles} roles, ${report.careerAnalysis.tenureStats.careerSpanYears} yrs span, avg ${report.careerAnalysis.tenureStats.avgMonthsPerRole ?? '?'} mos/role`,
)
console.log('  Positives:')
for (const p of report.careerAnalysis.positives) console.log(`    + ${p.title}: ${p.detail}`)
console.log('  Negatives / Risks:')
for (const n of report.careerAnalysis.negatives) console.log(`    - ${n.title}: ${n.detail}`)

console.log('\n--- Compensation Benchmark ---')
const comp = report.compensation
const fmt = (n: number) => (comp.currency === 'INR' ? `₹${n}L` : `$${n}k`)
console.log(`  Cohort:     ${comp.cohortLabel} (${comp.unitLabel})`)
console.log(
  `  Market Band: ${fmt(comp.marketBand.min)} – ${fmt(comp.marketBand.max)} (Median ${fmt(comp.marketBand.median)})`,
)
console.log(
  `  Your Range:  ${fmt(comp.resumeCalibratedBand.low)} – ${fmt(comp.resumeCalibratedBand.high)} (${comp.resumeCalibratedBand.quartileNote})`,
)
if (comp.comparison?.currentSalary) {
  console.log(`  Current:    [${comp.comparison.currentSalary.verdictLabel}] ${comp.comparison.currentSalary.summary}`)
}
if (comp.comparison?.expectedSalary) {
  console.log(`  Expected:   [${comp.comparison.expectedSalary.verdictLabel}] ${comp.comparison.expectedSalary.summary}`)
  console.log(`              ${comp.comparison.expectedSalary.actionNote}`)
}
console.log('')
