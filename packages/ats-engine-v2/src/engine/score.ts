import {
  AI_CLAIM_PATTERN,
  ARCHETYPE_KB,
  ATS_PLATFORM_KB,
  BUSINESS_METRIC_WORDS,
  BUZZWORDS,
  COMPETENCIES,
  LEVEL_SIGNALS,
  MARKET_KB,
  PM_TITLE_PATTERN,
  REMOTE_SIGNALS,
  TRACK_KB,
  TRENDING_SKILLS_2026,
} from '../kb/index.ts'
import { parseResume } from '../parser/parse.ts'
import type {
  BulletReview,
  CandidateBackground,
  CompetencyResult,
  Dimension,
  DimensionId,
  Finding,
  KbInsight,
  Level,
  PmExperienceBand,
  ResumeData,
  ScoreInput,
  ScoreReport,
  TrendingSkillResult,
} from '../types.ts'
import { firstWord, hasMetric, reviewBullet } from './bullets.ts'
import { analyzeCareer } from './careerAnalysis.ts'
import { buildCompensationReport } from './compensation.ts'
import { matchJobDescription } from './jdMatch.ts'
import { analyzeMarketStanding } from './marketStanding.ts'

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n)
const pct = (a: number, b: number) => (b === 0 ? 0 : a / b)
const trim = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

const LEVEL_ORDER: Level[] = ['apm', 'pm', 'senior', 'lead']
const LEVEL_LABEL: Record<Level, string> = {
  apm: 'Associate / Entry PM',
  pm: 'Product Manager',
  senior: 'Senior PM',
  lead: 'Group PM / Director+',
}

function yearOf(s: string): number | null {
  const m = s.match(/(19|20)\d{2}/)
  return m ? parseInt(m[0], 10) : null
}

function monthIndex(s: string): number {
  const m = s.toLowerCase().match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/)
  return m ? ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[0]) : 5
}

export function estimateYears(data: ResumeData, now = new Date()): number {
  const spans: [number, number][] = []
  for (const x of data.experience) {
    const sy = yearOf(x.start)
    if (!sy) continue
    const present = /present|current|now|today|ongoing/i.test(x.end) || !x.end
    const ey = present ? now.getFullYear() : yearOf(x.end)
    if (!ey) continue
    const s = sy + monthIndex(x.start) / 12
    const e = present ? now.getFullYear() + now.getMonth() / 12 : ey + monthIndex(x.end) / 12
    if (e >= s) spans.push([s, e])
  }
  spans.sort((a, b) => a[0] - b[0])
  let total = 0
  let cur: [number, number] | null = null
  for (const sp of spans) {
    if (!cur) cur = [...sp]
    else if (sp[0] <= cur[1]) cur[1] = Math.max(cur[1], sp[1])
    else {
      total += cur[1] - cur[0]
      cur = [...sp]
    }
  }
  if (cur) total += cur[1] - cur[0]
  return Math.round(total * 10) / 10
}

function estimatePmYears(data: ResumeData, totalYears: number): number {
  const pmMonths = data.experience
    .filter((x) => PM_TITLE_PATTERN.test(x.title) || /\bfounder\b/i.test(x.title))
    .reduce((sum, x) => sum + (x.months ?? 0), 0)
  if (pmMonths > 0) return Math.round((pmMonths / 12) * 10) / 10
  // If no explicit PM titles found in experience, candidate may be transitioning
  const anyPmTitle = data.experience.some((x) => /\bproduct\b/i.test(x.title))
  return anyPmTitle ? totalYears : 0
}

function pmBandToYears(band: PmExperienceBand, inferredPmYears: number): number {
  switch (band) {
    case 'transitioning':
      return 0
    case '0_2':
      return 1.2
    case '2_5':
      return 3.5
    case '5_8':
      return 6.5
    case '8_plus':
      return 9.5
    default:
      return inferredPmYears
  }
}

function yearsToBand(y: number): Exclude<PmExperienceBand, 'auto'> {
  if (y <= 0.1) return 'transitioning'
  if (y < 2) return '0_2'
  if (y < 5) return '2_5'
  if (y < 8) return '5_8'
  return '8_plus'
}

function detectLevel(pmYears: number, text: string): Level {
  const titles = text.toLowerCase()
  if (/\b(director|vp of product|vice president|head of product|chief product|cpo|group product manager|gpm)\b/.test(titles)) {
    return 'lead'
  }
  if (/\b(senior product manager|sr\.? product manager|principal product manager|staff product manager|lead product manager)\b/.test(titles)) {
    return pmYears >= 8.5 ? 'lead' : 'senior'
  }
  if (pmYears < 2) return 'apm'
  if (pmYears < 5) return 'pm'
  if (pmYears < 8.5) return 'senior'
  return 'lead'
}

function inferBackground(data: ResumeData, pmYears: number): Exclude<CandidateBackground, 'auto'> {
  if (pmYears >= 1) return 'practicing_pm'
  const titles = `${data.basics.headline} ${data.experience.map((e) => e.title).join(' ')}`.toLowerCase()
  if (/\b(founder|co-?founder|ceo)\b/.test(titles)) return 'founder'
  if (/\b(engineer|developer|software|sde|swe|architect|devops|qa)\b/.test(titles)) return 'engineering'
  if (/\b(designer|ux|ui|product design)\b/.test(titles)) return 'design'
  if (/\b(data analyst|business analyst|scientist|analytics|bi\b)\b/.test(titles)) return 'analytics'
  if (/\b(consultant|strategy|operations|ops|program manager|project manager|marketing|sales)\b/.test(titles)) return 'business_ops'
  if (data.experience.length === 0 || /\b(intern|mba|student|fellow)\b/.test(titles)) return 'mba_grad'
  return 'practicing_pm'
}

interface Ctx {
  push: (f: Omit<Finding, 'id'>) => void
}

