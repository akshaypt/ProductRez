// @ts-nocheck - Deno runtime
import { adminClient, cors, json, requireUser } from '../_shared/http.ts'

// Permanently deletes the signed-in user. Every table references auth.users ON DELETE CASCADE,
// so saved resumes, scores, progress, jobs pipeline and entitlements go with it.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  const { user } = await requireUser(req)
  if (!user) return json(req, { error: 'unauthenticated' }, 401)
  const { error } = await adminClient().auth.admin.deleteUser(user.id)
  if (error) return json(req, { error: 'delete_failed' }, 500)
  return json(req, { ok: true })
})
