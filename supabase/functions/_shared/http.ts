// deno-lint-ignore-file no-explicit-any
// @ts-nocheck - this file runs on Deno (Supabase Edge Functions), not in the Vite/TS build.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s: string) => s.trim())

export function cors(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED.includes('*') ? '*' : ALLOWED.includes(origin) ? origin : ALLOWED[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })

export function userClient(req: Request) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

export const adminClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

export async function requireUser(req: Request) {
  const sb = userClient(req)
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) return { sb, user: null }
  return { sb, user: data.user }
}

export async function hasAccess(sb: any, uid: string): Promise<boolean> {
  const { data } = await sb.from('entitlements').select('lifetime, expires_at').eq('user_id', uid).maybeSingle()
  if (!data) return false
  return data.lifetime || (data.expires_at && new Date(data.expires_at) > new Date())
}

export const PLANS: Record<string, { amountPaise: number; label: string }> = {
  month: { amountPaise: 29900, label: '1 month' },
  six_months: { amountPaise: 59900, label: '6 months' },
  lifetime: { amountPaise: 99900, label: 'Lifetime' },
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
