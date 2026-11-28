// Pure TypeScript types for the ProductRez PM ATS Scoring Engine & Knowledge Base.
// Zero DOM / Node / Deno dependencies so the engine runs in browser, Node, and Edge Functions.

export type TargetLevel = 'auto' | 'apm' | 'pm' | 'senior' | 'lead'
export type Level = Exclude<TargetLevel, 'auto'>

export type PmTrack =
  | 'generalist'
  | 'ai_ml'
  | 'growth_plg'
  | 'b2b_saas'
  | 'platform_api'
  | 'fintech'

export type CompanyArchetype =
  | 'early_startup'
  | 'scaleup'
  | 'maang'
  | 'enterprise'

export type MarketRegion =
  | 'india'
  | 'us'
  | 'remote_global'

export type CandidateBackground =
  | 'auto'
  | 'practicing_pm'
  | 'engineering'
  | 'design'
  | 'business_ops'
  | 'analytics'
  | 'founder'
  | 'mba_grad'

export type PmExperienceBand =
  | 'auto'
  | 'transitioning' // 0 yrs formal PM
  | '0_2'           // < 2 yrs PM
  | '2_5'           // 2-5 yrs PM
  | '5_8'           // 5-8 yrs PM
  | '8_plus'        // 8+ yrs PM

export interface ScoreInput {
  /** Extracted plain text from PDF/DOCX or pasted text */
  text: string
  /** Optional raw file metadata for ATS limits (e.g., Greenhouse 2.5 MB limit) */
  source?: 'pdf' | 'docx' | 'paste'
  pageCount?: number
  fileSizeBytes?: number

  /** Tier 1: Essential PM calibration */
  targetLevel?: TargetLevel
  pmExperience?: PmExperienceBand
  totalYearsOverride?: number

  /** Tier 2: High-impact context selectors */
  track?: PmTrack
  companyArchetype?: CompanyArchetype
  market?: MarketRegion
  background?: CandidateBackground

  /** Tier 3: Role-specific ATS matching */
  targetRoleTitle?: string
  jobDescription?: string

  /** Optional post-score compensation comparison (NEVER affects the 0-100 resume score) */
  currentSalary?: number
  expectedSalary?: number
}

export interface Basics {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin: string
  portfolio: string
  github: string
  website: string
}

export interface ExperienceItem {
  id: string
  company: string
  title: string
  location: string
  start: string
  end: string
  months: number | null
  bullets: string[]
}

export interface ProjectItem {
  id: string
  name: string
  tag: string
  link: string
  bullets: string[]
}

export interface EducationItem {
  id: string
  school: string
  degree: string
  location: string
  start: string
  end: string
  details: string
}

export interface SkillGroup {
  id: string
  label: string
  items: string
}

export interface ResumeData {
  basics: Basics
  summary: string
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  skills: SkillGroup[]
  extras: { id: string; title: string; items: string[] }[]
}

export interface ParseArtifacts {
  weirdChars: number
  spacedLetters: number
  pipeCount: number
  multiColumnSuspected: boolean
  piiWarnings: string[]
  rawAbbreviationsOnlyPm: boolean
}

export interface ParseResult {
  data: ResumeData
  lines: string[]
  sectionsFound: string[]
  wordCount: number
  artifacts: ParseArtifacts
}

export type DimensionId =
  | 'ats_hygiene'
  | 'experience_fit'
  | 'impact'
  | 'craft'
  | 'ownership'
  | 'writing'
  | 'jd_match'

export type Priority = 'P0' | 'P1' | 'P2'

export interface Dimension {
  id: DimensionId
  label: string
  /** 0-100 calibrated score */
  score: number
  /** Normalized weight summing to 1 across active dimensions */
  weight: number
  verdict: string
  summary: string
}

export type BulletFlag =
  | 'no-metric'
  | 'no-baseline-delta'
  | 'weak-verb'
  | 'no-verb'
  | 'too-long'
  | 'too-short'
  | 'first-person'
  | 'passive'
  | 'buzzword'
  | 'missing-guardrail'
  | 'activity-only'

export interface BulletReview {
  text: string
  section: 'experience' | 'projects' | 'other'
  context: string
  roleIndex: number
  /** Position inside its role or project, counting from 1, so a finding can point at "bullet 3 under Acme". */
  index: number
  /** Human-readable pointer to this bullet, e.g. "Senior PM · Acme · bullet 3". */
  ref: string
  /**
   * True when the bullet claims a result ("improved", "reduced", "grew") without a number to back it. Bullets that only describe what was
   * built, designed or led are not expected to carry a metric, so this is false for them.
   */
  needsMetric: boolean
  /** 0 = weak activity, 1 = partial outcome or scope only, 2 = quantified, 3 = outcome + baseline/timeframe (+ guardrail bonus) */
  impact: 0 | 1 | 2 | 3
  words: number
  hasMetric: boolean
  hasBaselineDelta: boolean
  hasGuardrail: boolean
  hasTrackKpi: boolean
  flags: BulletFlag[]
  competencies: string[]
  trendingSignals: string[]
}

