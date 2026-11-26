import type {
  BulletReview,
  CandidateBackground,
  CareerAnalysis,
  CareerPoint,
  CompetencyResult,
  Level,
  ProgressionArc,
  ResumeData,
  TrendingSkillResult,
} from '../types.ts'

export interface CareerAnalysisInput {
  parsed: ResumeData
  totalYears: number
  background: CandidateBackground
  detectedLevel: Level
  targetLevel: Level
  bullets: BulletReview[]
  competencies: CompetencyResult[]
  trendingSkills: TrendingSkillResult[]
}

const RANK_PATTERNS: [number, RegExp][] = [
  [4, /\b(vp|vice\s*president|head\s*of\s*product|cpo|chief\s*product|director|group\s*pm|gpm|principal\s*pm|founder|co-founder|ceo)\b/i],
  [3, /\b(senior\s*(?:product\s*manager|pm)|staff\s*pm|lead\s*(?:product\s*manager|pm)|spm)\b/i],
  [2, /\b(product\s*manager|product\s*owner|pm\b)\b/i],
  [1, /\b(associate\s*(?:product\s*manager|pm)|apm|junior\s*pm|product\s*analyst|intern)\b/i],
]

function titleRank(title: string): number {
  for (const [rank, re] of RANK_PATTERNS) {
    if (re.test(title)) return rank
  }
  return 0
}

function isTempRole(title: string): boolean {
  return /\b(intern|internship|co-op|contract|freelance|fellow|apprentice)\b/i.test(title)
}

