export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function postedLabel(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (isoDate >= today) return 'Today'
  if (isoDate === y) return 'Yesterday'
  return isoDate
}

export function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Hours + minutes until the next 01:30 UTC (07:00 AM IST) job drop. */
/** The job collector runs at 01:30 UTC (7:00 AM IST) and 13:30 UTC. */
export function nextDrop(now = new Date()): { h: number; m: number } {
  const day = (h: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 30))
  const t = [day(1), day(13), new Date(day(1).getTime() + 86400000)].find((x) => x > now)!
  const mins = Math.round((t.getTime() - now.getTime()) / 60000)
  return { h: Math.floor(mins / 60), m: mins % 60 }
}

export function download(filename: string, content: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume'

export function guessPaper(): 'a4' | 'letter' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (/^Asia\/(Kolkata|Calcutta)$/.test(tz)) return 'a4'
    if (/^(America|US)\//.test(tz)) return 'letter'
    return /^(Europe|Asia|Australia|Africa)\//.test(tz) ? 'a4' : 'letter'
  } catch {
    return 'letter'
  }
}

export type Currency = 'INR' | 'USD'

/**
 * Reads the currency a resume is written for, from the resume text alone. Rule based: explicit currency marks and pay words
 * count most, then where the person lives (phone code, cities, country, US state plus ZIP). A "$" next to a number counts
 * little, because Indian resumes also quote revenue in dollars. Returns null when the evidence is missing or split.
 */
export function detectCurrency(text: string): Currency | null {
  const t = text.slice(0, 20000)
  const n = (re: RegExp) => (t.match(re) ?? []).length
  let inr = 0
  let usd = 0
  inr += 4 * Math.min(2, n(/₹|\bINR\b|\bRs\.?\s?\d|\bLPA\b|\blakhs?\b|\blacs?\b|\bcrores?\b/gi))
  inr += 3 * Math.min(1, n(/(^|[^\d])\+?91[\s-]?\d{5}[\s-]?\d{5}\b|\+91[\s-]?\d/g))
  inr += 2 * Math.min(2, n(/\b(Bengaluru|Bangalore|Mumbai|Delhi|New Delhi|Gurugram|Gurgaon|Noida|Hyderabad|Pune|Chennai|Kolkata|Ahmedabad|Jaipur|Kochi|Chandigarh|Indore|Nagpur)\b/g))
  inr += 2 * Math.min(1, n(/\bIndia\b/g))
  inr += 1 * Math.min(1, n(/\b(IIT|IIM|BITS Pilani|NIT|NSIT|DTU|VIT|SRM)\b/g))
  usd += 4 * Math.min(2, n(/\bUSD\b|\bUS\$|\bUS dollars?\b/gi))
  usd += 3 * Math.min(1, n(/\(\d{3}\)\s?\d{3}[-.\s]\d{4}\b|(^|[^\d])\+1[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g))
  usd += 3 * Math.min(1, n(/,\s?(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}\b/g))
  usd += 2 * Math.min(2, n(/\b(San Francisco|San Jose|Seattle|Austin|Boston|Chicago|Los Angeles|San Diego|Denver|Atlanta|Palo Alto|Mountain View|Menlo Park|Bay Area|Brooklyn|Manhattan|New York|Washington, D\.?C\.?|Dallas|Houston|Portland, OR|Cambridge, MA)\b/g))
  usd += 2 * Math.min(1, n(/\b(United States|U\.S\.A?\.?|USA)\b/g))
  usd += 1 * Math.min(1, n(/(^|[^\w])\$\s?\d/g))
  if (Math.max(inr, usd) < 2 || Math.abs(inr - usd) < 2) return null
  return inr > usd ? 'INR' : 'USD'
}

/** The salary data and formatting norms in the engine are keyed by market; the currency decides which one applies. */
export const marketForCurrency = (c: Currency): 'india' | 'us' => (c === 'INR' ? 'india' : 'us')
export const currencyForMarket = (m: string | undefined | null): Currency => (m === 'india' ? 'INR' : 'USD')

export function safeStorage() {
  return {
    get<T>(k: string, fallback: T): T {
      try {
        const v = localStorage.getItem(k)
        return v ? (JSON.parse(v) as T) : fallback
      } catch {
        return fallback
      }
    },
    set(k: string, v: unknown) {
      try {
        localStorage.setItem(k, JSON.stringify(v))
      } catch {
        /* ignore */
      }
    },
  }
}
export const store = safeStorage()
