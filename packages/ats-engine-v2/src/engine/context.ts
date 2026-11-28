import { BIG_TECH, DOMAIN_TERMS, ENTERPRISE_CO, SCALEUP_CO, STAGE_EARLY, STAGE_ENTERPRISE, STAGE_SCALE, TITLE_TRACK, TRACK_KB, WEAK_EARLY, isPmTitle } from '../kb/index.ts'
import type { CompanyArchetype, ExperienceItem, Level, PmTrack, ScoreReport } from '../types.ts'

export interface InferredContext {
  level: Level
  track: PmTrack
  archetype: CompanyArchetype
  /** One plain sentence for each pick, so the person can see why and decide whether to change it. */
  reasons: { level: string; track: string; company: string }
  /** 'mixed' means several domains were about equally strong, so the broad track was chosen. */
  trackConfidence: 'clear' | 'mixed' | 'none'
  companyConfidence: 'clear' | 'guess'
}

/** Recent roles say more about someone than old ones: the current role counts double, the one before it a bit more than the rest. */
const recency = (i: number) => (i === 0 ? 2 : i === 1 ? 1.4 : 0.8)

const roleText = (x: ExperienceItem) => `${x.title}\n${x.bullets.join('\n')}`
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

interface TrackScore { track: Exclude<PmTrack, 'generalist'>; score: number; terms: string[]; /** score x the track's precedence: close calls go to the specialist domain over generic context such as SaaS */ adjusted: number }

/** How strongly each specialised track shows in the person's work, from domain words in their roles, weighted by recency. */
export function trackEvidence(r: ScoreReport): TrackScore[] {
  const roles = r.parsed.experience
  const summary = `${r.parsed.basics.headline} ${r.parsed.summary}`
  return (Object.keys(DOMAIN_TERMS) as Exclude<PmTrack, 'generalist'>[]).map((track) => {
    let score = 0
    const seen = new Map<string, number>()
    roles.forEach((x, i) => {
      const text = roleText(x)
      for (const [name, re] of DOMAIN_TERMS[track].terms) {
        const hits = (text.match(new RegExp(re.source, 'gi')) ?? []).length
        if (hits > 0) { score += Math.min(hits, 3) * recency(i); seen.set(name, (seen.get(name) ?? 0) + hits) }
      }
      if (TITLE_TRACK.some(([t, re]) => t === track && re.test(x.title))) score += 4 * recency(i)
    })
    for (const [name, re] of DOMAIN_TERMS[track].terms) if (re.test(summary)) { score += 1.5; seen.set(name, (seen.get(name) ?? 0) + 1) }
    const terms = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
    return { track, score, terms, adjusted: score * DOMAIN_TERMS[track].weight }
  })
}

/** Picks the focus the person actually works in, or the broad track when no domain clearly stands out. */
function inferTrack(r: ScoreReport): { track: PmTrack; reason: string; confidence: InferredContext['trackConfidence'] } {
  const ev = trackEvidence(r).sort((a, b) => b.adjusted - a.adjusted)
  const [a, b] = ev
  const MIN = 9
  if (a.score >= MIN && a.adjusted >= 1.3 * (b?.adjusted ?? 0)) {
    return { track: a.track, confidence: 'clear', reason: `Most of your work is in ${DOMAIN_TERMS[a.track].label} (${a.terms.slice(0, 3).join(', ')}).` }
  }
  const strong = ev.filter((e) => e.score >= MIN * 0.8)
  if (strong.length >= 2) {
    return { track: 'generalist', confidence: 'mixed', reason: `Your work spans ${listJoin(strong.slice(0, 3).map((e) => DOMAIN_TERMS[e.track].short))}, so no single focus stands out. Pick one if you are aiming for it.` }
  }
  return { track: 'generalist', confidence: 'none', reason: 'No single product domain stands out in your resume, so we started with the broad Core / Generalist track.' }
}

