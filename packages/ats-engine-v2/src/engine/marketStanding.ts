import { TRACK_KB } from '../kb/tracks.ts'
import { TRENDING_SKILLS_2026 } from '../kb/trends.ts'
import type {
  BulletReview,
  CompanyArchetype,
  Finding,
  Level,
  MarketRegion,
  MarketStanding,
  MarketTier,
  PmTrack,
  ResumeData,
  TrackReadiness,
  TrendingSkillResult,
} from '../types.ts'

export interface MarketStandingInput {
  overall: number
  level: Level
  companyArchetype: CompanyArchetype
  market: MarketRegion
  parsed: ResumeData
  bullets: BulletReview[]
  trendingSkills: TrendingSkillResult[]
  findings: Finding[]
}

const ARCHETYPE_BAR: Record<CompanyArchetype, number> = {
  early_startup: -2,
  enterprise: 0,
  scaleup: 2,
  maang: 5,
}

const MARKET_BAR: Record<MarketRegion, number> = {
  india: 0,
  remote_global: 1,
  us: 2,
}

const LEVEL_BAR: Record<Level, number> = {
  apm: -2,
  pm: 0,
  senior: 2,
  lead: 4,
}

const ARCHETYPE_LABEL: Record<CompanyArchetype, string> = {
  early_startup: 'Early-Stage Startup',
  scaleup: 'Growth Scale-up',
  maang: 'MAANG / Tier-1 Big Tech',
  enterprise: 'Enterprise / Legacy Tech',
}

const MARKET_LABEL: Record<MarketRegion, string> = {
  india: 'India',
  us: 'United States',
  remote_global: 'Remote Global',
}

