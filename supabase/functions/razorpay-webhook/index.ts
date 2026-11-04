// @ts-nocheck - Deno runtime
import { adminClient, hmacSha256Hex, safeEqual } from '../_shared/http.ts'

// Razorpay dashboard → Webhooks → event "payment.captured" (or order.paid) → this URL.
Deno.serve(async (req) => {
  const raw = await req.text()
  const sig = req.headers.get('x-razorpay-signature') ?? ''
  const expected = await hmacSha256Hex(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!, raw)
  if (!safeEqual(expected, sig)) return new Response('bad signature', { status: 400 })

  const evt = JSON.parse(raw)
  if (evt.event !== 'payment.captured' && evt.event !== 'order.paid') return new Response('ignored')
  const pay = evt.payload?.payment?.entity
  if (!pay?.order_id) return new Response('no order')

  const admin = adminClient()
  const { data: row } = await admin.from('payments').select('plan,user_id,amount_paise').eq('razorpay_order_id', pay.order_id).maybeSingle()
  if (!row) return new Response('unknown order')
  if (pay.amount !== row.amount_paise) return new Response('amount mismatch', { status: 400 })

  await admin.rpc('grant_plan', { p_user: row.user_id, p_plan: row.plan, p_order: pay.order_id, p_payment: pay.id })
  return new Response('ok')
})
