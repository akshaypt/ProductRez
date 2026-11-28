// Job-board adapters: turn Greenhouse, Lever and Ashby public postings into classified rows for the `jobs` table.
// Pure functions only (no network, no Deno APIs) so they run in the edge function, in scripts and in the tests alike.
// The categorisation itself lives in the ATS engine: packages/ats-engine-v2/src/engine/jobs.ts.
import { classifyJob, FEED_WINDOW_HOURS, isProductManagerTitle } from '../../../../packages/ats-engine-v2/src/engine/jobs.ts'

export type Ats = 'greenhouse' | 'lever' | 'ashby'

export interface Company {
  id: string // "greenhouse:stripe"
  ats: Ats
  token: string
  name: string
  archetype: string | null
}

export interface RawJob {
  sourceId: string
  title: string
  location: string
  url: string
  postedAt: string | null
  description: string
  department: string
  compensation: string
  workplace: 'remote' | 'hybrid' | 'onsite' | null
}

export interface JobRow {
  id: string
  title: string
  company: string
  company_id: string
  location: string
  country: 'US' | 'IN' | 'OTHER'
  market: 'india' | 'us' | 'remote_global'
  work_mode: 'remote' | 'hybrid' | 'onsite' | null
  level: 'apm' | 'pm' | 'senior' | 'lead'
  track: string
  archetype: string | null
  skills: string[]
  years_required: number | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: 'INR' | 'USD' | null
  department: string | null
  description: string
  url: string
  posted_on: string
  posted_at: string
  source: Ats
  is_active: true
  last_seen_at: string
}

export const boardUrl = (c: Pick<Company, 'ats' | 'token'>): string =>
  c.ats === 'greenhouse'
    ? `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.token)}/jobs` // the list is small; full text is fetched per kept role
    : c.ats === 'lever'
      ? `https://api.lever.co/v0/postings/${encodeURIComponent(c.token)}?mode=json`
      : `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c.token)}?includeCompensation=true`

