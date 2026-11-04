// @ts-nocheck - Deno runtime
import { adminClient, cors, hmacSha256Hex, json, requireUser, safeEqual } from '../_shared/http.ts'

// Called by the client right after Razorpay Checkout succeeds. The webhook is the safety net.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  const { user } = await requireUser(req)
  if (!user) return json(req, { error: 'unauthenticated' }, 401)

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}))
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json(req, { error: 'bad_request' }, 400)

  const secret = Deno.env.get('RAZORPAY_KEY_SECRET')!
  const expected = await hmacSha256Hex(secret, `${razorpay_order_id}|${razorpay_payment_id}`)
  if (!safeEqual(expected, razorpay_signature)) return json(req, { error: 'bad_signature' }, 400)

  const admin = adminClient()
  const { data: pay } = await admin.from('payments').select('plan,user_id').eq('razorpay_order_id', razorpay_order_id).maybeSingle()
  if (!pay || pay.user_id !== user.id) return json(req, { error: 'order_not_found' }, 404)

  const { error } = await admin.rpc('grant_plan', { p_user: user.id, p_plan: pay.plan, p_order: razorpay_order_id, p_payment: razorpay_payment_id })
  if (error) return json(req, { error: 'grant_failed' }, 500)
  return json(req, { ok: true, plan: pay.plan })
})
