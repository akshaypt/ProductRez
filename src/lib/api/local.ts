import { scoreResume, checkResume, type ScoreInput, type ScoreReport } from '@scoring'
import { buildLatex } from '@latex'
import { ApiError, type Api, type AppUser, type Entitlement, type Job, type JobStatus, type LatestScan, type PlanId, type Progress, type SavedJob, type StoredResume, type UserPay } from '../types'
import { demoJobs } from './demoJobs'
import { profileFromReport, scoreMatch, type ResumeProfile } from '@ats'
import { localRewrite } from '../rewrite'
import resources from '../../data/resources.json'

const K = {
  user: 'pr.demo.user',
  ent: 'pr.demo.ent',
  score: 'pr.demo.score',
  resumes: 'pr.demo.resumes',
  saved: 'pr.demo.saved',
  progress: 'pr.demo.progress',
}
/** Scores jobs against the saved resume with the same function the database uses, best match first. */
function rank(jobs: Job[]): Job[] {
  const scan = read<LatestScan | null>('pr.demo.latestScan', null)
  if (!scan) return jobs
  const profile: ResumeProfile = profileFromReport(scan.report)
  return jobs
    .map((j) => {
      const m = scoreMatch(profile, { skills: j.skills ?? [], track: (j.track ?? 'generalist') as never, level: j.level, archetype: null, salary: j.salary ?? null, ageHours: (Date.now() - new Date(j.postedAt ?? j.postedOn).getTime()) / 3600000 })
      return { ...j, match: { score: m.score, matched: m.matched, missing: m.missing } }
    })
    .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
}
const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage full / blocked */
  }
}

const listeners = new Set<(u: AppUser | null) => void>()
const emit = () => listeners.forEach((l) => l(read<AppUser | null>(K.user, null)))
const DAY = 86400000

export function createLocalApi(): Api {
  const entitlement = (): Entitlement => {
    const e = read<{ plan: PlanId; expiresAt: string | null } | null>(K.ent, null)
    if (!e) return { active: false, plan: 'none', expiresAt: null }
    const active = e.plan === 'lifetime' || (!!e.expiresAt && new Date(e.expiresAt) > new Date())
    return { active, plan: active ? e.plan : 'none', expiresAt: e.expiresAt }
  }
  const requirePaid = () => {
    if (!entitlement().active) throw new ApiError('paywall')
  }

  return {
    mode: 'demo',
    async getUser() {
      return read<AppUser | null>(K.user, null)
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async sendCode() {
      /* demo: no email is sent */
    },
    async verifyCode(email) {
      write(K.user, { id: `demo-${email}`, email })
      emit()
    },
    async signInWithGoogle() {
      write(K.user, { id: 'demo-google', email: 'you@example.com' })
      emit()
    },
    async signOut() {
      localStorage.removeItem(K.user)
      emit()
    },
    async deleteAccount() {
      Object.keys(localStorage).filter((k) => k.startsWith('pr.')).forEach((k) => localStorage.removeItem(k))
      emit()
    },
    async getEntitlement() {
      return entitlement()
    },
    async getSavedScore() {
      return read<ScoreReport | null>(K.score, null)
    },
    async getLatestScan() {
      return read<LatestScan | null>('pr.demo.latestScan', null)
    },
    async saveLatestScan(s) {
      if (!read<AppUser | null>(K.user, null)) throw new ApiError('unauthenticated')
      write('pr.demo.latestScan', { ...s, updatedAt: new Date().toISOString() })
    },
    async getPay() {
      return read<UserPay | null>('pr.demo.pay', null)
    },
    async savePay(p) {
      if (!read<AppUser | null>(K.user, null)) throw new ApiError('unauthenticated')
      write('pr.demo.pay', p)
    },
    async collectResume() {
      /* demo mode keeps nothing on a server */
    },
    async deleteLatestScan() {
      write('pr.demo.latestScan', null)
    },
    async scoreResume(input: ScoreInput) {
      if (!read<AppUser | null>(K.user, null)) throw new ApiError('unauthenticated')
      if (!entitlement().active && read<ScoreReport | null>(K.score, null)) throw new ApiError('free_score_used')
      const check = checkResume(input.text)
      if (!check.ok) throw new ApiError('unknown', check.message)
      const report = scoreResume(input)
      write(K.score, report)
      return report
    },
    async jobCounts() {
      const jobs = demoJobs()
      const US = jobs.filter((j) => j.country === 'US').length
      const IN = jobs.filter((j) => j.country === 'IN').length
      return { US, IN, total: jobs.length }
    },
    async listJobs() {
      requirePaid()
      return rank(demoJobs())
    },
    async peekMatches() {
      const ranked = rank(demoJobs()).filter((j) => j.match).slice(0, 3)
      return ranked.map((j) => ({ ...j, url: '', locked: true }))
    },
    async listSavedJobs() {
      requirePaid()
      return read<SavedJob[]>(K.saved, [])
    },
    async saveJob(job: Job, status: JobStatus) {
      requirePaid()
      const all = read<SavedJob[]>(K.saved, []).filter((s) => s.job.id !== job.id)
      write(K.saved, [{ job, status, updatedAt: new Date().toISOString() }, ...all])
    },
    async removeSavedJob(id) {
      write(K.saved, read<SavedJob[]>(K.saved, []).filter((s) => s.job.id !== id))
    },
    async listResources() {
      requirePaid()
      return resources as unknown as Awaited<ReturnType<Api['listResources']>>
    },
    async getProgress() {
      return read<Progress>(K.progress, {})
    },
    async setProgress(id, patch) {
      requirePaid()
      const p = read<Progress>(K.progress, {})
      p[id] = { ...p[id], ...patch }
      write(K.progress, p)
    },
    async listResumes() {
      return read<StoredResume[]>(K.resumes, [])
    },
    async saveResume(r) {
      requirePaid()
      const all = read<StoredResume[]>(K.resumes, []).filter((x) => x.id !== r.id)
      write(K.resumes, [{ ...r, updatedAt: new Date().toISOString() }, ...all])
    },
    async deleteResume(id) {
      write(K.resumes, read<StoredResume[]>(K.resumes, []).filter((x) => x.id !== id))
    },
    async exportLatex(data, template, options) {
      requirePaid()
      return buildLatex(data, template, options)
    },
    async rewriteBullet(bullet, role, level) {
      requirePaid()
      return localRewrite(bullet, role, level)
    },
    async startCheckout(plan) {
      // Demo only: there is no payment. Production builds use Razorpay via Supabase edge functions.
      const now = Date.now()
      const cur = entitlement()
      const base = cur.active && cur.expiresAt ? Math.max(now, new Date(cur.expiresAt).getTime()) : now
      if (plan === 'lifetime') write(K.ent, { plan, expiresAt: null })
      else write(K.ent, { plan, expiresAt: new Date(base + (plan === 'month' ? 30 : 182) * DAY).toISOString() })
    },
  }
}
void ({} as AppUser)