/** Greenhouse sends the description only on a per-job request when you ask for the list without `content`. */
export const greenhouseDetailUrl = (token: string, id: string): string => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}`

/** Cheap pre-filter run before any text conversion: only fresh product-manager titles are worth the work. */
export const keepFor = (now: Date, windowHours = FEED_WINDOW_HOURS) => (title: string, postedAt: string | null): boolean => {
  if (!postedAt) return false
  const age = (now.getTime() - new Date(postedAt).getTime()) / 3_600_000
  return age <= windowHours && age >= -24 && isProductManagerTitle(title)
}
export type Keep = (title: string, postedAt: string | null) => boolean

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', bull: '•' }
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })

/** HTML (possibly entity-escaped, as Greenhouse sends it) to readable plain text, capped so rows stay small. */
export function htmlToText(html: string, max = 6000): string {
  let t = html || ''
  if (/&lt;\w+/.test(t) && !/<\w+/.test(t)) t = decode(t) // Greenhouse: the markup itself is escaped
  t = t
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*\/\s*(p|div|h[1-6]|ul|ol|tr)\s*>|<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decode(t).replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
}

const iso = (v: unknown): string | null => {
  if (v == null || v === '') return null
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

type J = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export function normalizeGreenhouse(json: J, keep?: Keep): RawJob[] {
  return (json?.jobs ?? []).filter((j: J) => !keep || keep(String(j.title ?? ''), iso(j.first_published) ?? iso(j.updated_at))).map((j: J) => ({
    sourceId: String(j.id),
    title: String(j.title ?? ''),
    location: String(j.location?.name ?? ''),
    url: String(j.absolute_url ?? ''),
    postedAt: iso(j.first_published) ?? iso(j.updated_at),
    description: j.content ? htmlToText(String(j.content)) : '',
    department: String(j.departments?.[0]?.name ?? ''),
    compensation: '',
    workplace: null,
  }))
}

export function normalizeLever(json: J, keep?: Keep): RawJob[] {
  const wp = (v: unknown) => (v === 'remote' || v === 'hybrid' || v === 'onsite' ? v : null)
  return (Array.isArray(json) ? json : []).filter((j: J) => !keep || keep(String(j.text ?? ''), iso(j.createdAt))).map((j: J) => {
    const lists = (j.lists ?? []).map((l: J) => `${l.text ?? ''}\n${htmlToText(String(l.content ?? ''))}`).join('\n')
    const locs: string[] = j.categories?.allLocations?.length ? j.categories.allLocations : [j.categories?.location ?? '']
    return {
      sourceId: String(j.id),
      title: String(j.text ?? ''),
      location: locs.filter(Boolean).join('; '),
      url: String(j.hostedUrl ?? j.applyUrl ?? ''),
      postedAt: iso(j.createdAt),
      description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n').slice(0, 6000),
      department: String(j.categories?.department ?? ''),
      compensation: j.salaryRange ? `${j.salaryRange.currency ?? ''} ${j.salaryRange.min ?? ''} - ${j.salaryRange.max ?? ''}` : '',
      workplace: wp(j.workplaceType),
    }
  })
}

export function normalizeAshby(json: J, keep?: Keep): RawJob[] {
  return (json?.jobs ?? [])
    .filter((j: J) => j.isListed !== false && (!keep || keep(String(j.title ?? ''), iso(j.publishedAt))))
    .map((j: J) => {
      const locs = [j.location, ...(j.secondaryLocations ?? []).map((l: J) => l.location)].filter(Boolean)
      const w = String(j.workplaceType ?? '').toLowerCase()
      return {
        sourceId: String(j.id),
        title: String(j.title ?? ''),
        location: locs.join('; ') || (j.isRemote ? 'Remote' : ''),
        url: String(j.jobUrl ?? j.applyUrl ?? ''),
        postedAt: iso(j.publishedAt),
        description: String(j.descriptionPlain ?? htmlToText(String(j.descriptionHtml ?? ''))).slice(0, 6000),
        department: String(j.department ?? j.team ?? ''),
        compensation: String(j.compensation?.compensationTierSummary ?? j.compensation?.scrapeableCompensationSalarySummary ?? ''),
        workplace: w === 'remote' ? 'remote' : w === 'hybrid' ? 'hybrid' : w === 'onsite' ? 'onsite' : j.isRemote ? 'remote' : null,
      }
    })
}

export const normalize = (ats: Ats, json: unknown, keep?: Keep): RawJob[] => (ats === 'greenhouse' ? normalizeGreenhouse(json as J, keep) : ats === 'lever' ? normalizeLever(json as J, keep) : normalizeAshby(json as J, keep))

/**
 * Classifies a posting and returns the row to store, or null when it should be skipped:
 * not a product-manager role, outside the US, India and remote-global markets, or older than the freshness window.
 */
export function toRow(raw: RawJob, company: Company, now: Date, windowHours = FEED_WINDOW_HOURS): JobRow | null {
  if (!raw.title || !raw.url || !raw.postedAt) return null
  const posted = new Date(raw.postedAt)
  const ageH = (now.getTime() - posted.getTime()) / 3_600_000
  if (ageH > windowHours || ageH < -24) return null
  const c = classifyJob({ title: raw.title, location: raw.location, description: raw.description, department: raw.department, compensation: raw.compensation })
  if (!c.isPm || c.market === 'other') return null
  return {
    id: `${company.ats}:${company.token}:${raw.sourceId}`,
    title: raw.title.slice(0, 200),
    company: company.name,
    company_id: company.id,
    location: raw.location.slice(0, 200),
    country: c.country,
    market: c.market,
    work_mode: raw.workplace ?? c.workMode,
    level: c.level,
    track: c.track,
    archetype: company.archetype,
    skills: c.skills,
    years_required: c.yearsRequired,
    salary_min: c.salary?.min ?? null,
    salary_max: c.salary?.max ?? null,
    salary_currency: c.salary?.currency ?? null,
    department: raw.department || null,
    description: raw.description,
    url: raw.url,
    posted_on: posted.toISOString().slice(0, 10),
    posted_at: posted.toISOString(),
    source: company.ats,
    is_active: true,
    last_seen_at: now.toISOString(),
  }
}
