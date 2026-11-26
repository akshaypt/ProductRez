import { COMP_BENCHMARKS, COMP_METHODOLOGY_NOTE, MARKET_COMP_META, TRACK_COMP_PREMIUM, type CompBandDef } from '../kb/compensation.ts'
import type {
  CompanyArchetype,
  CompensationReport,
  CurrentSalaryVerdict,
  ExpectedSalaryVerdict,
  Level,
  MarketRegion,
  PmTrack,
  SalaryComparison,
  ScoreReport,
} from '../types.ts'

export interface CompInput {
  market: MarketRegion
  companyArchetype: CompanyArchetype
  level: Level
  track: PmTrack
  overall: number
  impactScore: number
  currentSalary?: number
  expectedSalary?: number
}

const ARCHETYPE_LABEL: Record<CompanyArchetype, string> = {
  early_startup: 'Early-Stage Startup',
  scaleup: 'Scale-up',
  maang: 'MAANG / Tier-1',
  enterprise: 'Enterprise',
}

const LEVEL_LABEL: Record<Level, string> = {
  apm: 'APM',
  pm: 'PM',
  senior: 'Senior PM',
  lead: 'Lead / Group PM',
}

const TRACK_LABEL: Record<PmTrack, string> = {
  generalist: 'Generalist',
  ai_ml: 'AI / ML',
  growth_plg: 'Growth / PLG',
  b2b_saas: 'B2B SaaS',
  platform_api: 'Platform / API',
  fintech: 'Fintech',
}

function scaleBand(b: CompBandDef, pct: number): CompBandDef {
  const m = 1 + pct / 100
  return {
    min: Math.round(b.min * m),
    p25: Math.round(b.p25 * m),
    median: Math.round(b.median * m),
    p75: Math.round(b.p75 * m),
    max: Math.round(b.max * m),
  }
}

function formatMoney(amount: number, currency: 'INR' | 'USD'): string {
  return currency === 'INR' ? `₹${amount}L` : `$${amount}k`
}

function interpolatePercentile(amount: number, b: CompBandDef): number {
  if (amount <= b.min) {
    const ratio = b.min > 0 ? amount / b.min : 0
    return Math.max(1, Math.round(ratio * 10))
  }
  if (amount <= b.p25) {
    return Math.round(10 + ((amount - b.min) / Math.max(1, b.p25 - b.min)) * 15)
  }
  if (amount <= b.median) {
    return Math.round(25 + ((amount - b.p25) / Math.max(1, b.median - b.p25)) * 25)
  }
  if (amount <= b.p75) {
    return Math.round(50 + ((amount - b.median) / Math.max(1, b.p75 - b.median)) * 25)
  }
  if (amount <= b.max) {
    return Math.round(75 + ((amount - b.p75) / Math.max(1, b.max - b.p75)) * 20)
  }
  const overRatio = (amount - b.max) / Math.max(1, b.max * 0.25)
  return Math.min(99, Math.round(95 + overRatio * 4))
}

function evaluateSalaryPair(
  marketBand: CompBandDef,
  calibrated: { low: number; high: number },
  currency: 'INR' | 'USD',
  unitLabel: string,
  overall: number,
  currentSalary?: number,
  expectedSalary?: number,
): SalaryComparison | null {
  if (currentSalary === undefined && expectedSalary === undefined) return null

  const out: SalaryComparison = { currency, unitLabel }

  if (currentSalary !== undefined && currentSalary > 0) {
    const p = interpolatePercentile(currentSalary, marketBand)
    const gapVsMedian = Math.round(currentSalary - marketBand.median)

    let verdict: CurrentSalaryVerdict
    let verdictLabel: string
    let summary: string

    if (p < 25) {
      verdict = 'significantly_underpaid'
      verdictLabel = 'Underpaid (Bottom Quartile)'
      summary = `At ${formatMoney(currentSalary, currency)}, you are ~${formatMoney(Math.abs(gapVsMedian), currency)} below the market median (${formatMoney(marketBand.median, currency)}) for this profile.`
    } else if (p < 42) {
      verdict = 'underpaid'
      verdictLabel = 'Slightly Underpaid'
      summary = `At ${formatMoney(currentSalary, currency)} (${p}th percentile), you sit below the ${formatMoney(marketBand.median, currency)} market median — you have strong room to step up on your next switch.`
    } else if (p <= 65) {
      verdict = 'decent'
      verdictLabel = 'Decent / Market Fair'
      summary = `${formatMoney(currentSalary, currency)} sits right around the market median (${formatMoney(marketBand.median, currency)}, ${p}th percentile) for your cohort.`
    } else if (p <= 85) {
      verdict = 'good'
      verdictLabel = 'Good / Above Market Median'
      summary = `${formatMoney(currentSalary, currency)} puts you in the upper half (${p}th percentile), ${formatMoney(gapVsMedian, currency)} above the cohort median.`
    } else {
      verdict = 'top_of_band'
      verdictLabel = 'Top of Band'
      summary = `${formatMoney(currentSalary, currency)} is in the top 15% (${p}th percentile) for this level and company type.`
    }

    out.currentSalary = {
      amount: currentSalary,
      percentileInBand: p,
      verdict,
      verdictLabel,
      gapVsMedian,
      summary,
    }
  }

  if (expectedSalary !== undefined && expectedSalary > 0) {
    const p = interpolatePercentile(expectedSalary, marketBand)
    const deltaVsCurrentPercent =
      currentSalary !== undefined && currentSalary > 0
        ? Math.round(((expectedSalary - currentSalary) / currentSalary) * 100)
        : null

    let verdict: ExpectedSalaryVerdict
    let verdictLabel: string
    let summary: string
    let actionNote: string

    if (expectedSalary <= calibrated.low || p <= 38) {
      verdict = 'easy'
      verdictLabel = 'Easy — You May Be Under-Asking'
      summary = `${formatMoney(expectedSalary, currency)} sits at the ${p}th percentile, below your resume-calibrated range (${formatMoney(calibrated.low, currency)}–${formatMoney(calibrated.high, currency)}).`
      actionNote = `Your resume supports anchoring closer to ${formatMoney(calibrated.high, currency)} without pricing yourself out.`
    } else if (expectedSalary <= calibrated.high * 1.05 && p <= 78) {
      verdict = 'achievable'
      verdictLabel = 'Achievable — Well Calibrated'
      summary = `${formatMoney(expectedSalary, currency)} (${p}th percentile) aligns well with your target cohort and current resume strength (${overall}/100).`
      actionNote =
        deltaVsCurrentPercent !== null && deltaVsCurrentPercent > 40
          ? `Note: this is a +${deltaVsCurrentPercent}% jump over your current comp — anchor on market band and scope rather than current CTC.`
          : 'Solid anchor for recruiter screens and offer negotiation.'
    } else if (expectedSalary <= marketBand.max * 1.06) {
      verdict = 'stretch'
      verdictLabel = 'Stretch — Needs Top-Quartile Execution'
      summary = `${formatMoney(expectedSalary, currency)} (${p}th percentile) pushes near the upper ceiling (${formatMoney(marketBand.max, currency)}) for this cohort.`
      actionNote =
        overall < 78
          ? `Strengthen your top resume gaps first to clear screeners at this comp, and prepare strong case-study proof for final loops.`
          : `Achievable at top-paying companies in this tier if you negotiate competing offers or equity.`
    } else {
      verdict = 'inflated'
      verdictLabel = 'Inflated for Selected Cohort'
      summary = `${formatMoney(expectedSalary, currency)} exceeds the typical ${formatMoney(marketBand.max, currency)} ceiling for this level and company stage.`
      actionNote = `To justify ${formatMoney(expectedSalary, currency)}, target the next level up, switch to a higher-paying archetype (e.g., MAANG/Scale-up), or add AI/ML & P&L scope.`
    }

    out.expectedSalary = {
      amount: expectedSalary,
      percentileInBand: p,
      verdict,
      verdictLabel,
      deltaVsCurrentPercent,
      summary,
      actionNote,
    }
  }

  return out
}

