// Link-rot check for the curated library. Run monthly (see .github/workflows/links.yml).
import { readFileSync } from 'node:fs'

const { resources } = JSON.parse(readFileSync('src/data/resources.json', 'utf8')) as { resources: { id: string; url: string }[] }
const bad: string[] = []
await Promise.all(
  resources.map(async (r) => {
    try {
      const res = await fetch(r.url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 ProductRezLinkCheck' }, signal: AbortSignal.timeout(20000) })
      // 403/429 mean "bot-blocked", not "dead"
      if (res.status === 404 || res.status === 410 || res.status >= 500) bad.push(`${res.status} ${r.id} ${r.url}`)
    } catch (e) {
      bad.push(`ERR ${r.id} ${r.url} (${(e as Error).message})`)
    }
  }),
)
if (bad.length) {
  console.error(`${bad.length} dead link(s):\n${bad.join('\n')}`)
  process.exit(1)
}
console.log(`All ${resources.length} resource links respond.`)
