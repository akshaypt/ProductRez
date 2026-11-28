import type { ScoreReport as V2 } from '@ats'
import type { ScoreReport as Legacy } from '@scoring'

const LEVEL: Record<string, string> = { apm: 'APM', pm: 'PM', senior: 'Senior PM', lead: 'Lead / Group PM' }

/**
 * The app's report screens (tabs, fix tickets, bullet X-ray, share card) were built for the first scoring engine.
 * This maps the v2 report onto that shape so one engine, and one set of numbers, runs everywhere.
 * The extra v2 data (market standing, career, pay) is shown separately by <Insights />.
 */
export function toLegacy(r: V2): Legacy {
  const c = r.contextUsed
  return {
    version: 1,
    overall: r.overall,
    grade: r.grade,
    gradeLabel: r.gradeLabel,
    headline: r.headline,
    dimensions: r.dimensions.map((d) => ({ id: d.id as never, label: d.label, score: d.score, weight: d.weight, verdict: d.verdict })),
    findings: r.findings.map((f) => ({ id: f.id, priority: f.priority, dimension: f.dimension as never, title: f.title, why: f.why, fix: f.fix, evidence: f.evidence, evidenceBullets: f.evidenceBullets, gain: f.gain })),
    strengths: r.strengths,
    bullets: r.bullets.map((b) => ({ text: b.text, section: b.section, context: b.context, ref: b.ref, impact: b.impact, words: b.words, flags: b.flags as never, competencies: b.competencies })),
    competencies: r.competencies.map((k) => ({ id: k.id, label: k.label, hits: k.hits, covered: k.proven })),
    level: {
      detected: c.detectedLevel,
      target: c.level,
      years: c.totalYears,
      note: `Scored as ${LEVEL[c.level] ?? c.level}${c.detectedLevel !== c.level ? ` (your resume reads as ${LEVEL[c.detectedLevel] ?? c.detectedLevel})` : ''} · about ${c.totalYears} years of experience.`,
    },
    stats: { words: r.stats.words, bullets: r.stats.bullets, bulletsWithMetrics: r.stats.bulletsWithMetrics, roles: r.stats.roles, pages: r.stats.pages },
    keywordMatch: r.keywordMatch ? { matched: [...r.keywordMatch.matchedInBullets, ...r.keywordMatch.matchedSkillsOnly], missing: r.keywordMatch.missing, percent: r.keywordMatch.percent } : null,
    parsed: r.parsed as unknown as Legacy['parsed'],
  }
}
