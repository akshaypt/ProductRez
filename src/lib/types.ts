import type { ResumeData, ScoreInput, ScoreReport } from '@scoring'

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
  scoreResume(input: ScoreInput): Promise<ScoreReport>
  jobCounts(): Promise<{ US: number; IN: number; total: number }>
  listJobs(): Promise<Job[]>
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