export function buildCompensationReport(input: CompInput): CompensationReport {
  const { market, companyArchetype, level, track, overall, impactScore, currentSalary, expectedSalary } = input
  const meta = MARKET_COMP_META[market]
  const baseBand = COMP_BENCHMARKS[market][companyArchetype][level]
  const trackMeta = TRACK_COMP_PREMIUM[track]
  const marketBand = scaleBand(baseBand, trackMeta.premiumPercent)

  const resumeStrength = 0.65 * overall + 0.35 * impactScore
  let low: number
  let high: number
  let quartileNote: string

  if (resumeStrength >= 84) {
    low = marketBand.median
    high = Math.round(marketBand.p75 + (marketBand.max - marketBand.p75) * 0.45)
    quartileNote = 'Strong metric & craft proof positions you in the upper quartile (50th–85th percentile) of this band.'
  } else if (resumeStrength >= 68) {
    low = Math.round(marketBand.p25 + (marketBand.median - marketBand.p25) * 0.4)
    high = marketBand.p75
    quartileNote = 'Competitive resume places you around the market median to 75th percentile.'
  } else if (resumeStrength >= 50) {
    low = Math.round(marketBand.min + (marketBand.p25 - marketBand.min) * 0.4)
    high = marketBand.median
    quartileNote = 'Moderate impact proof anchors you in the lower-to-mid half; stronger metric deltas unlock median+ offers.'
  } else {
    low = marketBand.min
    high = marketBand.p25
    quartileNote = 'Weak impact proof risks down-leveling or bottom-quartile offers until bullets are quantified.'
  }

  const cohortLabel = `${LEVEL_LABEL[level]} · ${TRACK_LABEL[track]} · ${ARCHETYPE_LABEL[companyArchetype]} · ${market === 'india' ? 'India' : market === 'us' ? 'US' : 'Remote Global'}`

  const comparison = evaluateSalaryPair(
    marketBand,
    { low, high },
    meta.currency,
    meta.unitLabel,
    overall,
    currentSalary,
    expectedSalary,
  )

  return {
    currency: meta.currency,
    unitLabel: meta.unitLabel,
    cohortLabel,
    marketBand,
    resumeCalibratedBand: { low, high, quartileNote },
    baseVsTotalNote: meta.baseVsTotalNote,
    trackPremiumPercent: trackMeta.premiumPercent,
    trackPremiumNote: trackMeta.note,
    methodologyNote: COMP_METHODOLOGY_NOTE,
    comparison,
  }
}

/**
 * Post-score helper: run or re-run the "Check if your expectations are right" comparison
 * against an already-computed ScoreReport without re-scoring the resume.
 */
export function compareSalaryExpectations(
  report: ScoreReport,
  salaries: { currentSalary?: number; expectedSalary?: number },
): CompensationReport {
  const impactDim = report.dimensions.find((d) => d.id === 'impact')
  return buildCompensationReport({
    market: report.contextUsed.market,
    companyArchetype: report.contextUsed.companyArchetype,
    level: report.contextUsed.level,
    track: report.contextUsed.track,
    overall: report.overall,
    impactScore: impactDim?.score ?? report.overall,
    currentSalary: salaries.currentSalary,
    expectedSalary: salaries.expectedSalary,
  })
}
