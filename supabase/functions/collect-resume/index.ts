// @ts-nocheck - Deno runtime
import { adminClient, cors, json, requireUser } from '../_shared/http.ts'

// Saves the parsed resume of every check, signed in or not (see the Terms and Privacy pages). Anyone can call it, so it validates
// and rate-limits. When called with a signed-in user it also attaches earlier checks from the same browser to that account.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/
const MAX_BYTES = 300_000
const PER_DAY = 25
const clip = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  const raw = await req.text()
  if (raw.length > MAX_BYTES * 1.5) return json(req, { error: 'too_large' }, 413)
  let b: any
  try { b = JSON.parse(raw) } catch { return json(req, { error: 'bad_json' }, 400) }
  if (!UUID.test(String(b.anonId ?? ''))) return json(req, { error: 'bad_anon_id' }, 400)

  const admin = adminClient()
  const { user } = await requireUser(req)

  // Sign-in: claim this browser's earlier checks for the account.
  if (b.link === true) {
    if (!user) return json(req, { error: 'unauthenticated' }, 401)
    const { error } = await admin.from('resume_submissions').update({ user_id: user.id, account_email: user.email }).eq('anon_id', b.anonId).is('user_id', null)
    return error ? json(req, { error: 'link_failed' }, 500) : json(req, { ok: true })
  }

  const resume = b.resume
  if (!resume || typeof resume !== 'object' || !resume.basics || !Array.isArray(resume.experience)) return json(req, { error: 'bad_resume' }, 400)
  if (JSON.stringify(resume).length > MAX_BYTES) return json(req, { error: 'too_large' }, 413)
  const scores = b.scores && typeof b.scores === 'object' ? b.scores : null
  if (!scores || typeof scores.overall !== 'number') return json(req, { error: 'bad_scores' }, 400)

  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { count } = await admin.from('resume_submissions').select('id', { count: 'exact', head: true }).eq('anon_id', b.anonId).gte('created_at', since)
  if ((count ?? 0) >= PER_DAY) return json(req, { error: 'rate_limited' }, 429)

  const basics = resume.basics
  const email = clip(basics.email, 254)
  const { error } = await admin.from('resume_submissions').insert({
    anon_id: b.anonId,
    user_id: user?.id ?? null,
    account_email: user?.email ?? null,
    email: email && EMAIL.test(email) ? email.toLowerCase() : null,
    phone: clip(basics.phone, 40),
    full_name: clip(basics.name, 120),
    location: clip(basics.location, 120),
    linkedin: clip(basics.linkedin, 200),
    resume,
    scores,
    picks: b.picks && typeof b.picks === 'object' ? b.picks : null,
    source: b.source === 'app' ? 'app' : 'landing',
    terms_version: clip(b.termsVersion, 20) ?? 'unknown',
  })
  if (error) return json(req, { error: 'save_failed' }, 500)
  return json(req, { ok: true })
})
