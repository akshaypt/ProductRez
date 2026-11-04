// Daily job ingestion. Run by .github/workflows/jobs.yml at 01:30 UTC (07:00 AM IST).
//
//   node scripts/scrape-jobs.ts            # dry run: prints what it would store
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/scrape-jobs.ts
//
// NOTE: scraping LinkedIn is against LinkedIn's User Agreement and GitHub-hosted runners are often
// rate limited. This script is deliberately gentle (low volume, delays, stops on 429). For a
// production-grade, ToS-clean feed, swap `fetchPage` for a licensed jobs API; nothing else changes.
import { parseCards, toJobs, type ScrapedJob } from './lib/linkedin.ts'

const KEYWORDS = ['product manager', 'associate product manager', 'senior product manager', 'group product manager', 'AI product manager']
const LOCATIONS = ['United States', 'India']
const PAGES = 3 // 25 results each
const MAX_REQUESTS = 40
const WINDOW_SECONDS = 172800 // f_TPR=r172800 → last 48h

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const jitter = () => 1500 + Math.random() * 2000

async function fetchPage(keywords: string, location: string, start: number): Promise<string | 'blocked'> {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&f_TPR=r${WINDOW_SECONDS}&sortBy=DD&start=${start}`
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ProductRezBot/1.0)', 'accept-language': 'en-US,en;q=0.9' } })
  if (res.status === 429 || res.status === 999 || res.status === 403) return 'blocked'
  if (!res.ok) return ''
  return res.text()
}

async function main() {
  const all = new Map<string, ScrapedJob>()
  let requests = 0
  outer: for (const location of LOCATIONS) {
    for (const kw of KEYWORDS) {
      for (let page = 0; page < PAGES; page++) {
        if (requests++ >= MAX_REQUESTS) break outer
        const html = await fetchPage(kw, location, page * 25)
        if (html === 'blocked') {
          console.warn(`Rate limited after ${requests} requests; stopping with ${all.size} jobs.`)
          break outer
        }
        const jobs = toJobs(parseCards(html))
        jobs.forEach((j) => all.set(j.id, j))
        if (parseCards(html).length < 10) break // ran out of results for this query
        await sleep(jitter())
      }
      await sleep(jitter())
    }
  }

  const rows = [...all.values()]
  console.log(`Collected ${rows.length} PM jobs (${rows.filter((r) => r.country === 'IN').length} IN, ${rows.filter((r) => r.country === 'US').length} US)`)

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log('No SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set: dry run.')
    console.log(JSON.stringify(rows.slice(0, 3), null, 2))
    return
  }
  if (rows.length === 0) {
    // Never wipe the board because of a blocked run: keep yesterday's listings until fresh data arrives.
    console.warn('Zero jobs collected: skipping upsert and purge so existing listings remain.')
    process.exitCode = 1
    return
  }
  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(`${url}/rest/v1/jobs?on_conflict=id`, { method: 'POST', headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(i, i + 200)) })
    if (!res.ok) throw new Error(`Upsert failed: ${res.status} ${await res.text()}`)
  }
  const purge = await fetch(`${url}/rest/v1/rpc/purge_stale_jobs`, { method: 'POST', headers, body: '{}' })
  if (!purge.ok) throw new Error(`Purge failed: ${purge.status} ${await purge.text()}`)
  console.log(`Upserted ${rows.length} jobs; purged ${await purge.text()} stale rows.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