export function analyzeCareer(input: CareerAnalysisInput): CareerAnalysis {
  const { parsed, totalYears, background, targetLevel, bullets, competencies, trendingSkills } = input
  const roles = parsed.experience

  // Tenure stats
  const durations = roles.map((r) => r.months).filter((m): m is number => m !== null && m > 0)
  const avgMonthsPerRole = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
  const longestRoleMonths = durations.length > 0 ? Math.max(...durations) : null
  const shortStintsCount = roles.filter((r) => !isTempRole(r.title) && r.months !== null && r.months > 0 && r.months < 12).length

  // Progression arc
  const hasFounderRole = roles.some((r) => /\b(founder|co-founder|ceo)\b/i.test(r.title))
  const hasPmRole = roles.some((r) => /\b(product\s*manager|product\s*owner|apm|gpm|head\s*of\s*product|pm\b)\b/i.test(r.title))
  const newestRank = roles[0] ? titleRank(roles[0].title) : 0
  const oldestRank = roles.length > 1 ? titleRank(roles[roles.length - 1].title) : newestRank
  const newestMonths = roles[0]?.months ?? 0

  let progressionArc: ProgressionArc = 'ascending'
  let progressionLabel = 'Ascending PM Trajectory'
  let progressionSummary = 'Your career shows steady scope expansion across roles.'

  if (background === 'founder' || (hasFounderRole && hasPmRole)) {
    progressionArc = 'founder_to_pm'
    progressionLabel = 'Founder / Builder → Product Leader'
    progressionSummary =
      'Combines 0→1 founder ownership and commercial accountability with structured PM execution — highly valued by startups and scale-ups.'
  } else if (background !== 'practicing_pm' && background !== 'auto' && !hasPmRole) {
    progressionArc = 'transitioning_into_pm'
    progressionLabel = `Career Switcher (${background.replace('_', ' ')}) → PM`
    progressionSummary =
      'Transitioning from an adjacent domain into formal product management; hiring managers will look for product sense, user discovery, and outcome ownership.'
  } else if (totalYears < 2.5 && roles.length <= 2) {
    progressionArc = 'early_career'
    progressionLabel = 'Early-Career / APM Trajectory'
    progressionSummary = 'Building foundational product execution and metric ownership early in your career.'
  } else if (roles.length >= 2 && oldestRank > 0 && newestRank <= oldestRank && newestMonths >= 42) {
    progressionArc = 'plateau'
    progressionLabel = 'Extended Tenure at Same Title Level'
    progressionSummary = `Spent ${Math.round(newestMonths / 12)}+ years in your current role without a visible title jump; emphasize expanded scope (multi-squad, P&L, mentoring) to avoid plateau perception.`
  } else if (newestRank > oldestRank && oldestRank > 0) {
    progressionArc = 'ascending'
    progressionLabel = 'Ascending PM Trajectory'
    progressionSummary = 'Clear upward progression in product scope and seniority across your career.'
  }

  // Bullet quality by recency
  const expBullets = bullets.filter((b) => b.section === 'experience')
  const recentBullets = expBullets.filter((b) => b.roleIndex <= 1)
  const olderBullets = expBullets.filter((b) => b.roleIndex >= 2)
  const currentRoleBullets = expBullets.filter((b) => b.roleIndex === 0)

  const metricRate = (arr: BulletReview[]) => (arr.length ? arr.filter((b) => b.hasMetric).length / arr.length : 0)
  const overallMetricRate = metricRate(expBullets)
  const recentMetricRate = metricRate(recentBullets)
  const olderMetricRate = metricRate(olderBullets)

  const provenComps = competencies.filter((c) => c.proven)
  const listedOnlyComps = competencies.filter((c) => !c.proven && c.inSummaryOrSkillsOnly)
  const missingComps = competencies.filter((c) => !c.proven && !c.inSummaryOrSkillsOnly)

  const provenTrends = trendingSkills.filter((t) => t.status === 'proven_in_bullets')
  const listedOnlyTrends = trendingSkills.filter((t) => t.status === 'listed_only')

  const positives: CareerPoint[] = []
  const negatives: CareerPoint[] = []

  // --- Positives ---
  if (progressionArc === 'founder_to_pm') {
    positives.push({
      title: '0→1 Founder & End-to-End Ownership',
      detail: 'Founder/builder experience signals high agency, customer empathy, and P&L awareness that pure feature PMs often lack.',
    })
  } else if (progressionArc === 'ascending' && roles.length >= 2) {
    positives.push({
      title: 'Clear Upward Scope Progression',
      detail: `Progressed from ${roles[roles.length - 1].title} to ${roles[0].title} across ${roles.length} roles.`,
    })
  }

  if (overallMetricRate >= 0.6 && expBullets.length >= 4) {
    positives.push({
      title: 'Strong Quantified Impact Track Record',
      detail: `${Math.round(overallMetricRate * 100)}% of your experience bullets include concrete numbers or outcomes.`,
    })
  }

  const deltaBullets = expBullets.filter((b) => b.hasBaselineDelta).length
  if (deltaBullets >= 2) {
    positives.push({
      title: 'Outcome-Oriented Storytelling (Before → After Deltas)',
      detail: `${deltaBullets} bullets show clear baseline-to-target movement rather than vague "improved X" claims.`,
    })
  }

  if (provenComps.length >= 5) {
    positives.push({
      title: `Well-Rounded PM Craft (${provenComps.length}/8 Pillars Proven)`,
      detail: `Demonstrated ${provenComps.slice(0, 4).map((c) => c.label).join(', ')} inside work bullets.`,
    })
  }

  if (avgMonthsPerRole !== null && avgMonthsPerRole >= 20 && shortStintsCount === 0 && roles.length >= 2) {
    positives.push({
      title: 'High Tenure Stability',
      detail: `Average tenure of ${avgMonthsPerRole} months per role with zero sub-1-year stints shows you stay long enough to own outcomes.`,
    })
  }

  if (provenTrends.length >= 1) {
    positives.push({
      title: '2026 Modern PM Readiness',
      detail: `Proven hands-on execution in ${provenTrends.map((t) => t.label).join(', ')}.`,
    })
  }

  // --- Negatives / Narrative Risks ---
  if (currentRoleBullets.length >= 5 && metricRate(currentRoleBullets) < 0.5) {
    negatives.push({
      title: 'Current Role Reads Like a Feature Factory',
      detail: `Your most recent role (${roles[0]?.company || 'current'}) has ${currentRoleBullets.length} bullets, but fewer than half prove business/metric impact.`,
    })
  }

  if (olderBullets.length >= 3 && recentBullets.length >= 3 && olderMetricRate - recentMetricRate >= 0.25) {
    negatives.push({
      title: 'Stronger Metrics in Older Roles Than Recent Ones',
      detail: `Older roles have ${Math.round(olderMetricRate * 100)}% metric coverage vs. ${Math.round(recentMetricRate * 100)}% in recent roles — flip this so your latest impact leads.`,
    })
  }

  if (shortStintsCount >= 2) {
    negatives.push({
      title: `Job-Hopping / Short-Stint Risk (${shortStintsCount} roles < 12 mos)`,
      detail: 'Multiple sub-1-year stints make hiring managers question whether you stayed long enough to see product bets play out.',
    })
  }

  if (progressionArc === 'plateau') {
    negatives.push({
      title: 'Title / Scope Plateau Risk',
      detail: 'Extended time at the same title without clear scope expansion (multi-team ownership, pricing, or org leadership) can cap you below Senior/Lead bands.',
    })
  }

  if (listedOnlyTrends.length > 0 || listedOnlyComps.length > 0) {
    const names = [...listedOnlyTrends.map((t) => t.label), ...listedOnlyComps.map((c) => c.label)].slice(0, 3)
    negatives.push({
      title: 'Skills Listed Without Bullet Proof',
      detail: `${names.join(', ')} appear in Skills/Summary but lack quantified execution bullets — screeners treat unbacked skills as buzzwords.`,
    })
  }

  const criticalMissing = missingComps.filter((c) =>
    ['strategy', 'data', 'discovery', 'execution'].includes(c.id),
  )
  if (criticalMissing.length >= 1 && (targetLevel === 'senior' || targetLevel === 'lead' || expBullets.length >= 4)) {
    negatives.push({
      title: `Under-Evidenced Core Pillar${criticalMissing.length > 1 ? 's' : ''}: ${criticalMissing.map((c) => c.label).join(', ')}`,
      detail: criticalMissing[0].missingHint,
    })
  }

  if (overallMetricRate < 0.4 && expBullets.length >= 3) {
    negatives.push({
      title: 'Low Metric Density Across Career',
      detail: `Only ${Math.round(overallMetricRate * 100)}% of experience bullets contain quantified outcomes (target 65%+ for competitive PM loops).`,
    })
  }

  return {
    progressionArc,
    progressionLabel,
    progressionSummary,
    tenureStats: {
      totalRoles: roles.length,
      careerSpanYears: totalYears,
      avgMonthsPerRole,
      longestRoleMonths,
      shortStintsCount,
    },
    positives: positives.slice(0, 5),
    negatives: negatives.slice(0, 5),
    competencyBalance: {
      proven: provenComps.map((c) => c.label),
      listedOnly: listedOnlyComps.map((c) => c.label),
      missing: missingComps.map((c) => c.label),
    },
  }
}
