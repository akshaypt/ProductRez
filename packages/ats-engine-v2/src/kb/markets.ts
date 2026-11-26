import type { Level, MarketRegion } from '../types.ts'

export interface MarketKb {
  id: MarketRegion
  label: string
  strictPiiCheck: boolean
  /** Maximum recommended pages given target level & years */
  maxRecommendedPages: (level: Level, totalYears: number) => number
  remoteAsyncPattern?: RegExp
  piiHint: string
  formattingNote: string
}

export const PII_PATTERNS: { id: string; label: string; pattern: RegExp }[] = [
  { id: 'dob', label: 'Date of birth / Age', pattern: /\b(date of birth|dob|d\.o\.b\.?|birth\s*date)\b/i },
  { id: 'marital', label: 'Marital status', pattern: /\b(marital status|married|unmarried|single)\b/i },
  { id: 'gender', label: 'Gender / Nationality', pattern: /\b(gender\s*:|nationality\s*:|father'?s name|passport\s*no)\b/i },
  { id: 'photo', label: 'Photo / Headshot mention', pattern: /\b(headshot|profile photo)\b/i },
]

export const REMOTE_SIGNALS = {
  timezone: /\b(est|pst|gmt|utc|ist|overlap|time\s*zone|timezone|us\s*hours|async|asynchronous|distributed\s+(team|squad|eng)|remote)\b/i,
  asyncArtifacts: /\b(prd|rfc|async|documentation|loom|notion|decision\s*doc|written\s+spec|written\s+strategy|remote)\b/i,
}

export const MARKET_KB: Record<MarketRegion, MarketKb> = {
  us: {
    id: 'us',
    label: 'United States',
    strictPiiCheck: true,
    maxRecommendedPages: (level, years) => (level === 'lead' || years >= 10 ? 2 : 1),
    piiHint: 'US HR compliance & bias filters penalize personal details (DOB, marital status, gender, nationality, or headshot). Strip them completely.',
    formattingNote: 'US tech teams strongly expect 1 page under ~10 years of experience, metric-first bullets, and zero PII.',
  },
  india: {
    id: 'india',
    label: 'India',
    strictPiiCheck: false,
    maxRecommendedPages: (level, years) => (level === 'senior' || level === 'lead' || years >= 7 ? 2 : 1),
    piiHint: 'Modern Indian startups & GCCs (Flipkart, Razorpay, Google/Microsoft India) prefer US-style clean resumes without DOB, marital status, or photos.',
    formattingNote: '1 page is strongly preferred up to ~6–7 years; 2 pages are acceptable for Senior/Group PMs with multi-product portfolios.',
  },
  remote_global: {
    id: 'remote_global',
    label: 'Global / US Remote',
    strictPiiCheck: true,
    maxRecommendedPages: (level, years) => (level === 'lead' || years >= 10 ? 2 : 1),
    remoteAsyncPattern: REMOTE_SIGNALS.timezone,
    piiHint: 'Global remote companies follow US/EU anti-bias rules: remove DOB, marital status, nationality/passport notes, and photos.',
    formattingNote: 'Remote recruiters look to de-risk time-zone overlap and asynchronous execution: signal EST/PST/UTC overlap, async PRDs/RFCs, and distributed squad ownership.',
  },
}
