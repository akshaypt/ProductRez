// @ts-nocheck - Deno runtime
import { adminClient, cors, json, PLANS, requireUser } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  const { user } = await requireUser(req)
  if (!user) return json(req, { error: 'unauthenticated' }, 401)

  const { plan } = await req.json().catch(() => ({}))
  const p = PLANS[plan]
  if (!p) return json(req, { error: 'unknown_plan' }, 400)

  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!keyId || !secret) return json(req, { error: 'payments_not_configured' }, 503)

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${keyId}:${secret}`)}` },
    body: JSON.stringify({
      amount: p.amountPaise,
      currency: 'INR',
      receipt: `pr_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, plan },
    }),
  })
  if (!res.ok) return json(req, { error: 'razorpay_error', detail: await res.text() }, 502)
  const order = await res.json()

  await adminClient().from('payments').insert({
    user_id: user.id,
    plan,
    amount_paise: p.amountPaise,
    razorpay_order_id: order.id,
  })
  return json(req, { orderId: order.id, amount: p.amountPaise, currency: 'INR', keyId, plan, label: p.label })
})
