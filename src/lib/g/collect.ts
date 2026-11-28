import type { Api } from '../types'
import type { Analysis } from './analyze'
import { store } from '../util'
import { TERMS_VERSION } from '../../data/site'

/** A random id for this browser, so checks made before sign-in can be attached to the account afterwards. */
export function anonId(): string {
  let id = store.get<string | null>('pr.anon', null)
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0')
    store.set('pr.anon', id)
  }
  return id
}

/** What we keep from a check: the parsed resume (with the contact details on it), the scores and the choices made. Never the file. */
export function submissionPayload(a: Analysis, source: 'landing' | 'app') {
  const r = a.report
  return {
    anonId: anonId(),
    source,
    termsVersion: TERMS_VERSION,
    resume: r.parsed,
    picks: a.picks,
    scores: {
      overall: r.overall,
      grade: r.grade,
      dimensions: r.dimensions.map((d) => ({ id: d.id, score: d.score })),
      level: r.contextUsed.level,
      detectedLevel: r.contextUsed.detectedLevel,
      totalYears: r.contextUsed.totalYears,
      track: r.contextUsed.track,
      archetype: r.contextUsed.companyArchetype,
      market: r.contextUsed.market,
      currency: r.compensation.currency,
      percentile: r.marketStanding.percentile,
      stats: r.stats,
      findings: r.findings.map((f) => ({ id: f.id, priority: f.priority, dimension: f.dimension, gain: f.gain })),
      jdUsed: !!a.jd.trim(),
    },
  }
}

/** Fire and forget: saving must never slow down or break the check. */
export function collectSubmission(api: Api | null, a: Analysis, source: 'landing' | 'app') {
  if (!api) return
  api.collectResume(submissionPayload(a, source)).catch(() => {})
}
