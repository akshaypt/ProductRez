// @ts-nocheck - Deno runtime
import { buildLatex, templateById } from '../_shared/latex/index.ts'
import { cors, hasAccess, json, requireUser } from '../_shared/http.ts'

// Server-side so the LaTeX export is genuinely behind the paywall.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  const { sb, user } = await requireUser(req)
  if (!user) return json(req, { error: 'unauthenticated' }, 401)
  if (!(await hasAccess(sb, user.id))) return json(req, { error: 'paywall' }, 402)

  const body = await req.json().catch(() => null)
  if (!body?.data || typeof body.data !== 'object') return json(req, { error: 'bad_request' }, 400)
  const meta = templateById(String(body.template ?? 'ledger'))
  const o = body.options ?? {}
  const tex = buildLatex(body.data, meta.id, {
    paper: o.paper === 'a4' ? 'a4' : 'letter',
    fontSize: o.fontSize === 11 ? 11 : o.fontSize === 10 ? 10 : meta.fontSize,
    accent: typeof o.accent === 'string' ? o.accent.replace('#', '') : meta.accentDefault,
    boldMetrics: !!o.boldMetrics,
  })
  return json(req, { tex, template: meta.id })
})