export function scoreResume(input: ScoreInput, now = new Date()): ScoreReport {
  const parsed = parseResume(input.text, now)
  const { data, artifacts } = parsed
  const findings: Finding[] = []
  const ctx: Ctx = { push: (f) => findings.push({ ...f, id: `${f.priority.toLowerCase()}-${findings.length + 1}` }) }
  const strengths: string[] = []
  const kbInsights: KbInsight[] = []

  const track = input.track ?? 'generalist'
  const archetype = input.companyArchetype ?? 'scaleup'
  const market = input.market ?? 'india'
  const trackKb = TRACK_KB[track]
  const archKb = ARCHETYPE_KB[archetype]
  const marketKb = MARKET_KB[market]

  // ---- Experience & Level Context ------------------------------------------
  const totalYears = input.totalYearsOverride ?? estimateYears(data, now)
  const inferredPmYears = estimatePmYears(data, totalYears)
  const pmBand: Exclude<PmExperienceBand, 'auto'> =
    input.pmExperience && input.pmExperience !== 'auto'
      ? input.pmExperience
      : yearsToBand(inferredPmYears)
  const pmYears = pmBandToYears(pmBand, inferredPmYears)

  const detectedLevel = detectLevel(pmYears > 0 ? pmYears : totalYears, `${data.experience.map((e) => e.title).join(' | ')} ${data.basics.headline}`)
  const targetLevel: Level =
    input.targetLevel && input.targetLevel !== 'auto'
      ? input.targetLevel
      : pmBand === 'transitioning'
        ? 'apm'
        : detectLevel(pmYears, `${data.experience.map((e) => e.title).join(' | ')} ${data.basics.headline}`)
  const targetIdx = LEVEL_ORDER.indexOf(targetLevel)

  const background: Exclude<CandidateBackground, 'auto'> =
    input.background && input.background !== 'auto'
      ? input.background
      : inferBackground(data, pmYears)

  // ---- Bullets Analysis ----------------------------------------------------
  const bullets: BulletReview[] = []
  data.experience.forEach((x, i) => {
    const ctxLabel = [x.title, x.company].filter(Boolean).join(' · ') || 'Experience'
    const current = i === 0 || /present|current/i.test(x.end)
    x.bullets.forEach((b, j) => bullets.push(reviewBullet(b, 'experience', ctxLabel, i, current, track, j + 1)))
  })
  data.projects.forEach((p, i) => {
    p.bullets.forEach((b, j) => bullets.push(reviewBullet(b, 'projects', p.name || 'Project', i, false, track, j + 1)))
  })
  if (bullets.length === 0) {
    parsed.lines
      .filter((l) => l.length > 50 && /[a-z]/.test(l))
      .slice(0, 24)
      .forEach((l, j) => bullets.push(reviewBullet(l, 'other', 'Resume', 0, false, track, j + 1)))
  }

  const nb = bullets.length
  const withMetrics = bullets.filter((b) => b.hasMetric).length
  const withDelta = bullets.filter((b) => b.hasBaselineDelta).length
  const withGuardrail = bullets.filter((b) => b.hasGuardrail).length
  const allText = parsed.lines.join('\n')
  const bulletsOnlyText = bullets.map((b) => b.text).join('\n')
  const summaryAndSkillsText = `${data.basics.headline} ${data.summary} ${data.skills.map((s) => s.items).join(' ')}`

  // Recency weighting: top 2 roles count 1.5x, older roles count 0.7x
  const roleWeight = (b: BulletReview) => (b.section === 'experience' ? (b.roleIndex <= 1 ? 1.5 : 0.7) : 1.0)
  const totalWeightedBullets = bullets.reduce((s, b) => s + roleWeight(b), 0)
  const wPct = (pred: (b: BulletReview) => boolean) =>
    totalWeightedBullets === 0 ? 0 : bullets.filter(pred).reduce((s, b) => s + roleWeight(b), 0) / totalWeightedBullets

  // ---- 1. Impact & Outcomes ------------------------------------------------
  // Not every bullet should carry a number: lines about a system you built or a team you led can stand without one. So the resume as a
  // whole is asked for roughly half of its bullets to be quantified (METRIC_TARGET), not all of them, and a bullet is only tagged
  // "no metric" when it claims a result without proving it (see reviewBullet).
  const METRIC_TARGET = 0.55
  const metricShare = wPct((b) => b.hasMetric)
  const strongImpact = wPct((b) => b.impact >= 2)
  const richImpact = wPct((b) => b.impact === 3)
  const trackKpiShare = wPct((b) => b.hasTrackKpi)
  const heroBullets = data.experience.flatMap((x) => x.bullets.slice(0, 2)).filter(Boolean)
  const heroReviews = bullets.filter((b) => b.section === 'experience' && b.index > 0 && b.index <= 2)
  const heroMetricShare = pct(heroBullets.filter(hasMetric).length, heroBullets.length)
  const missingGuardrails = bullets.filter((b) => b.flags.includes('missing-guardrail'))

  let impact =
    nb === 0
      ? 5
      : 100 *
        (0.42 * Math.min(1, strongImpact / METRIC_TARGET) +
          0.22 * Math.min(1, richImpact / 0.3) +
          0.14 * Math.min(1, metricShare / METRIC_TARGET) +
          0.12 * heroMetricShare +
          0.10 * Math.min(1, trackKpiShare / 0.35))
  if (missingGuardrails.length >= 2) impact -= 6
  impact = clamp(impact)

  const missingMetric = bullets.filter((b) => b.flags.includes('no-metric'))
  if (nb > 0 && metricShare < METRIC_TARGET * 0.75) {
    // Too few numbers overall. Point at the bullets where a number would help most: claims first, then lines that name an outcome area.
    const candidates = [
      ...missingMetric,
      ...bullets.filter((b) => !b.hasMetric && !b.needsMetric && BUSINESS_METRIC_WORDS.test(b.text)),
      ...bullets.filter((b) => !b.hasMetric && !b.needsMetric && !BUSINESS_METRIC_WORDS.test(b.text)),
    ].filter((b, i, all) => all.indexOf(b) === i)
    ctx.push({
      priority: metricShare < METRIC_TARGET * 0.4 ? 'P0' : 'P1',
      dimension: 'impact',
      title: `Only ${withMetrics} of ${nb} bullets carry a number`,
      why: 'Not every bullet needs a metric. Lines about a system you built or a team you led can stand without one. But a resume with few numbers reads as a list of activity rather than results, and PM screeners look for the business or user metric you moved. About half your bullets should be quantified.',
      fix: 'Add a figure to the bullets below, starting with ones that already claim a result: Action Verb + What You Changed + Metric Change (before → after) + Scale or Guardrail.',
      evidence: candidates.slice(0, 3).map((b) => trim(b.text)),
      gain: round(Math.min(18, (METRIC_TARGET - metricShare) * 30)),
      kbRuleId: 'metric_density',
    })
  } else if (nb > 0 && missingMetric.length >= 2) {
    ctx.push({
      priority: 'P2',
      dimension: 'impact',
      title: `${missingMetric.length} bullets claim a result without a number`,
      why: 'These bullets say something improved, grew or got cut, but not by how much, so a reader cannot tell if it was 2% or 200%. Bullets that only describe what you built or led are not counted here.',
      fix: 'Add the figure that backs each claim, or reword it to describe the work if you do not have the number.',
      evidence: missingMetric.slice(0, 3).map((b) => trim(b.text)),
      gain: round(Math.min(6, missingMetric.length * 1.5)),
      kbRuleId: 'unproven_claims',
    })
  } else if (nb > 0) {
    strengths.push(`${round(pct(withMetrics, nb) * 100)}% of your bullets carry quantified metrics.`)
  }

  const heroMisses = [...heroReviews.filter((b) => !b.hasMetric)].sort((a, b) => Number(b.needsMetric) - Number(a.needsMetric))
  if (nb > 0 && heroReviews.length >= 2 && heroMetricShare < 0.4 && heroMisses.length > 0) {
    ctx.push({
      priority: 'P1',
      dimension: 'impact',
      title: 'The first bullets under your roles do not lead with a number',
      why: 'Screeners often read only the first 1–2 bullets of your recent roles before deciding yes/no.',
      fix: 'Put your strongest metric-backed win first under each role, or add the number to these.',
      evidence: heroMisses.slice(0, 2).map((b) => trim(b.text)),
      gain: 4,
      kbRuleId: 'hero_bullets',
    })
  }

  const missingDelta = bullets.filter((b) => b.flags.includes('no-baseline-delta'))
  if (nb > 0 && richImpact < 0.15 && metricShare >= 0.4 && missingDelta.length >= 2) {
    ctx.push({
      priority: 'P2',
      dimension: 'impact',
      title: `${missingDelta.length} bullets give a result as a bare number, with no before → after`,
      why: 'Saying "launched to 500 users" is output. Saying "cut churn from 5.2% to 3.6% in Q3" proves outcome. Bullets that already state a percentage change are not counted here.',
      fix: 'Add the starting point or timeframe to these bullets.',
      evidence: missingDelta.slice(0, 3).map((b) => trim(b.text)),
      gain: 3,
      kbRuleId: 'baseline_delta',
    })
  }

  if (missingGuardrails.length > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'impact',
      title: 'Efficiency/automation claim lacks a quality guardrail metric',
      why: 'Cutting tickets or review time without proving CSAT, accuracy, or fraud stayed safe is a classic PM screener red flag.',
      fix: 'Pair efficiency wins with a guardrail: e.g. "deflected 31% of tickets while holding CSAT flat at 4.6/5".',
      evidence: missingGuardrails.slice(0, 2).map((b) => trim(b.text)),
      gain: 3,
      kbRuleId: 'guardrail_rule',
    })
  }

  // ---- 2. Ownership, Scope & Archetype Fit ---------------------------------
  const weak = bullets.filter((b) => b.flags.includes('weak-verb'))
  const noVerb = bullets.filter((b) => b.flags.includes('no-verb'))
  const strongOpen = bullets.filter((b) => !b.flags.includes('weak-verb') && !b.flags.includes('no-verb'))
  const ownershipShare = pct(strongOpen.length, nb)
  const scopeRe = targetIdx >= 3 ? LEVEL_SIGNALS.lead : LEVEL_SIGNALS.senior
  const scopeHits = bullets.filter((b) => scopeRe.test(b.text)).length
  const scopeNeeded = targetIdx >= 3 ? 0.35 : targetIdx === 2 ? 0.28 : targetIdx === 1 ? 0.15 : 0.05
  const scopeShare = pct(scopeHits, nb)

  const avgBulletsPerRole = data.experience.length ? data.experience.reduce((s, x) => s + x.bullets.length, 0) / data.experience.length : 0
  const featureFactoryRoles = data.experience.filter((x) => x.bullets.length > archKb.idealBulletsPerRole.max + 1)
  const archHits = bullets.filter((b) => archKb.signalPattern.test(b.text)).length

  let ownership =
    nb === 0
      ? 5
      : 100 *
        (0.45 * Math.min(1, ownershipShare / 0.85) +
          0.35 * Math.min(1, scopeShare / Math.max(0.05, scopeNeeded)) +
          0.20 * Math.min(1, archHits / Math.max(2, Math.round(nb * 0.25))))
  if (featureFactoryRoles.length > 0) ownership -= Math.min(14, featureFactoryRoles.length * 6)
  ownership = clamp(ownership)

  if (weak.length + noVerb.length >= Math.max(2, nb * 0.2)) {
    ctx.push({
      priority: weak.length >= nb * 0.35 ? 'P0' : 'P1',
      dimension: 'ownership',
      title: `${weak.length + noVerb.length} bullets use passive or "helper" language`,
      why: '"Responsible for", "helped", and "worked on" hide what you personally decided and owned.',
      fix: 'Open with decisive ownership verbs: Owned, Defined, Prioritized, Launched, Shipped, Negotiated, Sunsetted.',
      evidence: [...weak, ...noVerb].slice(0, 3).map((b) => trim(b.text)),
      gain: round(Math.min(13, 4 + (weak.length + noVerb.length) * 1.1)),
      kbRuleId: 'ownership_verbs',
    })
  } else if (nb > 0 && ownershipShare > 0.85) {
    strengths.push('Decisive, ownership-first action verbs open nearly every bullet.')
  }

  if (featureFactoryRoles.length > 0) {
    ctx.push({
      priority: 'P1',
      dimension: 'ownership',
      title: `"Feature factory" risk: ${featureFactoryRoles.length} role(s) exceed ${archKb.idealBulletsPerRole.max + 1} bullets`,
      why: `For ${archKb.label}, listing 6+ bullets per job reads like an output log rather than selective strategic ownership.`,
      fix: `Trim each role to your top ${archKb.idealBulletsPerRole.min}–${archKb.idealBulletsPerRole.max} highest-impact outcome bullets.`,
      evidence: featureFactoryRoles.slice(0, 2).map((x) => `${x.title || x.company} (${x.bullets.length} bullets)`),
      gain: 5,
      kbRuleId: 'feature_factory',
    })
  }

  if (nb > 0 && scopeShare < scopeNeeded * 0.6 && targetIdx >= 1) {
    ctx.push({
      priority: targetIdx >= 2 ? 'P1' : 'P2',
      dimension: 'ownership',
      title: `Scope signals are light for ${LEVEL_LABEL[targetLevel]}`,
      why:
        targetIdx >= 3
          ? 'Group PM / Director roles require portfolio ownership, org leadership, hiring/coaching PMs, and P&L impact.'
          : targetIdx === 2
            ? 'Senior PMs are screened on multi-squad strategy, pricing/north-star bets, and executive influence.'
            : 'PMs must show ownership of a product surface/KPI, not isolated tasks.',
      fix: 'Explicitly quantify scope: # of squads, MAUs/ARR, cross-org alignment, or trade-offs you drove.',
      evidence: [],
      gain: 5,
      kbRuleId: 'level_scope',
    })
  }

  // ---- 3. PM Craft, Track Fit & 2026 Trends --------------------------------
  const competencies: CompetencyResult[] = COMPETENCIES.map((c) => {
    const hits = bullets.filter((b) => b.competencies.includes(c.id)).length
    const inSummaryOrSkillsOnly = hits === 0 && c.pattern.test(summaryAndSkillsText)
    return {
      id: c.id,
      label: c.label,
      hits,
      inSummaryOrSkillsOnly,
      proven: hits >= 1,
      interviewSignal: c.interviewSignal,
      missingHint: c.missingHint,
    }
  })

  const provenComps = competencies.filter((c) => c.proven).length
  const deepComps = competencies.filter((c) => c.hits >= 2).length
  const expectedProven = [4, 5, 6, 6][targetIdx]

  const trackToolsInBullets = trackKb.toolsPattern.test(bulletsOnlyText)
  const trackToolsAnywhere = trackKb.toolsPattern.test(allText)

  // Trending 2026 skills check
  const trendingSkills: TrendingSkillResult[] = TRENDING_SKILLS_2026.map((t) => {
    const isHigh = t.highRelevanceTracks.includes(track)
    const relevance: TrendingSkillResult['relevance'] = isHigh ? (track === 'ai_ml' && t.id.startsWith('ai_') ? 'core' : 'high') : 'bonus'
    const provenInBullets = bullets.filter((b) => t.proofPattern.test(b.text)).map((b) => b.text)
    const mentionedInBullets = bullets.filter((b) => t.mentionPattern.test(b.text)).length > 0
    const mentionedInSkills = t.mentionPattern.test(summaryAndSkillsText)
    const status: TrendingSkillResult['status'] =
      provenInBullets.length > 0 || mentionedInBullets
        ? 'proven_in_bullets'
        : mentionedInSkills
          ? 'listed_only'
          : 'missing'
    const matchedTerms = allText.match(new RegExp(t.mentionPattern.source, 'gi')) ?? []
    return {
      id: t.id,
      label: t.label,
      relevance,
      status,
      matchedTerms: [...new Set(matchedTerms.map((m) => m.toLowerCase()))].slice(0, 5),
      suggestion: status === 'listed_only' ? t.suggestionIfListedOnly : t.suggestionIfMissing,
      exampleBullet: t.exampleBullet,
    }
  })

  // Detect AI-washing: claims AI/LLM in summary/skills with zero proof in experience/projects
  const claimsAi = AI_CLAIM_PATTERN.test(summaryAndSkillsText)
  const provesAiInBullets =
    TRENDING_SKILLS_2026.filter((t) => t.id.startsWith('ai_') || t.id === 'context_rag_agents').some((t) =>
      bullets.some((b) => t.proofPattern.test(b.text) || t.mentionPattern.test(b.text)),
    )
  const aiWashing = claimsAi && !provesAiInBullets

  const highRelTrends = trendingSkills.filter((t) => t.relevance === 'core' || t.relevance === 'high')
  const provenTrends = highRelTrends.filter((t) => t.status === 'proven_in_bullets').length

  let craft =
    nb === 0
      ? 5
      : 100 *
        (0.50 * Math.min(1, provenComps / expectedProven) +
          0.20 * Math.min(1, deepComps / Math.max(2, expectedProven - 2)) +
          0.18 * (trackKpiShare > 0.2 ? 1 : trackKpiShare / 0.2) * (trackToolsInBullets ? 1 : trackToolsAnywhere ? 0.75 : 0.45) +
          0.12 * (highRelTrends.length ? Math.min(1, provenTrends / Math.min(2, highRelTrends.length)) : 1))
  if (aiWashing) craft -= 8
  const activityOnlyShare = pct(bullets.filter((b) => b.flags.includes('activity-only')).length, nb)
  if (nb > 0 && activityOnlyShare > 0.6) craft -= Math.round((activityOnlyShare - 0.5) * 35)
  craft = clamp(craft)

  if (nb > 0 && provenComps < expectedProven) {
    const unproven = competencies.filter((c) => !c.proven).slice(0, 3)
    ctx.push({
      priority: provenComps <= 2 ? 'P0' : 'P1',
      dimension: 'craft',
      title: `Only ${provenComps} of 8 PM competencies proven in bullets`,
      why: `For ${LEVEL_LABEL[targetLevel]}, interview loops screen for ${expectedProven}+ core competencies backed by bullet evidence (not just listed in Skills).`,
      fix: unproven.map((m) => `${m.label}: ${m.missingHint}`).join(' '),
      evidence: [],
      gain: round(Math.min(12, (expectedProven - provenComps) * 3)),
      kbRuleId: 'competency_coverage',
    })
  } else if (provenComps >= expectedProven) {
    strengths.push(`Your bullets evidence ${provenComps} of 8 core PM competencies.`)
  }

  if (track !== 'generalist' && !trackToolsInBullets && trackKpiShare < 0.15) {
    ctx.push({
      priority: 'P1',
      dimension: 'craft',
      title: `Light ${trackKb.label} proof inside experience bullets`,
      why: `${trackKb.label} screeners filter for domain-specific metrics and workflows (${trackKb.mustHaveTerms.slice(0, 4).join(', ')}).`,
      fix: `Add domain KPIs and tools (${trackKb.recommendedTools.slice(0, 3).join(', ')}) inside your work bullets. Example: "${trackKb.exemplarBullets[0]}"`,
      evidence: [],
      gain: 6,
      kbRuleId: 'track_alignment',
    })
  }

  if (aiWashing) {
    ctx.push({
      priority: track === 'ai_ml' ? 'P0' : 'P1',
      dimension: 'craft',
      title: 'Possible "AI-washing": AI/LLM claimed in Skills/Summary without bullet proof',
      why: '2026 PM hiring loops run a strict BS check for AI claims — listing GenAI/LLMs without evals, latency, cost, or adoption metrics raises red flags.',
      fix: 'Back your AI skills with a concrete bullet showing mechanism + outcome + guardrail (e.g., golden eval set, hallucination reduction, or v0/Cursor prototype validation).',
      evidence: [],
      gain: 6,
      kbRuleId: 'ai_washing',
    })
  }

  // ---- 4. Experience & Level Fit -------------------------------------------
  let expScore = 85
  const minExpectedPmYears = [0, 1.5, 4.0, 7.5][targetIdx]
  if (pmYears < minExpectedPmYears) {
    const gap = minExpectedPmYears - pmYears
    expScore -= Math.min(35, gap * 8)
  }
  const needsProjects = pmBand === 'transitioning' || targetIdx === 0 || background !== 'practicing_pm'
  const hasPortfolioOrProjects = data.projects.length > 0 || !!data.basics.portfolio || !!data.basics.github
  if (needsProjects && !hasPortfolioOrProjects && pmYears < 2) {
    expScore -= 18
    ctx.push({
      priority: 'P1',
      dimension: 'experience_fit',
      title: 'Missing product projects or portfolio link for transitioning/entry profile',
      why: 'Without 2+ years of formal PM titles, shipped side projects, rapid prototypes, or product teardowns are your primary proof of product sense.',
      fix: 'Add a Projects section (1–2 shipped products or prototypes with user/metric results) and link your portfolio in the header.',
      evidence: [],
      gain: 7,
      kbRuleId: 'transition_projects',
    })
  }

  const shortStints = data.experience.filter(
    (x) => x.months !== null && x.months < 10 && !/intern|contract|freelance|fellow|advisor/i.test(x.title) && x.end !== 'Present',
  )
  if (shortStints.length >= 2) {
    expScore -= 8
    ctx.push({
      priority: 'P2',
      dimension: 'experience_fit',
      title: `${shortStints.length} full-time roles lasted under 10 months`,
      why: 'Multiple short PM stints make recruiters question whether you stayed long enough to ship and measure outcomes.',
      fix: 'Clarify context if roles were contract/acquisition/reorg, and foreground shipped impact inside each short stint.',
      evidence: shortStints.slice(0, 2).map((x) => `${x.title || x.company} (${x.months} mo)`),
      gain: 2,
      kbRuleId: 'tenure_stability',
    })
  }

  if (pmBand === 'transitioning' && targetIdx >= 2) {
    ctx.push({
      priority: 'P1',
      dimension: 'experience_fit',
      title: `Targeting ${LEVEL_LABEL[targetLevel]} while transitioning with 0 yrs direct PM experience`,
      why: 'Senior PM roles typically filter strictly on 4–5+ years of direct PM ownership unless you held Founder/GM scope.',
      fix: 'Also target PM / APM / Technical PM roles or emphasize founder/product-owner scope explicitly in your role headers.',
      evidence: [],
      gain: 4,
      kbRuleId: 'seniority_gap',
    })
  }
  expScore = clamp(expScore)

  // ---- 5. Writing Clarity & Conciseness ------------------------------------
  const long = bullets.filter((b) => b.flags.includes('too-long'))
  const short = bullets.filter((b) => b.flags.includes('too-short'))
  const fp = bullets.filter((b) => b.flags.includes('first-person'))
  const passive = bullets.filter((b) => b.flags.includes('passive'))
  const textBuzz = BUZZWORDS.filter((b) => `${data.summary} ${allText}`.toLowerCase().includes(b))
  const verbCounts = new Map<string, number>()
  bullets.forEach((b) => {
    const fw = firstWord(b.text)
    if (fw) verbCounts.set(fw, (verbCounts.get(fw) ?? 0) + 1)
  })
  const repeated = [...verbCounts.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])
  const avgWords = nb ? bullets.reduce((s, b) => s + b.words, 0) / nb : 0

  let writing = 100
  writing -= Math.min(25, pct(long.length, nb) * 70)
  writing -= Math.min(10, pct(short.length, nb) * 30)
  writing -= Math.min(15, fp.length * 4)
  writing -= Math.min(12, passive.length * 3)
  writing -= Math.min(14, textBuzz.length * 3.5)
  writing -= Math.min(12, repeated.reduce((s, [, c]) => s + (c - 2) * 2.5, 0))
  if (nb > 0 && (avgWords < 12 || avgWords > 32)) writing -= 8
  if (nb === 0) writing = 10
  writing = clamp(writing)

  if (long.length >= 2) {
    ctx.push({
      priority: 'P1',
      dimension: 'writing',
      title: `${long.length} bullets exceed 38 words`,
      why: 'Recruiters scan in seconds; dense 3–4 line bullets bury the metric.',
      fix: 'Keep bullets to 15–28 words (1–2 lines max), one clear decision + outcome per bullet.',
      evidence: long.slice(0, 2).map((b) => trim(b.text, 120)),
      gain: 3,
      kbRuleId: 'bullet_length',
    })
  }
  if (textBuzz.length > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: `Fluff / buzzwords detected: "${textBuzz.slice(0, 4).join('", "')}"`,
      why: 'Shreyas Doshi & Big Tech screeners flag adjectives ("visionary", "results-driven") as low-signal fluff.',
      fix: 'Delete adjectives and state facts: years of domain experience, scale, and metrics.',
      evidence: [],
      gain: 3,
      kbRuleId: 'buzzwords',
    })
  }
  if (repeated.length > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: `"${repeated[0][0]}" opens ${repeated[0][1]} different bullets`,
      why: 'Repeating the same opener weakens readability and hides range across discovery, strategy, and shipping.',
      fix: 'Vary openers by PM activity: Discovered, Framed, Prioritized, Prototyped, Shipped, Validated, Monetized.',
      evidence: [],
      gain: 2,
      kbRuleId: 'verb_variety',
    })
  }
  if (fp.length > 0 || passive.length > 1) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: fp.length > 0 ? 'First-person pronouns ("I/we/my") in bullets' : 'Passive voice softens ownership',
      why: 'Resume convention uses crisp active verbs; "we" blurs what you personally drove.',
      fix: 'Start directly with an active past-tense verb showing your personal contribution.',
      evidence: [...fp, ...passive].slice(0, 2).map((b) => trim(b.text, 120)),
      gain: 2,
      kbRuleId: 'active_voice',
    })
  }
  if (nb > 0 && avgWords >= 14 && avgWords <= 28 && long.length < 2) {
    strengths.push(`Concise bullet length (~${round(avgWords)} words avg), easy for 6-second skimming.`)
  }

  // ---- 6. ATS Parseability & Hygiene ---------------------------------------
  const wc = parsed.wordCount
  const pages = input.pageCount ?? null
  const maxPages = marketKb.maxRecommendedPages(targetLevel, totalYears)
  const hasEmail = !!data.basics.email
  const hasPhone = !!data.basics.phone
  const hasLinkedin = !!data.basics.linkedin
  const hasSec = (s: string) => parsed.sectionsFound.includes(s)
  const rolesWithDates = data.experience.filter((x) => x.start).length
  const dateFormats = new Set(
    data.experience
      .flatMap((x) => [x.start, x.end])
      .filter((d) => d && !/present/i.test(d))
      .map((d) => (/^\d{4}$/.test(d) ? 'Y' : /\d{1,2}\/\d{4}/.test(d) ? 'N' : 'M')),
  )

  let ats = 100
  if (wc < 50) ats -= 55
  else if (wc < 140) ats -= 10
  if (!hasEmail) ats -= 15
  if (!hasPhone) ats -= 4
  if (!hasLinkedin) ats -= 5
  if (!hasSec('experience')) ats -= 18
  if (!hasSec('education')) ats -= 6
  if (!hasSec('skills')) ats -= 6
  if (data.experience.length > 0 && rolesWithDates < data.experience.length) ats -= 8
  if (dateFormats.size > 1) ats -= 4
  if (artifacts.weirdChars > 0) ats -= Math.min(12, artifacts.weirdChars * 2)
  if (artifacts.spacedLetters > 0) ats -= 8
  if (artifacts.multiColumnSuspected) ats -= 10
  if (pages && pages > maxPages) ats -= Math.min(14, (pages - maxPages) * 9)
  if (wc > 1050 && maxPages === 1) ats -= 6
  if (input.fileSizeBytes && input.fileSizeBytes > ATS_PLATFORM_KB.greenhouseMaxBytes) ats -= 8
  if (marketKb.strictPiiCheck && artifacts.piiWarnings.length > 0) ats -= Math.min(12, artifacts.piiWarnings.length * 6)
  if (artifacts.rawAbbreviationsOnlyPm) ats -= 4
  ats = clamp(ats)

  if (wc < 50) {
    ctx.push({
      priority: 'P0',
      dimension: 'ats_hygiene',
      title: 'Almost no readable text extracted from resume',
      why: 'Image-based/scanned PDFs or Canva/Figma exports with outlined fonts appear empty to Greenhouse, Lever, and Workday.',
      fix: 'Export a text-selectable single-column PDF or DOCX (LaTeX/Docs).',
      evidence: [],
      gain: 22,
      kbRuleId: 'unreadable_pdf',
    })
  } else if (wc < 140) {
    ctx.push({
      priority: 'P2',
      dimension: 'ats_hygiene',
      title: `Resume is quite sparse (${wc} words)`,
      why: 'Most competitive PM resumes carry 300–650 words of crisp, quantified context.',
      fix: 'Expand your top roles and projects with 3–4 metric-backed bullets.',
      evidence: [],
      gain: 3,
      kbRuleId: 'sparse_resume',
    })
  }
  if (!hasEmail) {
    ctx.push({
      priority: 'P0',
      dimension: 'ats_hygiene',
      title: 'No plain-text email found in header',
      why: 'Workday and Greenhouse often drop contact info placed inside PDF headers/footers or icon graphics.',
      fix: 'Put Name, Email, Phone, Location, and LinkedIn in plain top-of-body text without tables or icon fonts.',
      evidence: [],
      gain: 6,
      kbRuleId: 'missing_email',
    })
  }
  if (!hasSec('experience')) {
    ctx.push({
      priority: 'P0',
      dimension: 'ats_hygiene',
      title: 'No standard "Experience" heading detected',
      why: 'Creative headers ("My Journey", "Where I Made Impact") break section mapping in ATS parsers.',
      fix: 'Use exact literal headings: Summary, Experience, Projects, Education, Skills.',
      evidence: [],
      gain: 9,
      kbRuleId: 'standard_headings',
    })
  }
  if (artifacts.weirdChars > 0 || artifacts.spacedLetters > 0 || artifacts.multiColumnSuspected) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats_hygiene',
      title: 'Multi-column layout or font extraction artifacts detected',
      why: 'Multi-column sidebars cause ATS parsers to read across columns, scrambling skills into job descriptions.',
      fix: 'Switch to a strict single-column layout with standard fonts and zero tables or text boxes.',
      evidence: [],
      gain: 6,
      kbRuleId: 'single_column',
    })
  }
  if (marketKb.strictPiiCheck && artifacts.piiWarnings.length > 0) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats_hygiene',
      title: `Remove personal details (${artifacts.piiWarnings.join(', ')}) for ${marketKb.label}`,
      why: marketKb.piiHint,
      fix: 'Keep only City/Country, email, phone, LinkedIn, and portfolio URL.',
      evidence: artifacts.piiWarnings,
      gain: 5,
      kbRuleId: 'pii_market',
    })
  }
  if (pages && pages > maxPages) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats_hygiene',
      title: `${pages} pages exceeds ${marketKb.label} norm (${maxPages} page${maxPages > 1 ? 's' : ''} max)`,
      why: marketKb.formattingNote,
      fix: `Trim older/low-signal roles and limit each role to 3–4 outcome bullets so it fits ${maxPages} page${maxPages > 1 ? 's' : ''}.`,
      evidence: [],
      gain: 5,
      kbRuleId: 'page_count',
    })
  }
  if (input.fileSizeBytes && input.fileSizeBytes > ATS_PLATFORM_KB.greenhouseMaxBytes) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats_hygiene',
      title: 'File exceeds Greenhouse 2.5 MB parse limit',
      why: 'Greenhouse silently skips parsing resumes larger than 2.5 MB, leaving recruiter fields blank.',
      fix: 'Compress embedded graphics or export a clean text-only PDF (< 500 KB).',
      evidence: [],
      gain: 4,
      kbRuleId: 'greenhouse_size',
    })
  }
  if (artifacts.rawAbbreviationsOnlyPm) {
    ctx.push({
      priority: 'P2',
      dimension: 'ats_hygiene',
      title: 'Spell out "Product Manager" instead of only "PM"',
      why: 'Recruiters run Boolean searches in Lever/Greenhouse for `"Product Manager"` and miss bare `"PM"` abbreviations.',
      fix: 'Use full title "Product Manager" (or "Senior Product Manager") in role headers.',
      evidence: [],
      gain: 2,
      kbRuleId: 'lever_title_boolean',
    })
  }
  if (data.experience.length > 0 && rolesWithDates < data.experience.length) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats_hygiene',
      title: 'Missing parsable date range on one or more roles',
      why: 'ATS systems compute years of experience from explicit start/end dates for recruiter YOE filters.',
      fix: 'Format every role consistently as "Mon YYYY – Mon YYYY" or "Mon YYYY – Present".',
      evidence: data.experience.filter((x) => !x.start).slice(0, 2).map((x) => x.title || x.company),
      gain: 3,
      kbRuleId: 'date_consistency',
    })
  }
  if (hasEmail && hasSec('experience') && !artifacts.multiColumnSuspected && artifacts.weirdChars === 0) {
    strengths.push('Single-column structure, contact details, and standard headings parse cleanly for ATS.')
  }

  // ---- 7. JD / Role Alignment (Optional) -----------------------------------
  const keywordMatch = matchJobDescription(
    data,
    bullets.map((b) => b.text),
    input.jobDescription,
    input.targetRoleTitle,
    pmYears,
  )
  let jdScore = 0
  if (keywordMatch) {
    const skillsOnlyPenalty = keywordMatch.matchedSkillsOnly.length > keywordMatch.matchedInBullets.length ? 6 : 0
    const titleBonus = keywordMatch.titleAlignment === 'strong' ? 6 : keywordMatch.titleAlignment === 'weak' ? -10 : 0
    jdScore = clamp(keywordMatch.percent * 1.12 + titleBonus - skillsOnlyPenalty)

    if (keywordMatch.missing.length > 0 && keywordMatch.percent < 72) {
      ctx.push({
        priority: keywordMatch.percent < 45 ? 'P1' : 'P2',
        dimension: 'jd_match',
        title: `Missing ${keywordMatch.missing.length} key JD terms`,
        why: 'Recruiters search ATS databases using verbatim JD phrases (e.g., exact methodology or domain terms).',
        fix: `Weave true matches directly into Experience bullets (not a keyword dump): ${keywordMatch.missing.slice(0, 8).join(', ')}.`,
        evidence: [],
        gain: round(Math.min(10, (75 - keywordMatch.percent) / 6)),
        kbRuleId: 'jd_keywords',
      })
    } else if (keywordMatch.percent >= 72) {
      strengths.push(`${keywordMatch.percent}% JD keyword coverage across your resume.`)
    }

    if (keywordMatch.matchedSkillsOnly.length >= 3) {
      ctx.push({
        priority: 'P2',
        dimension: 'jd_match',
        title: `${keywordMatch.matchedSkillsOnly.length} JD keywords appear only in Skills, not in bullets`,
        why: 'Human Greenhouse scorecards discount skills listed without experience-bullet proof.',
        fix: `Demonstrate these inside work bullets with outcomes: ${keywordMatch.matchedSkillsOnly.slice(0, 5).join(', ')}.`,
        evidence: [],
        gain: 3,
        kbRuleId: 'skills_vs_bullets',
      })
    }

    if (keywordMatch.seniorityMismatch) {
      ctx.push({
        priority: 'P1',
        dimension: 'jd_match',
        title: 'Potential YOE knock-out gap against JD requirement',
        why: keywordMatch.seniorityMismatch,
        fix: 'Highlight scope/scale prominently in your summary and top role, and verify application YOE knock-out questions.',
        evidence: [],
        gain: 3,
        kbRuleId: 'jd_yoe_gap',
      })
    }
  }

  // ---- Market & Remote Specific KB Insights --------------------------------
  if (market === 'remote_global') {
    const hasTz = REMOTE_SIGNALS.timezone.test(allText)
    const hasAsync = REMOTE_SIGNALS.asyncArtifacts.test(bulletsOnlyText)
    kbInsights.push({
      id: 'market_remote',
      category: 'market',
      status: hasTz && hasAsync ? 'present' : hasAsync || hasTz ? 'partial' : 'missing',
      title: 'Global / US Remote Risk Mitigation',
      detail:
        hasTz && hasAsync
          ? 'Your resume signals distributed/async execution and timezone readiness.'
          : 'Remote hiring managers screen out perceived distance risk. Explicitly note time-zone overlap (e.g. "Open to EST/PST overlap") in your header and highlight async PRDs/RFCs across distributed teams.',
      exampleBullets: [
        'Authored crisp PRDs and async decision docs aligning distributed engineering squads across 3 time zones, cutting sprint handoff delays 30%.',
      ],
    })
  } else {
    kbInsights.push({
      id: 'market_norm',
      category: 'market',
      status: !pages || pages <= maxPages ? 'present' : 'warning',
      title: `${marketKb.label} Formatting & Compliance Norm`,
      detail: marketKb.formattingNote,
    })
  }

  // ---- Track & Archetype & Trending KB Insights ----------------------------
  kbInsights.push({
    id: `track_${track}`,
    category: 'track',
    status: trackKpiShare >= 0.2 && trackToolsInBullets ? 'present' : trackToolsAnywhere ? 'partial' : 'missing',
    title: `${trackKb.label} Playbook`,
    detail: trackKb.summary,
    recommendedKeywords: trackKb.mustHaveTerms,
    exampleBullets: trackKb.exemplarBullets,
  })

  kbInsights.push({
    id: `arch_${archetype}`,
    category: 'archetype',
    status: archHits >= 2 && featureFactoryRoles.length === 0 ? 'present' : 'partial',
    title: `${archKb.label} Fit`,
    detail: `${archKb.coreTheme} ${archKb.pitfallAdvice}`,
    recommendedKeywords: archKb.recommendedKeywords,
  })

  if (aiWashing) {
    kbInsights.push({
      id: 'trend_ai_washing',
      category: 'trending',
      status: 'warning',
      title: '2026 Screener Alert: Prove AI Skills With Evals & Guardrails',
      detail:
        'You mention AI/LLM concepts in your summary or skills without proving them in bullets. Add an evaluation metric (golden eval set, hallucination drop) or rapid prototype story.',
      exampleBullets: [TRENDING_SKILLS_2026[0].exampleBullet, TRENDING_SKILLS_2026[1].exampleBullet],
    })
  }

  kbInsights.push({
    id: 'ats_reality',
    category: 'ats_myth',
    status: 'present',
    title: 'How Greenhouse / Lever / Workday Actually Screen',
    detail:
      'ATS software rarely auto-rejects by keyword density alone — rejections come from (1) scrambled multi-column parsing, (2) missing exact phrases in recruiter Boolean search, and (3) hard YOE/location knock-out questions.',
  })

  // ---- Dynamic Weight Assembly (always sums to 1.0) ------------------------
  const base = archKb.baseWeights
  const activeJdWeight = input.jobDescription && input.jobDescription.trim().length > 60 ? archKb.jdWeight : keywordMatch ? 0.10 : 0
  const scale = 1 - activeJdWeight

  const rawDims: { id: DimensionId; label: string; score: number; w: number; summary: string }[] = [
    {
      id: 'impact',
      label: 'Quantified impact',
      score: impact,
      w: base.impact * scale,
      summary: `${withMetrics}/${nb} bullets quantified · ${withDelta} with before→after delta`,
    },
    {
      id: 'craft',
      label: 'PM craft & track fit',
      score: craft,
      w: base.craft * scale,
      summary: `${provenComps}/8 competencies proven · ${trackKb.label}`,
    },
    {
      id: 'ownership',
      label: 'Ownership & archetype',
      score: ownership,
      w: base.ownership * scale,
      summary: `${round(ownershipShare * 100)}% active verbs · ${round(avgBulletsPerRole * 10) / 10} bullets/role`,
    },
    {
      id: 'ats_hygiene',
      label: 'ATS parseability & hygiene',
      score: ats,
      w: base.ats_hygiene * scale,
      summary: `${parsed.sectionsFound.length} standard sections · ${artifacts.multiColumnSuspected ? 'layout warning' : 'clean layout'}`,
    },
    {
      id: 'experience_fit',
      label: 'Experience & level fit',
      score: expScore,
      w: base.experience_fit * scale,
      summary: `~${pmYears} yrs PM (${totalYears} yrs total) vs ${LEVEL_LABEL[targetLevel]}`,
    },
    {
      id: 'writing',
      label: 'Clarity & conciseness',
      score: writing,
      w: base.writing * scale,
      summary: `${round(avgWords)} words/bullet avg · ${textBuzz.length} buzzwords`,
    },
  ]

  if (keywordMatch && activeJdWeight > 0) {
    rawDims.push({
      id: 'jd_match',
      label: 'JD & role alignment',
      score: jdScore,
      w: activeJdWeight,
      summary: `${keywordMatch.percent}% JD coverage · title fit: ${keywordMatch.titleAlignment}`,
    })
  }

  const verdict = (s: number) => (s >= 80 ? 'Strong' : s >= 62 ? 'Solid, a few fixes' : s >= 42 ? 'Needs work' : 'Critical gap')
  const compress = (s: number) => (s > 84 ? 84 + (s - 84) * 0.72 : s)

  const dimensions: Dimension[] = rawDims.map((d) => ({
    id: d.id,
    label: d.label,
    score: round(compress(d.score)),
    weight: Math.round(d.w * 10000) / 10000,
    verdict: verdict(d.score),
    summary: d.summary,
  }))

  // Normalize weights to exact sum = 1
  const weightSum = dimensions.reduce((s, d) => s + d.weight, 0)
  if (weightSum > 0) dimensions.forEach((d) => (d.weight = d.weight / weightSum))

  // Findings are authored with a rough size in points of their own dimension, which is not what the reader cares about. The overall score
  // is a weighted blend of dimensions, so the honest question is how far the overall score can move. For each dimension: only part of
  // what is missing (REALISM) can fairly be promised, it is shared between that dimension's findings in proportion to their authored
  // size, no finding may claim more than a few times its own size, and the result is scaled by the dimension's weight. A resume at 91
  // therefore never sees a +7, and the sum of all findings can never exceed what the score has left.
  const REALISM = 0.6
  const SIZE_CAP = 2.5
  const byDimension = new Map<string, Finding[]>()
  findings.forEach((f) => byDimension.set(f.dimension, [...(byDimension.get(f.dimension) ?? []), f]))
  byDimension.forEach((list, id) => {
    const dim = dimensions.find((d) => d.id === id)
    if (!dim) { list.forEach((f) => (f.gain = 0)); return }
    const promisable = Math.max(0, 100 - dim.score) * REALISM
    const sizeSum = list.reduce((a, f) => a + Math.max(0, f.gain), 0)
    list.forEach((f) => {
      const share = sizeSum > 0 ? (promisable * Math.max(0, f.gain)) / sizeSum : 0
      f.gain = Math.round(Math.min(share, f.gain * SIZE_CAP) * dim.weight * 10) / 10
    })
  })

  // Point each finding's examples at the exact bullet: which role, and which bullet under it.
  for (const f of findings) {
    const found = f.evidence
      .map((e) => {
        const probe = e.replace(/…$/, '')
        const b = bullets.find((x) => x.text === e || trim(x.text) === e || (probe.length > 20 && x.text.startsWith(probe)))
        return b ? { ref: b.ref, text: b.text } : null
      })
      .filter((x): x is { ref: string; text: string } => x !== null)
    if (found.length > 0) f.evidenceBullets = found
  }

  const overall = round(dimensions.reduce((s, d) => s + d.score * d.weight, 0))
  const grade = overall >= 85 ? 'ship' : overall >= 68 ? 'beta' : overall >= 48 ? 'alpha' : 'prototype'
  const gradeLabel = {
    ship: 'Ready to ship',
    beta: 'Beta · nearly there',
    alpha: 'Alpha · needs iteration',
    prototype: 'Prototype · rebuild the core',
  }[grade]

  const p0 = findings.filter((f) => f.priority === 'P0').length
  const headline =
    nb === 0
      ? 'We could not find experience bullets to score. Ensure the resume is a text-based single-column PDF.'
      : p0 > 0
        ? `${p0} critical blocker${p0 > 1 ? 's' : ''} stand between this resume and a ${archKb.label} interview.`
        : grade === 'ship'
          ? `Strong ${trackKb.label} resume calibrated for ${archKb.label}. Polish and apply.`
          : `${findings.filter((f) => f.priority !== 'P2').length} prioritized fixes can raise this score meaningfully.`

  const order = { P0: 0, P1: 1, P2: 2 }
  findings.sort((a, b) => order[a.priority] - order[b.priority] || b.gain - a.gain)
  findings.forEach((f, i) => (f.id = `${f.priority}-${i + 1}`))

  const careerAnalysis = analyzeCareer({
    parsed: data,
    totalYears,
    background,
    detectedLevel,
    targetLevel,
    bullets,
    competencies,
    trendingSkills,
  })

  const marketStanding = analyzeMarketStanding({
    overall,
    level: targetLevel,
    companyArchetype: archetype,
    market,
    parsed: data,
    bullets,
    trendingSkills,
    findings,
  })

  const impactDimScore = dimensions.find((d) => d.id === 'impact')?.score ?? overall
  const compensation = buildCompensationReport({
    market,
    companyArchetype: archetype,
    level: targetLevel,
    track,
    overall,
    impactScore: impactDimScore,
    currentSalary: input.currentSalary,
    expectedSalary: input.expectedSalary,
  })

  return {
    version: 2,
    overall,
    grade,
    gradeLabel,
    headline,
    contextUsed: {
      level: targetLevel,
      detectedLevel,
      pmExperience: pmBand,
      totalYears,
      track,
      companyArchetype: archetype,
      market,
      background,
    },
    dimensions,
    findings,
    strengths: strengths.slice(0, 6),
    kbInsights,
    trendingSkills,
    competencies,
    bullets,
    keywordMatch,
    careerAnalysis,
    marketStanding,
    compensation,
    stats: {
      words: wc,
      bullets: nb,
      bulletsWithMetrics: withMetrics,
      bulletsWithDelta: withDelta,
      bulletsWithGuardrail: withGuardrail,
      roles: data.experience.length,
      pages,
      avgBulletsPerRole: Math.round(avgBulletsPerRole * 10) / 10,
      avgWordsPerBullet: round(avgWords),
    },
    parsed: data,
  }
}