export interface Finding {
  id: string
  priority: Priority
  dimension: DimensionId
  title: string
  why: string
  fix: string
  evidence: string[]
  /** The bullets behind `evidence`, with their position, so the reader knows which line is meant. */
  evidenceBullets?: { ref: string; text: string }[]
  /**
   * Estimated change to the overall 0-100 score if this is fixed. Converted from the finding's dimension-level size using the
   * dimension's weight and the headroom left in it, so it is never larger than what the score can actually move.
   */
  gain: number
  kbRuleId?: string
}

export interface KbInsight {
  id: string
  category: 'trending' | 'track' | 'archetype' | 'market' | 'ats_myth' | 'pm_craft'
  status: 'present' | 'partial' | 'missing' | 'warning'
  title: string
  detail: string
  exampleBullets?: string[]
  recommendedKeywords?: string[]
}

export interface CompetencyResult {
  id: string
  label: string
  hits: number
  inSummaryOrSkillsOnly: boolean
  proven: boolean
  interviewSignal: string
  missingHint: string
}

export interface TrendingSkillResult {
  id: string
  label: string
  relevance: 'core' | 'high' | 'bonus'
  status: 'proven_in_bullets' | 'listed_only' | 'missing'
  matchedTerms: string[]
  suggestion: string
  exampleBullet: string
}

export interface KeywordMatch {
  matchedInBullets: string[]
  matchedSkillsOnly: string[]
  missing: string[]
  requiredYearsInJd: number | null
  seniorityMismatch: string | null
  titleAlignment: 'strong' | 'partial' | 'weak' | 'unknown'
  percent: number
}

export interface InputFieldSpec {
  key: keyof ScoreInput
  tier: 'required' | 'context' | 'optional_targeting'
  label: string
  required: boolean
  defaultValue?: string
  options?: { value: string; label: string; impactNote: string }[]
  whyCollected: string
}

export type ProgressionArc =
  | 'ascending'
  | 'founder_to_pm'
  | 'transitioning_into_pm'
  | 'plateau'
  | 'early_career'

export interface CareerPoint {
  title: string
  detail: string
  evidence?: string
}

export interface CareerAnalysis {
  progressionArc: ProgressionArc
  progressionLabel: string
  progressionSummary: string
  tenureStats: {
    totalRoles: number
    careerSpanYears: number
    avgMonthsPerRole: number | null
    longestRoleMonths: number | null
    shortStintsCount: number
  }
  positives: CareerPoint[]
  negatives: CareerPoint[]
  competencyBalance: {
    proven: string[]
    listedOnly: string[]
    missing: string[]
  }
}

export type MarketTier = 'top_10' | 'top_25' | 'top_50' | 'developing'

export interface TrackReadiness {
  track: PmTrack
  label: string
  readinessScore: number
  fitLabel: 'strong' | 'competitive' | 'developing'
  keyGap: string | null
}

export interface MarketStanding {
  percentile: number
  tier: MarketTier
  tierLabel: string
  benchmarkCohort: string
  summary: string
  trackReadiness: TrackReadiness[]
  nextBracketLever: string
}

export type CurrentSalaryVerdict =
  | 'significantly_underpaid'
  | 'underpaid'
  | 'decent'
  | 'good'
  | 'top_of_band'

export type ExpectedSalaryVerdict =
  | 'easy'
  | 'achievable'
  | 'stretch'
  | 'inflated'

export interface SalaryComparison {
  currency: 'INR' | 'USD'
  unitLabel: string
  currentSalary?: {
    amount: number
    percentileInBand: number
    verdict: CurrentSalaryVerdict
    verdictLabel: string
    gapVsMedian: number
    summary: string
  }
  expectedSalary?: {
    amount: number
    percentileInBand: number
    verdict: ExpectedSalaryVerdict
    verdictLabel: string
    deltaVsCurrentPercent: number | null
    summary: string
    actionNote: string
  }
}

export interface CompensationReport {
  currency: 'INR' | 'USD'
  unitLabel: string
  cohortLabel: string
  /** Full market band for (market x archetype x level x track) */
  marketBand: {
    min: number
    p25: number
    median: number
    p75: number
    max: number
  }
  /** Narrower target band calibrated to this candidate's resume score & impact density */
  resumeCalibratedBand: {
    low: number
    high: number
    quartileNote: string
  }
  baseVsTotalNote: string
  trackPremiumPercent: number
  trackPremiumNote: string
  methodologyNote: string
  comparison: SalaryComparison | null
}

export interface ScoreReport {
  version: 2
  overall: number
  grade: 'prototype' | 'alpha' | 'beta' | 'ship'
  gradeLabel: string
  headline: string
  contextUsed: {
    level: Level
    detectedLevel: Level
    pmExperience: PmExperienceBand
    totalYears: number
    track: PmTrack
    companyArchetype: CompanyArchetype
    market: MarketRegion
    background: CandidateBackground
  }
  dimensions: Dimension[]
  findings: Finding[]
  strengths: string[]
  kbInsights: KbInsight[]
  trendingSkills: TrendingSkillResult[]
  competencies: CompetencyResult[]
  bullets: BulletReview[]
  keywordMatch: KeywordMatch | null
  careerAnalysis: CareerAnalysis
  marketStanding: MarketStanding
  compensation: CompensationReport
  stats: {
    words: number
    bullets: number
    bulletsWithMetrics: number
    bulletsWithDelta: number
    bulletsWithGuardrail: number
    roles: number
    pages: number | null
    avgBulletsPerRole: number
    avgWordsPerBullet: number
  }
  parsed: ResumeData
}
