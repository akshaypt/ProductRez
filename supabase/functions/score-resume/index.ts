// @ts-nocheck - Deno runtime
import { scoreResume, checkResume } from '../_shared/scoring/index.ts'
import { adminClient, cors, json, requireUser } from '../_shared/http.ts'

const MAX_CHARS = 60_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const { sb, user } = await requireUser(req)
  if (!user) return json(req, { error: 'unauthenticated' }, 401)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'bad_json' }, 400)
  }
  const text = String(body?.text ?? '').slice(0, MAX_CHARS)
  if (text.trim().length < 20) return json(req, { error: 'empty_resume' }, 400)

  const check = checkResume(text)
  if (!check.ok) return json(req, { error: 'not_a_resume', reason: check.reason, message: check.message }, 422)

  // Atomic quota check: free accounts get one score, paid accounts are unlimited.
  const { data: allowed, error } = await adminClient().rpc('consume_score', { p_user: user.id })
  if (error) return json(req, { error: 'quota_check_failed' }, 500)
  if (!allowed) return json(req, { error: 'free_score_used' }, 402)

  const report = scoreResume({
    text,
    jobDescription: typeof body.jobDescription === 'string' ? body.jobDescription.slice(0, 20_000) : undefined,
    targetLevel: ['apm', 'pm', 'senior', 'lead', 'auto'].includes(body.targetLevel) ? body.targetLevel : 'auto',
    source: body.source === 'pdf' ? 'pdf' : 'paste',
    pageCount: Number.isFinite(body.pageCount) ? Number(body.pageCount) : undefined,
  })

  await adminClient().from('score_usage').insert({ user_id: user.id, overall: report.overall, report })
  return json(req, { report })
})
