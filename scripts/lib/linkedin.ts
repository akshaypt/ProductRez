// Parsing + classification for LinkedIn's public (logged-out) job search fragments.
// Pure functions: no network, so they are unit-tested against fixture HTML.

export interface ScrapedJob {
  id: string
  title: string
  company: string
  location: string
  country: 'US' | 'IN' | 'OTHER'
  work_mode: 'remote' | 'hybrid' | 'onsite' | null
  level: 'apm' | 'pm' | 'senior' | 'lead' | null
  url: string
  posted_on: string // YYYY-MM-DD
  source: 'linkedin'
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

const grab = (block: string, re: RegExp) => {
  const m = block.match(re)
  return m ? decode(m[1]) : ''
}

/** Split the fragment into per-job cards and pull out the fields we need. */
export function parseCards(html: string): { id: string; title: string; company: string; location: string; postedOn: string }[] {
  const out: ReturnType<typeof parseCards> = []
  const parts = html.split(/<li[\s>]/i).slice(1)
  for (const part of parts) {
    const id = part.match(/urn:li:jobPosting:(\d+)/)?.[1] ?? part.match(/\/jobs\/view\/(?:[^"?\s]*?-)?(\d{6,})/)?.[1]
    if (!id) continue
    const title = grab(part, /base-search-card__title[^>]*>([\s\S]*?)<\/h3>/i) || grab(part, /<span class="sr-only">([\s\S]*?)<\/span>/i)
    const company = grab(part, /base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/i)
    const location = grab(part, /job-search-card__location[^>]*>([\s\S]*?)<\/span>/i)
    const postedOn = part.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/i)?.[1] ?? ''
    if (title && company) out.push({ id, title, company, location, postedOn })
  }
  return out
}

const PM_TITLE = /\b(product\s+(manager|owner|lead)|associate\s+product|apm\b|gpm\b|head\s+of\s+product|(director|vp|vice\s+president|chief)\b.*\bproduct|product\s+management|group\s+product|principal\s+product|staff\s+product|technical\s+product\s+manager)/i
const NOT_PM = /\b(marketing|project\s+manager|designer|design\b|analyst|engineer|developer|sales|recruiter|scientist|support|operations\s+manager|program\s+manager|account|content|merchandis|buyer|category|brand|inside|intern\b|internship)/i

export const isProductRole = (title: string) => PM_TITLE.test(title) && !NOT_PM.test(title)

export function classifyLevel(title: string): ScrapedJob['level'] {
  const t = title.toLowerCase()
  if (/\b(director|vp\b|vice president|head of|chief|group product|gpm\b|principal|general manager)/.test(t)) return 'lead'
  if (/\b(senior|sr\.?|staff|lead)\b/.test(t)) return 'senior'
  if (/\b(associate|apm\b|junior|jr\.?|entry|graduate)/.test(t)) return 'apm'
  return 'pm'
}

const IN_HINT = /\b(india|bengaluru|bangalore|mumbai|delhi|new delhi|gurugram|gurgaon|noida|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|kochi|chandigarh|indore|coimbatore|karnataka|maharashtra|telangana|tamil nadu|haryana|uttar pradesh|gujarat)\b/i
const US_STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ')
const US_RE = new RegExp(`(,\\s*(${US_STATES.join('|')})\\b)|united states|\\bUSA?\\b`, 'i')

export function classifyCountry(location: string): ScrapedJob['country'] {
  if (IN_HINT.test(location)) return 'IN'
  if (US_RE.test(location)) return 'US'
  return 'OTHER'
}

export function classifyMode(title: string, location: string): ScrapedJob['work_mode'] {
  const t = `${title} ${location}`.toLowerCase()
  if (/\bremote\b/.test(t)) return 'remote'
  if (/\bhybrid\b/.test(t)) return 'hybrid'
  if (/\bon-?site\b/.test(t)) return 'onsite'
  return null
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** Keep only PM roles in our markets that were posted today or yesterday (UTC): the "last 2 days" window. */
export function toJobs(cards: ReturnType<typeof parseCards>, now = new Date()): ScrapedJob[] {
  const cutoff = isoDay(new Date(now.getTime() - 86400000))
  const seen = new Set<string>()
  const jobs: ScrapedJob[] = []
  for (const c of cards) {
    if (seen.has(c.id) || !c.postedOn || c.postedOn < cutoff || c.postedOn > isoDay(new Date(now.getTime() + 86400000))) continue
    if (!isProductRole(c.title)) continue
    const country = classifyCountry(c.location)
    if (country === 'OTHER') continue
    seen.add(c.id)
    jobs.push({
      id: c.id,
      title: c.title,
      company: c.company,
      location: c.location,
      country,
      work_mode: classifyMode(c.title, c.location),
      level: classifyLevel(c.title),
      url: `https://www.linkedin.com/jobs/view/${c.id}`,
      posted_on: c.postedOn,
      source: 'linkedin',
    })
  }
  return jobs
}