/** What kind of company each role was at, and how sure we are. */
function inferArchetype(r: ScoreReport): { archetype: CompanyArchetype; reason: string; confidence: InferredContext['companyConfidence'] } {
  const roles = r.parsed.experience
  const score: Record<CompanyArchetype, number> = { early_startup: 0, scaleup: 0, maang: 0, enterprise: 0 }
  const why: Record<CompanyArchetype, string[]> = { early_startup: [], scaleup: [], maang: [], enterprise: [] }
  // Weak signals (such as "0-to-1") may support an answer but can never carry it alone, however many of them add up.
  const strong: Record<CompanyArchetype, boolean> = { early_startup: false, scaleup: false, maang: false, enterprise: false }
  const add = (a: CompanyArchetype, pts: number, note: string, w: number) => { score[a] += pts * w; if (pts >= 2 && w >= 0.8) strong[a] = true; if (!why[a].includes(note)) why[a].push(note) }

  roles.forEach((x, i) => {
    const w = recency(i)
    const co = x.company
    const text = roleText(x) + ' ' + (i === 0 ? r.parsed.summary : '')
    if (co && BIG_TECH.test(co)) add('maang', 3, `${co} is a big tech company`, w)
    else if (co && ENTERPRISE_CO.test(co)) add('enterprise', 3, `${co} is a large enterprise`, w)
    else if (co && SCALEUP_CO.test(co)) add('scaleup', 3, `${co} is a well-known growth-stage company`, w)
    // A founder role says something about the company only when it is recent; an old one says nothing about where the person works now.
    if (/\b(co-?founder|founder|founding)\b/i.test(x.title)) add('early_startup', 3, `you ${/co-?founder/i.test(x.title) ? 'co-founded' : 'founded'} ${co || 'a company'}`, i <= 1 ? w : 0.3)
    if (STAGE_EARLY.test(text)) add('early_startup', 2, `${co || 'a role'} is described as early-stage`, w)
    else if (WEAK_EARLY.test(text)) add('early_startup', 0.5, `${co || 'a role'} describes 0-to-1 work`, w)
    if (STAGE_SCALE.test(text)) add('scaleup', 2, `${co || 'a role'} mentions growth-stage funding`, w)
    if (STAGE_ENTERPRISE.test(text)) add('enterprise', 2, `${co || 'a role'} is described as an enterprise or IT services setting`, w)
  })
  const ranked = (Object.keys(score) as CompanyArchetype[]).sort((a, b) => score[b] - score[a])
  const top = ranked[0]
  if (score[top] >= 3 && strong[top]) {
    return { archetype: top, confidence: 'clear', reason: `Read from your resume: ${listJoin(why[top].slice(0, 2))}.` }
  }
  return { archetype: 'scaleup', confidence: 'guess', reason: 'Your resume does not say what kind of companies you worked at, so we assumed growth-stage companies. Change it if that is wrong.' }
}

const titleHeld = (xs: ExperienceItem[]) => xs.map((x) => x.title).filter(Boolean)

function pmYearsOf(r: ScoreReport): number {
  const m = r.parsed.experience.filter((x) => isPmTitle(x.title) || /\bfounder\b/i.test(x.title)).reduce((s, x) => s + (x.months ?? 0), 0)
  return Math.round((m / 12) * 10) / 10
}

/**
 * Reads a scored resume and proposes the level, PM focus and company type that the upload form pre-fills, with a plain reason for each.
 * Everything here is a rule over the resume text and can be wrong; the person is always shown the reason and can change it.
 */
export function inferContext(r: ScoreReport): InferredContext {
  const c = r.contextUsed
  const years = pmYearsOf(r)
  const latest = titleHeld(r.parsed.experience)[0]
  const level: Level = c.detectedLevel
  const levelReason = !c.isPmResume
    ? `No product management role on your resume yet${latest ? ` (latest title: ${latest})` : ''}, so we started at entry level.`
    : `${years > 0 ? `About ${years} years in product` : 'Your experience'}${latest ? `, latest title ${latest}` : ''}.`
  const t = inferTrack(r)
  const a = inferArchetype(r)
  return { level, track: t.track, archetype: a.archetype, reasons: { level: levelReason, track: t.reason, company: a.reason }, trackConfidence: t.confidence, companyConfidence: a.confidence }
}

export { TRACK_KB }
