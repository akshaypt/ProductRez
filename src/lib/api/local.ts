import { scoreResume, type ScoreInput, type ScoreReport } from '@scoring'
import { buildLatex } from '@latex'
import { ApiError, type Api, type AppUser, type Entitlement, type Job, type JobStatus, type PlanId, type Progress, type SavedJob, type StoredResume } from '../types'
import { demoJobs } from './demoJobs'
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
    async getEntitlement() {
      return entitlement()
    },
    async getSavedScore() {
      return read<ScoreReport | null>(K.score, null)
    },
    async scoreResume(input: ScoreInput) {
      if (!read<AppUser | null>(K.user, null)) throw new ApiError('unauthenticated')
      if (!entitlement().active && read<ScoreReport | null>(K.score, null)) throw new ApiError('free_score_used')
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
      return demoJobs()
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
