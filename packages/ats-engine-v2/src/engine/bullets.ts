import {
  AUTOMATION_EFFICIENCY_PATTERN,
  BASELINE_DELTA_PATTERN,
  BUSINESS_METRIC_WORDS,
  BUZZWORDS,
  CHANGE_WORDS,
  COMPETENCIES,
  FIRST_PERSON,
  GUARDRAIL_PATTERN,
  METRIC_PATTERNS,
  STRONG_VERBS,
  TRACK_KB,
  TRENDING_SKILLS_2026,
  WEAK_OPENERS,
} from '../kb/index.ts'
import type { BulletFlag, BulletReview, PmTrack } from '../types.ts'

const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean)
export const firstWord = (s: string) => (s.match(/^[A-Za-z][A-Za-z'-]*/)?.[0] ?? '').toLowerCase()

export function hasMetric(text: string): boolean {
  return METRIC_PATTERNS.some((re) => re.test(text))
}

export function isWeakOpening(text: string): boolean {
  return WEAK_OPENERS.some((re) => re.test(text))
}

function looksLikeActionVerb(w: string): boolean {
  if (STRONG_VERBS.has(w)) return true
  return (
    /(ed)$/.test(w) &&
    w.length > 4 &&
    !/^(during|nothing|something|anything|everything|string|king|ring|bring)$/.test(w)
  )
}

export function reviewBullet(
  text: string,
  section: BulletReview['section'],
  context: string,
  roleIndex: number,
  isCurrentRole: boolean,
  track: PmTrack = 'generalist',
): BulletReview {
  const flags: BulletFlag[] = []
  const w = wordsOf(text)
  const n = w.length
  const metric = hasMetric(text)
  const outcome = BUSINESS_METRIC_WORDS.test(text)
  const change = CHANGE_WORDS.test(text)
  const baselineDelta = BASELINE_DELTA_PATTERN.test(text)
  const guardrail = GUARDRAIL_PATTERN.test(text)
  const trackKb = TRACK_KB[track]
  const hasTrackKpi = trackKb.coreKpisPattern.test(text)
  const lead = firstWord(text)

  let impact: 0 | 1 | 2 | 3 = 0
  if (metric && outcome && (change || baselineDelta)) impact = 3
  else if (metric) impact = 2
  else if (outcome && change) impact = 1

  if (!metric) flags.push('no-metric')
  else if (!baselineDelta && impact === 2) flags.push('no-baseline-delta')

  if (isWeakOpening(text)) {
    flags.push('weak-verb')
  } else if (!looksLikeActionVerb(lead) && !/^(ex-)?[a-z]+(ed)$/.test(lead)) {
    flags.push('no-verb')
  } else if (!isCurrentRole && /^(lead|manage|own|drive|build|launch|define|run|create|design)s?$/.test(lead)) {
    flags.push('weak-verb')
  }

  if (AUTOMATION_EFFICIENCY_PATTERN.test(text) && metric && !guardrail) {
    flags.push('missing-guardrail')
  }
  if (!metric && !outcome) flags.push('activity-only')
  if (n > 38) flags.push('too-long')
  if (n < 8) flags.push('too-short')
  if (FIRST_PERSON.test(text)) flags.push('first-person')
  if (/\b(was|were|been|being|is|are)\s+(\w+ly\s+)?\w+(ed|en)\b/i.test(text) && !/^\w+ed\b/i.test(text)) {
    flags.push('passive')
  }
  const lower = text.toLowerCase()
  if (BUZZWORDS.some((b) => lower.includes(b))) flags.push('buzzword')

  const competencies = COMPETENCIES.filter((c) => c.pattern.test(text)).map((c) => c.id)
  const trendingSignals = TRENDING_SKILLS_2026.filter(
    (t) => t.proofPattern.test(text) || t.mentionPattern.test(text),
  ).map((t) => t.id)

  return {
    text,
    section,
    context,
    roleIndex,
    impact,
    words: n,
    hasMetric: metric,
    hasBaselineDelta: baselineDelta,
    hasGuardrail: guardrail,
    hasTrackKpi,
    flags,
    competencies,
    trendingSignals,
  }
}
