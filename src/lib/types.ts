import type { ResumeData, ScoreInput, ScoreReport } from '@scoring'
import type { ScoreReport as ScoreReportV2 } from '@ats'

export type PlanId = 'month' | 'six_months' | 'lifetime'
export interface AppUser {
  id: string
  email: string
}
export interface Entitlement {
  active: boolean
  plan: PlanId | 'none'
  expiresAt: string | null
}
export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected'
export interface Job {
  id: string
  title: string
  company: string
  location: string
  country: 'US' | 'IN' | 'OTHER'
  workMode: 'remote' | 'hybrid' | 'onsite' | null
  level: 'apm' | 'pm' | 'senior' | 'lead' | null
  url: string
  postedOn: string // YYYY-MM-DD
  sample?: boolean
  /** Categories assigned by the ATS engine when the posting was collected. */
  track?: string | null
  market?: 'india' | 'us' | 'remote_global' | null
  postedAt?: string
  salary?: { min: number; max: number; currency: 'INR' | 'USD' } | null
  skills?: string[]
  /** How well this posting fits the signed-in person's latest resume. Absent until they have scored one. */
  match?: { score: number; matched: string[]; missing: string[] } | null
  /** True when a free account is previewing a match: no apply link. */
  locked?: boolean
}
export interface SavedJob {
  job: Job
  status: JobStatus
  updatedAt: string
}
export type ResourceKind = 'video' | 'article' | 'newsletter' | 'podcast' | 'book' | 'course' | 'tool' | 'template'
export interface Resource {
  id: string
  title: string
  url: string
  source: string
  kind: ResourceKind
  topics: string[]
  level: 'beginner' | 'intermediate' | 'advanced'
  minutes: number | null
  why: string
}
export interface LearningPath {
  id: string
  title: string
  blurb: string
  weeks: number
  steps: { week: number; title: string; ids: string[] }[]
}
export type Progress = Record<string, { done?: boolean; bookmarked?: boolean }>

export interface BuildOpts {
  paper: 'a4' | 'letter'
  fontSize: 10 | 11
  accent: string
  boldMetrics: boolean
}
export interface StoredResume {
  id: string
  title: string
  template: string
  options: BuildOpts
  data: ResumeData
  updatedAt: string
}

export type ApiErrorCode = 'free_score_used' | 'paywall' | 'unauthenticated' | 'ai_not_configured' | 'payments_not_configured' | 'unknown' | 'cancelled'
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message?: string,
  ) {
    super(message ?? code)
  }
}

/** The latest resume check kept against an account (one per account; a new upload replaces it). */
export interface LatestScan {
  fileName: string
  picks: { level: string | null; track: string | null; company: string | null; currency?: 'INR' | 'USD' | null }
  report: ScoreReportV2
  updatedAt: string
}

/** Pay the person has told us about. INR is in lakhs per year (CTC), USD in thousands per year. Only the owner can read it. */
export interface UserPay {
  currency: 'INR' | 'USD'
  current: number | null
  expected: number | null
}

export interface Api {
  mode: 'supabase' | 'demo'
  getUser(): Promise<AppUser | null>
  onAuthChange(cb: (u: AppUser | null) => void): () => void
  sendCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<void>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
  getEntitlement(): Promise<Entitlement>
  getSavedScore(): Promise<ScoreReport | null>
  getLatestScan(): Promise<LatestScan | null>
  saveLatestScan(s: Omit<LatestScan, 'updatedAt'>): Promise<void>
  deleteLatestScan(): Promise<void>
  getPay(): Promise<UserPay | null>
  savePay(p: UserPay): Promise<void>
  /** Saves a resume check as data (see the Terms and Privacy pages). Never throws into the caller's flow: callers ignore failures. */
  collectResume(payload: Record<string, unknown>): Promise<void>
  scoreResume(input: ScoreInput): Promise<ScoreReport>
  jobCounts(): Promise<{ US: number; IN: number; total: number }>
  listJobs(): Promise<Job[]>
  /** The top matches a free account may preview (no links). Empty when there is nothing to match yet. */
  peekMatches(): Promise<Job[]>
  listSavedJobs(): Promise<SavedJob[]>
  saveJob(job: Job, status: JobStatus): Promise<void>
  removeSavedJob(jobId: string): Promise<void>
  listResources(): Promise<{ resources: Resource[]; paths: LearningPath[] }>
  getProgress(): Promise<Progress>
  setProgress(resourceId: string, patch: { done?: boolean; bookmarked?: boolean }): Promise<void>
  listResumes(): Promise<StoredResume[]>
  saveResume(r: StoredResume): Promise<void>
  deleteResume(id: string): Promise<void>
  exportLatex(data: ResumeData, template: string, options: BuildOpts): Promise<string>
  rewriteBullet(bullet: string, role: string, level: string): Promise<string[]>
  startCheckout(plan: PlanId): Promise<void>
}
