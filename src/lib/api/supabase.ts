import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ResumeData, ScoreInput, ScoreReport } from '@scoring'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env'
import { ApiError, type Api, type AppUser, type BuildOpts, type Entitlement, type Job, type JobStatus, type PlanId, type Progress, type SavedJob, type StoredResume } from '../types'

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(evt: string, cb: (r: unknown) => void): void }
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new ApiError('unknown', 'Could not load the payment window. Check your connection and try again.'))
    document.head.appendChild(s)
  })
}

export function createSupabaseApi(): Api {
  const sb: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  const toUser = (u: { id: string; email?: string | null } | null | undefined): AppUser | null => (u ? { id: u.id, email: u.email ?? '' } : null)

  async function uid(): Promise<string> {
    const { data } = await sb.auth.getUser()
    if (!data.user) throw new ApiError('unauthenticated')
    return data.user.id
  }

  async function invoke<T>(name: string, body: unknown): Promise<T> {
    const { data, error } = await sb.functions.invoke(name, { body: body as Record<string, unknown> })
    if (error) {
      let payload: { error?: string; message?: string } = {}
      try {
        payload = await (error as { context?: Response }).context?.json()
      } catch {
        /* ignore */
      }
      const code = payload.error
      if (code === 'not_a_resume') throw new ApiError('unknown', payload.message ?? 'That does not look like a resume.')
      if (code === 'free_score_used' || code === 'paywall' || code === 'ai_not_configured' || code === 'payments_not_configured' || code === 'unauthenticated') throw new ApiError(code)
      throw new ApiError('unknown', code ?? error.message)
    }
    return data as T
  }

  const rowToJob = (r: Record<string, unknown>): Job => ({
    id: String(r.id),
    title: String(r.title),
    company: String(r.company),
    location: String(r.location ?? ''),
    country: r.country as Job['country'],
    workMode: (r.work_mode as Job['workMode']) ?? null,
    level: (r.level as Job['level']) ?? null,
    url: String(r.url),
    postedOn: String(r.posted_on),
  })

  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession()
      return toUser(data.session?.user)
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)))
      return () => data.subscription.unsubscribe()
    },
    async sendCode(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } })
      if (error) throw new ApiError('unknown', error.message)
    },
    async verifyCode(email, code) {
      const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) throw new ApiError('unknown', error.message)
    },
    async signInWithGoogle() {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/score' } })
      if (error) throw new ApiError('unknown', error.message)
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async getEntitlement(): Promise<Entitlement> {
      const { data } = await sb.from('entitlements').select('plan,lifetime,expires_at').maybeSingle()
      if (!data) return { active: false, plan: 'none', expiresAt: null }
      const active = data.lifetime || (!!data.expires_at && new Date(data.expires_at) > new Date())
      return { active, plan: active ? (data.plan as PlanId) : 'none', expiresAt: data.expires_at }
    },
    async getSavedScore() {
      const { data } = await sb.from('score_usage').select('report').order('created_at', { ascending: false }).limit(1).maybeSingle()
      return (data?.report as ScoreReport) ?? null
    },
    async scoreResume(input: ScoreInput) {
      const res = await invoke<{ report: ScoreReport }>('score-resume', input)
      return res.report
    },
    async jobCounts() {
      const { data } = await sb.rpc('job_counts')
      const out = { US: 0, IN: 0, total: 0 }
      for (const r of (data ?? []) as { country: string; total: number }[]) {
        const n = Number(r.total)
        if (r.country === 'US') out.US = n
        if (r.country === 'IN') out.IN = n
        out.total += n
      }
      return out
    },
    async listJobs() {
      const { data, error } = await sb.from('jobs').select('*').order('posted_on', { ascending: false }).limit(600)
      if (error) throw new ApiError('paywall')
      return (data ?? []).map(rowToJob)
    },
    async listSavedJobs(): Promise<SavedJob[]> {
      const { data } = await sb.from('saved_jobs').select('job,status,updated_at').order('updated_at', { ascending: false })
      return (data ?? []).map((r) => ({ job: r.job as Job, status: r.status as JobStatus, updatedAt: r.updated_at }))
    },
    async saveJob(job, status) {
      const user_id = await uid()
      await sb.from('saved_jobs').upsert({ user_id, job_id: job.id, job, status, updated_at: new Date().toISOString() })
    },
    async removeSavedJob(jobId) {
      await sb.from('saved_jobs').delete().eq('job_id', jobId)
    },
    async listResources() {
      const [r, p] = await Promise.all([sb.from('resources').select('*').order('position'), sb.from('learning_paths').select('*').order('position')])
      if (r.error) throw new ApiError('paywall')
      return {
        resources: (r.data ?? []).map((x) => ({ id: x.id, title: x.title, url: x.url, source: x.source, kind: x.kind, topics: x.topics, level: x.level, minutes: x.minutes, why: x.why })),
        paths: p.data ?? [],
      }
    },
    async getProgress() {
      const { data } = await sb.from('resource_progress').select('resource_id,done,bookmarked')
      const out: Progress = {}
      for (const r of data ?? []) out[r.resource_id] = { done: r.done, bookmarked: r.bookmarked }
      return out
    },
    async setProgress(resourceId, patch) {
      const user_id = await uid()
      const { data } = await sb.from('resource_progress').select('done,bookmarked').eq('resource_id', resourceId).maybeSingle()
      await sb.from('resource_progress').upsert({ user_id, resource_id: resourceId, done: data?.done ?? false, bookmarked: data?.bookmarked ?? false, ...patch, updated_at: new Date().toISOString() })
    },
    async listResumes(): Promise<StoredResume[]> {
      const { data } = await sb.from('resumes').select('*').order('updated_at', { ascending: false })
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, template: r.template, options: r.options as BuildOpts, data: r.data as ResumeData, updatedAt: r.updated_at }))
    },
    async saveResume(r) {
      const user_id = await uid()
      const { error } = await sb.from('resumes').upsert({ id: r.id, user_id, title: r.title, template: r.template, options: r.options, data: r.data, updated_at: new Date().toISOString() })
      if (error) throw new ApiError('paywall')
    },
    async deleteResume(id) {
      await sb.from('resumes').delete().eq('id', id)
    },
    async exportLatex(data, template, options) {
      const res = await invoke<{ tex: string }>('export-resume', { data, template, options })
      return res.tex
    },
    async rewriteBullet(bullet, role, level) {
      const res = await invoke<{ options: string[] }>('rewrite-bullet', { bullet, role, level })
      return res.options
    },
    async startCheckout(plan) {
      const order = await invoke<{ orderId: string; amount: number; currency: string; keyId: string; label: string }>('create-order', { plan })
      await loadRazorpay()
      const { data: u } = await sb.auth.getUser()
      await new Promise<void>((resolve, reject) => {
        const rz = new window.Razorpay!({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'ProductRez',
          description: `ProductRez · ${order.label}`,
          prefill: { email: u.user?.email },
          theme: { color: '#FF5B35' },
          modal: { ondismiss: () => reject(new ApiError('cancelled')) },
          handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await invoke('verify-payment', resp)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
        rz.open()
      })
    },
  }
}
