// @ts-nocheck - Deno runtime
import { adminClient, safeEqual } from '../_shared/http.ts'
import { boardUrl, greenhouseDetailUrl, htmlToText, keepFor, normalize, toRow } from '../_shared/jobs/sources.ts'

// Daily job ingestion, started by pg_cron (see the migration that schedules it). It reads each tracked company's public
// job board (Greenhouse, Lever or Ashby), keeps fresh product-manager roles in the US, India and remote-global markets,
// categorises them with the ATS engine, and stores them in `jobs`. Auth is a shared secret, like the Razorpay webhook uses a signature.
const WINDOW_HOURS = 336 // two weeks: see FEED_WINDOW_HOURS in the ATS engine
const CONCURRENCY = 4
const FETCH_TIMEOUT_MS = 25_000
const BUDGET_MS = 115_000 // stop starting new boards before the platform's wall-clock limit

async function readBoard(c: { ats: string; token: string }) {
  const res = await fetch(boardUrl(c), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'user-agent': 'ProductRezBot/1.0 (+https://productrez-app.vercel.app)', accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') ?? ''
  if (!secret || !safeEqual(secret, req.headers.get('x-cron-secret') ?? '')) return new Response('forbidden', { status: 403 })

  const started = new Date()
  const admin = adminClient()
  const body = await req.json().catch(() => ({}))
  let q = admin.from('tracked_companies').select('id, ats, token, name, archetype').eq('active', true).order('id')
  if (Array.isArray(body.companies) && body.companies.length) q = q.in('id', body.companies)
  const { data: companies, error } = await q
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const ok: string[] = []
  const errors: { company: string; error: string }[] = []
  let seen = 0, stored = 0, partial = false
  let next = 0

  const work = async () => {
    while (next < companies.length) {
      if (Date.now() - started.getTime() > BUDGET_MS) { partial = true; return }
      const c = companies[next++]
      try {
        const now = new Date()
        const json = await readBoard(c)
        seen += Array.isArray(json) ? json.length : (json?.jobs?.length ?? 0)
        // Filter by title and date before touching any text: most postings are not fresh product-manager roles.
        const raw = normalize(c.ats, json, keepFor(now, WINDOW_HOURS))
        if (c.ats === 'greenhouse') {
          for (const r of raw) {
            try {
              const d = await (await fetch(greenhouseDetailUrl(c.token, r.sourceId), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).json()
              r.description = htmlToText(String(d.content ?? ''))
            } catch { /* keep the role without a description rather than lose it */ }
          }
        }
        const rows = raw.map((r) => toRow(r, c, now, WINDOW_HOURS)).filter(Boolean)
        for (let i = 0; i < rows.length; i += 100) {
          const { error: e } = await admin.from('jobs').upsert(rows.slice(i, i + 100), { onConflict: 'id' })
          if (e) throw new Error(`save failed: ${e.message}`)
        }
        stored += rows.length
        ok.push(c.id)
        await admin.from('tracked_companies').update({ last_run_at: now.toISOString(), last_status: 'ok', last_job_count: rows.length }).eq('id', c.id)
      } catch (e) {
        errors.push({ company: c.id, error: String(e?.message ?? e).slice(0, 200) })
        await admin.from('tracked_companies').update({ last_run_at: new Date().toISOString(), last_status: String(e?.message ?? e).slice(0, 120) }).eq('id', c.id)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, work))

  // Close postings that disappeared from boards we read successfully, and clear anything past the window.
  const { data: fin } = await admin.rpc('finish_scrape', { ok_companies: ok, run_started: started.toISOString() })
  const summary = {
    companies_total: companies.length, companies_ok: ok.length, companies_failed: errors.length, jobs_seen: seen, jobs_stored: stored,
    deactivated: fin?.deactivated ?? 0, purged: fin?.purged ?? 0, partial,
  }
  await admin.from('scrape_runs').insert({ started_at: started.toISOString(), finished_at: new Date().toISOString(), ...summary, errors: errors.slice(0, 40) })
  return new Response(JSON.stringify({ ...summary, ms: Date.now() - started.getTime(), failed: errors.slice(0, 10) }), { headers: { 'content-type': 'application/json' } })
})
