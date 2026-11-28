// @ts-nocheck - Deno runtime
import { adminClient, cors, json, requireUser } from '../_shared/http.ts'

// Permanently deletes the signed-in user. Every table references auth.users ON DELETE CASCADE,
// so saved resumes, scores, progress, jobs pipeline and entitlements go with it. Resume checks kept as data (resume_submissions) are
// removed too: by account, and by the email on the account or on the resume.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  const { user } = await requireUser(req)
  if (!user) return json(req, { error: 'unauthenticated' }, 401)
  const admin = adminClient()
  const email = (user.email ?? '').toLowerCase()
  await admin.from('resume_submissions').delete().eq('user_id', user.id)
  if (email) {
    await admin.from('resume_submissions').delete().eq('account_email', email)
    await admin.from('resume_submissions').delete().eq('email', email)
  }
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return json(req, { error: 'delete_failed' }, 500)
  return json(req, { ok: true })
})