const LEVEL_LABEL: Record<Level, string> = {
  apm: 'APM',
  pm: 'PM',
  senior: 'Senior PM',
  lead: 'Lead / Group PM',
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function scoreToPercentile(effectiveScore: number): number {
  // Piecewise monotonic curve mapping 0..100 effective score -> 2..99 percentile
  if (effectiveScore >= 90) return clamp(90 + (effectiveScore - 90) * 0.9, 90, 99)
  if (effectiveScore >= 78) return clamp(75 + ((effectiveScore - 78) / 12) * 15, 75, 90)
  if (effectiveScore >= 62) return clamp(50 + ((effectiveScore - 62) / 16) * 25, 50, 75)
  if (effectiveScore >= 45) return clamp(22 + ((effectiveScore - 45) / 17) * 28, 22, 50)
  return clamp(2 + (effectiveScore / 45) * 20, 2, 22)
}

export function analyzeMarketStanding(input: MarketStandingInput): MarketStanding {
  const { overall, level, companyArchetype, market, parsed, bullets, trendingSkills, findings } = input

  const barShift = ARCHETYPE_BAR[companyArchetype] + MARKET_BAR[market] + LEVEL_BAR[level]
  const effectiveScore = overall - barShift
  const percentile = scoreToPercentile(effectiveScore)

  let tier: MarketTier = 'developing'
  let tierLabel = 'Bottom 50% — Filtered Out by Screeners'
  if (percentile >= 90) {
    tier = 'top_10'
    tierLabel = `Top ${Math.max(1, 100 - percentile)}% — Tier-1 Interview Ready`
  } else if (percentile >= 75) {
    tier = 'top_25'
    tierLabel = `Top ${100 - percentile}% — Competitive Shortlist Pool`
  } else if (percentile >= 50) {
    tier = 'top_50'
    tierLabel = `Top ${100 - percentile}% — Average / Needs Differentiation`
  }

  const benchmarkCohort = `${LEVEL_LABEL[level]} · ${ARCHETYPE_LABEL[companyArchetype]} · ${MARKET_LABEL[market]}`

  const summary =
    tier === 'top_10'
      ? `Your resume outperforms ~${percentile}% of ${benchmarkCohort} applicants on metric proof, ownership scope, and 2026 PM signals.`
      : tier === 'top_25'
        ? `You beat ~${percentile}% of ${benchmarkCohort} resumes. You will pass most ATS filters, though targeted fixes will sharpen recruiter callbacks.`
        : tier === 'top_50'
          ? `You sit around the ${percentile}th percentile for ${benchmarkCohort} — strong enough to pass basic formatting checks, but likely losing out to metric-dense peers.`
          : `At the ${percentile}th percentile for ${benchmarkCohort}, most ATS and hiring manager screens will filter this out before interviews.`

  // Track readiness across all 6 PM tracks
  const bulletsText = bullets.map((b) => b.text).join('\n')
  const allText = [
    parsed.basics.headline,
    parsed.summary,
    bulletsText,
    parsed.skills.map((s) => s.items).join(' '),
  ].join('\n')

  const trackReadiness: TrackReadiness[] = (Object.keys(TRACK_KB) as PmTrack[])
    .map((trackKey) => {
      const kb = TRACK_KB[trackKey]
      const kpiHits = bullets.filter((b) => kb.coreKpisPattern.test(b.text)).length
      const kpiScore = bullets.length > 0 ? Math.min(1, kpiHits / Math.max(2, bullets.length * 0.28)) : 0
      const toolsInBullets = kb.toolsPattern.test(bulletsText) ? 1 : kb.toolsPattern.test(allText) ? 0.6 : 0.2

      const mustHits = kb.mustHaveTerms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(allText)).length
      const mustScore = kb.mustHaveTerms.length > 0 ? Math.min(1, mustHits / Math.min(4, kb.mustHaveTerms.length)) : 0.5

      const trackTrendIds = TRENDING_SKILLS_2026.filter((t) => t.highRelevanceTracks.includes(trackKey)).map((t) => t.id)
      const provenTrackTrends = trendingSkills.filter((t) => trackTrendIds.includes(t.id) && t.status === 'proven_in_bullets').length
      const trendScore = trackTrendIds.length > 0 ? Math.min(1, provenTrackTrends / Math.min(2, trackTrendIds.length)) : 0.7

      const raw = 100 * (0.38 * kpiScore + 0.24 * mustScore + 0.20 * toolsInBullets + 0.18 * trendScore)
      // Blend slightly with overall resume craft so weak bullets don't score 90 on a track
      const readinessScore = clamp(0.75 * raw + 0.25 * overall, 15, 98)

      const fitLabel: TrackReadiness['fitLabel'] =
        readinessScore >= 75 ? 'strong' : readinessScore >= 55 ? 'competitive' : 'developing'

      let keyGap: string | null = null
      if (readinessScore < 80) {
        if (kpiHits === 0) {
          keyGap = `Add ${kb.label} KPIs (${kb.mustHaveTerms.slice(0, 3).join(', ')}) inside bullets.`
        } else if (provenTrackTrends === 0 && trackTrendIds.length > 0) {
          const missingTrend = trendingSkills.find((t) => trackTrendIds.includes(t.id) && t.status !== 'proven_in_bullets')
          keyGap = missingTrend ? `Prove ${missingTrend.label} in a work bullet.` : `Deepen ${kb.recommendedTools.slice(0, 2).join(' / ')} proof.`
        } else {
          keyGap = `Surface ${kb.recommendedTools.slice(0, 2).join(', ')} with outcome deltas.`
        }
      }

      return {
        track: trackKey,
        label: kb.label,
        readinessScore,
        fitLabel,
        keyGap,
      }
    })
    .sort((a, b) => b.readinessScore - a.readinessScore)

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

  const topFindings = findings.slice(0, 2)
  const topGain = topFindings.reduce((sum, f) => sum + f.gain, 0)
  const targetPercentile = Math.min(99, percentile + Math.max(1, Math.round(topGain * 1.5)))
  const nextBracketLever =
    topFindings.length === 0
      ? 'You are already in the top tier — tailor keywords per JD to maximize shortlist rate.'
      : `Fixing "${topFindings.map((f) => f.title).join('" + "')}" (about ${topGain < 0.5 ? 'under 1' : `+${Math.max(1, Math.round(topGain))}`} point${topGain >= 1.5 ? 's' : ''} on your overall score) can move you toward the ${ordinal(targetPercentile)} percentile.`

  return {
    percentile,
    tier,
    tierLabel,
    benchmarkCohort,
    summary,
    trackReadiness,
    nextBracketLever,
  }
}
