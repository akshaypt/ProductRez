// Job categorisation and resume ↔ job matching.
//
// One implementation shared by the scraper (classifies each posting), the app (builds a resume profile when a scan is saved)
// and the tests. The `get_matched_jobs` SQL function in supabase/migrations mirrors `scoreMatch` exactly: keep them in step.
import { TRACK_KB } from '../kb/tracks.ts'
import type { CompanyArchetype, Level, MarketRegion, PmTrack, ScoreReport } from '../types.ts'

/* ------------------------------------------------------------------ skills vocabulary */

export interface SkillDef { id: string; label: string; re: RegExp }
const s = (id: string, label: string, re: RegExp): SkillDef => ({ id, label, re })

/** The shared vocabulary. Jobs and resumes are both reduced to ids from this list, so overlap is a plain set intersection. */
export const JOB_SKILLS: SkillDef[] = [
  // craft
  s('roadmap', 'Roadmapping', /\broadmap(s|ping)?\b/i),
  s('prioritization', 'Prioritization', /\bprioriti[sz](e|ation|ing)\b|\btrade-?offs?\b/i),
  s('prd', 'PRDs and specs', /\bprds?\b|product requirements?|\bspecs?\b|user stories/i),
  s('discovery', 'Customer discovery', /customer discovery|user research|user interviews?|customer interviews?|\bjtbd\b|jobs[- ]to[- ]be[- ]done|usability/i),
  s('experimentation', 'Experimentation', /a\/b test|\bab test|experiment(s|ation|ing)?|split test|hypothes[ie]s|multivariate/i),
  s('analytics', 'Product analytics', /product analytics|\bamplitude\b|\bmixpanel\b|\bposthog\b|\bheap\b|funnel analysis|cohort analysis|\blooker\b|\btableau\b|\bmetabase\b|data[- ]driven/i),
  s('sql', 'SQL', /\bsql\b|\bbigquery\b|\bsnowflake\b|\bredshift\b/i),
  s('okrs', 'OKRs and KPIs', /\bokrs?\b|\bkpis?\b|north star|success metrics?/i),
  s('stakeholder', 'Stakeholder management', /stakeholders?|cross[- ]functional|executive|leadership alignment/i),
  s('gtm', 'Go-to-market', /go[- ]to[- ]market|\bgtm\b|product launch|launch(es|ing)?\b.{0,20}(strategy|plan)|positioning/i),
  s('pricing', 'Pricing and monetization', /pricing|packaging|monetiz|paywall|revenue growth|\barpu\b/i),
  s('strategy', 'Product strategy', /product strategy|product vision|long[- ]term vision|strategic planning|\bvision\b/i),
  s('agile', 'Agile delivery', /\bagile\b|\bscrum\b|\bkanban\b|sprint|backlog/i),
  s('competitive', 'Market and competitive analysis', /competitive (analysis|landscape)|market (analysis|research|sizing)|\bcompetitors?\b/i),
  s('design', 'Design partnership', /\bfigma\b|\bux\b|user experience|design (system|partner)|prototyp/i),
  s('team_lead', 'Leading PMs and teams', /manage[sd]? (a )?(team|pms?|product managers)|mentor|coach|hire[sd]?\b|people management|build(ing)? (a )?team/i),
  // growth & consumer
  s('growth', 'Growth', /\bgrowth\b|acquisition|activation|virality|referral/i),
  s('retention', 'Retention and engagement', /retention|engagement|churn|reactivation|lifecycle|\bcrm\b|notifications?/i),
  s('onboarding', 'Onboarding', /onboarding|first[- ]time user|time[- ]to[- ]value/i),
  s('plg', 'Product-led growth', /\bplg\b|product[- ]led|self[- ]serve|freemium|free trial|trial[- ]to[- ]paid/i),
  s('personalization', 'Personalization and recommendations', /personali[sz]ation|recommend(er|ation)s?|ranking|feed\b/i),
  s('search', 'Search', /\bsearch\b.{0,30}(relevance|ranking|product|experience)|information retrieval/i),
  s('marketplace', 'Marketplaces', /marketplace|two[- ]sided|supply and demand|buyers? and sellers?/i),
  s('consumer', 'Consumer products', /\bconsumer\b|\bb2c\b|\bd2c\b|direct[- ]to[- ]consumer|mobile app/i),
  s('mobile', 'Mobile', /\bios\b|\bandroid\b|mobile (app|product|experience)|react native|\bflutter\b/i),
  s('ecommerce', 'E-commerce and retail', /e-?commerce|checkout|cart\b|catalog|retail|merchant/i),
  s('logistics', 'Logistics and supply chain', /logistics|supply chain|fulfil?lment|last[- ]mile|warehouse|delivery/i),
  // AI / data
  s('llm', 'LLMs and generative AI', /\bllms?\b|large language|generative ai|\bgenai\b|gen ai|\bgpt\b|prompt engineering|foundation models?/i),
  s('rag', 'RAG and context engineering', /\brag\b|retrieval[- ]augmented|context engineering|embeddings?|vector (search|db|database)/i),
  s('evals', 'AI evals and quality', /\bevals?\b|evaluations?\b.{0,20}(model|llm|ai)|golden set|llm[- ]as[- ]a[- ]judge|guardrails?|hallucination/i),
  s('ml', 'Machine learning', /machine learning|\bml\b|deep learning|\bnlp\b|computer vision|model (training|quality|performance)|data science/i),
  s('agents', 'AI agents', /\bagents?\b.{0,20}(ai|llm|autonomous|workflow)|agentic|ai agents?|copilots?/i),
  s('data_platform', 'Data platforms', /data platform|data pipelines?|\betl\b|data warehouse|data (products?|infrastructure)|\bdbt\b|analytics engineering/i),
  // platform & infra
  s('api', 'APIs and integrations', /\bapis?\b|\bsdks?\b|integrations?|webhooks?|developer (experience|platform|tools?)|\bdevex\b|open ?api/i),
  s('platform', 'Platform products', /\bplatform\b|internal tools|shared services|infrastructure|\bpaas\b|\biaas\b/i),
  s('cloud', 'Cloud and infrastructure', /\baws\b|\bgcp\b|\bazure\b|kubernetes|\bdevops\b|\bcloud\b|serverless|microservices/i),
  s('security', 'Security and compliance', /security|compliance|\bsoc ?2\b|\bgdpr\b|\bhipaa\b|\bpci\b|privacy|\biso ?27001\b|identity|\bsso\b|\brbac\b/i),
  s('observability', 'Observability', /observability|monitoring|telemetry|tracing|opentelemetry|incident|\bsla\b|\bslo\b|reliability/i),
  s('performance', 'Scalability and performance', /scalab(le|ility)|latency|throughput|performance|high[- ]availability|uptime/i),
  // enterprise
  s('b2b', 'B2B and enterprise', /\bb2b\b|enterprise|\bsaas\b|multi[- ]tenant|customer success|account (management|executives?)/i),
  s('workflow', 'Workflow automation', /workflow(s)?|automation|no[- ]code|low[- ]code|process automation|\brpa\b/i),
  s('crm_erp', 'CRM and ERP', /\bcrm\b|\berp\b|salesforce|\bhubspot\b|\bsap\b|netsuite|accounting/i),
  s('sales_enablement', 'Sales and CS enablement', /sales enablement|sales (team|collateral)|pre-?sales|customer success|\bcs\b team|renewals?|expansion revenue|\bnrr\b/i),
  // fintech
  s('payments', 'Payments', /payments?|\bupi\b|card (network|issuing|processing)|acquir(er|ing)|payouts?|settlement|authori[sz]ation rate|merchant acquiring|\bpos\b/i),
  s('lending', 'Lending and credit', /lending|credit (risk|scoring|products?|lines?)|loans?|underwriting|\bbnpl\b|collections|disbursals?/i),
  s('kyc_risk', 'KYC, fraud and risk', /\bkyc\b|\baml\b|fraud|risk (management|engine|models?)|chargebacks?|sanctions/i),
  s('banking', 'Banking and wallets', /banking|neobank|wallets?|ledger|treasury|core banking|virtual accounts?|deposits?|\bfintech\b/i),
  s('insurance_invest', 'Insurance and investing', /insurance|insurtech|wealth|investing|brokerage|trading|mutual funds?|capital markets/i),
  // other domains
  s('healthtech', 'Healthtech', /health(care|tech)?\b|clinical|patients?|\behr\b|telemedicine|pharma/i),
  s('edtech', 'Edtech', /\bedtech\b|education|learners?|students?|courses?\b|curriculum/i),
  s('adtech', 'Ads and monetization platforms', /\badtech\b|advertis(ing|ers?)|ad (platform|tech|products?)|\bdsp\b|\bssp\b|programmatic|\bcpm\b/i),
  s('media_gaming', 'Media, creators and gaming', /\bgaming\b|\bgames?\b|streaming|creators?|content (platform|creation)|video (platform|product)/i),
  s('travel_mobility', 'Travel and mobility', /travel|booking|mobility|ride[- ]?(hailing|share)|hospitality|airlines?/i),
  s('climate_agri', 'Climate and agri', /climate|\bagri(tech|culture)?\b|farm(ers?|ing)|sustainab|energy|\bev\b charging/i),
  s('devtools', 'Developer tools', /developer tools?|\bide\b|ci\/cd|code (review|search)|open[- ]source|\bgithub\b|\bcli\b/i),
  s('globalisation', 'Localisation and global', /locali[sz]ation|internationali[sz]ation|multi[- ]?(currency|region|language)|emerging markets?/i),
]

const SKILL_BY_ID = new Map(JOB_SKILLS.map((k) => [k.id, k]))
export const skillLabel = (id: string) => SKILL_BY_ID.get(id)?.label ?? id

/** Reduce any text to the vocabulary ids it mentions. */
export function extractSkills(text: string): string[] {
  const t = ` ${text} `
  return JOB_SKILLS.filter((k) => k.re.test(t)).map((k) => k.id)
}

/* ------------------------------------------------------------------ job classification */

export interface JobInput {
  title: string
  location?: string
  description?: string
  department?: string
  /** Free-text compensation, if the board exposes it (Ashby does). */
  compensation?: string
}

export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type JobMarket = 'india' | 'us' | 'remote_global' | 'other'
export interface SalaryBand { currency: 'INR' | 'USD'; min: number; max: number }

export interface JobClass {
  isPm: boolean
  level: Level
  track: PmTrack
  market: JobMarket
  country: 'IN' | 'US' | 'OTHER'
  workMode: WorkMode | null
  skills: string[]
  yearsRequired: number | null
  salary: SalaryBand | null
}

const PM_YES = /\b(product manager|product management|product owner|product lead|group product manager|associate product manager|principal product manager|staff product manager|head of product|director,? (of )?product|vp,? (of )?product|vice president,? (of )?product|chief product officer|apm|gpm)\b/i
const PM_NO = /\b(marketing|program manager|project manager|designer|design|analyst|engineer(ing)?|support|operations|counsel|recruit(er|ing)|sales|account (executive|manager)|customer success|content|research(er)?|data scientist|solutions?|partner(ship)?s?|talent|coordinator|assistant|intern(ship)?|trainer|writer|compliance|finance|financial|legal|hr\b|people|chief of staff|of staff|communications?|enablement|education|evangelist|advocate|advocacy)\b/i

export function isProductManagerTitle(title: string): boolean {
  if (!PM_YES.test(title)) return false
  // "Product Manager, Growth" is fine; "Product Marketing Manager" and "Technical Program Manager" are not.
  const withoutPm = title.replace(PM_YES, ' ')
  return !PM_NO.test(withoutPm) && !/product (marketing|operations|design|analyst|support|security)\b/i.test(title)
}

export function levelFromTitle(title: string): Level {
  const t = title.toLowerCase()
  if (/\b(associate product manager|apm|product manager (i|1)\b|junior|graduate|entry)\b/.test(t) && !/\bsenior|\bii\b|\biii\b/.test(t)) return 'apm'
  if (/\b(group product manager|gpm|director|head of|vp\b|vice president|chief product|principal|staff|distinguished)\b/.test(t)) return 'lead'
  if (/\b(senior|sr\.?|lead product manager|product manager (ii|iii|2|3)\b)/.test(t)) return 'senior'
  return 'pm'
}

const INDIA = /\b(india|bengaluru|bangalore|mumbai|delhi|new delhi|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad|kochi|jaipur|chandigarh|indore|coimbatore)\b/i
const US_STATES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC'
const US_NAMES = /\b(united states|usa|u\.s\.a?\.?|us only|us-remote|remote[- ]us|new york|san francisco|seattle|austin|boston|chicago|los angeles|denver|atlanta|miami|washington,? d\.?c\.?)\b/i
// State codes and a bare "US" are only meaningful in capitals (", CA", "NYC, NY"), so they stay case-sensitive.
const US_CODES = new RegExp(`,\\s*(${US_STATES})\\b|\\bUS\\b`)
const REMOTE = /\b(remote|anywhere|work from home|wfh|distributed)\b/i

// A role that names another country or region is not for our markets, even when it says "remote" (e.g. "Canada - Remote", "Remote, EMEA").
const ELSEWHERE = /\b(canada|united kingdom|\buk\b|england|london|europe|emea|germany|berlin|france|paris|ireland|dublin|netherlands|amsterdam|spain|madrid|portugal|lisbon|poland|sweden|stockholm|switzerland|zurich|singapore|australia|sydney|new zealand|brazil|mexico|japan|tokyo|korea|israel|tel aviv|dubai|uae|latam|apac|asia pacific|china|hong kong)\b/i

export function marketFromLocation(location: string): { market: JobMarket; country: 'IN' | 'US' | 'OTHER' } {
  const loc = location || ''
  if (INDIA.test(loc)) return { market: 'india', country: 'IN' }
  if (US_NAMES.test(loc) || US_CODES.test(loc)) return { market: 'us', country: 'US' }
  if (ELSEWHERE.test(loc)) return { market: 'other', country: 'OTHER' }
  if (REMOTE.test(loc)) return { market: 'remote_global', country: 'OTHER' }
  return { market: 'other', country: 'OTHER' }
}

export function workModeFrom(location: string, description: string): WorkMode | null {
  const head = `${location} ${description.slice(0, 1500)}`.toLowerCase()
  if (/\bhybrid\b/.test(head)) return 'hybrid'
  if (/\b(remote|work from home|wfh|anywhere)\b/.test(location.toLowerCase()) || /\b(fully remote|100% remote|remote[- ]first|remote position|this is a remote)\b/.test(head)) return 'remote'
  if (/\b(on-?site|in[- ]office|in[- ]person|office[- ]based)\b/.test(head)) return 'onsite'
  return location ? 'onsite' : null
}

const TRACK_TITLE: [PmTrack, RegExp][] = [
  ['ai_ml', /\b(ai|a\.i\.|ml|machine learning|llm|genai|generative|agents?|copilot|intelligence)\b/i],
  ['platform_api', /\b(platform|api|apis|developer|developers|infrastructure|sdk|devex|integrations?|data platform|cloud)\b/i],
  ['fintech', /\b(payments?|fintech|lending|credit|banking|risk|fraud|billing|checkout|treasury|wallet|cards?|insurance|wealth|capital|kyc|compliance)\b/i],
  ['growth_plg', /\b(growth|plg|acquisition|activation|retention|monetization|conversion|engagement|lifecycle|onboarding|consumer)\b/i],
  ['b2b_saas', /\b(enterprise|b2b|saas|workflow|admin|security|identity|crm|erp)\b/i],
]
const count = (re: RegExp, text: string) => (text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) ?? []).length

export function trackFor(title: string, description: string, skills: string[]): PmTrack {
  const score: Record<PmTrack, number> = { generalist: 0.5, ai_ml: 0, growth_plg: 0, b2b_saas: 0, platform_api: 0, fintech: 0 }
  for (const [t, re] of TRACK_TITLE) if (re.test(title)) score[t] += 4
  const body = description.slice(0, 6000)
  for (const t of Object.keys(TRACK_KB) as PmTrack[]) {
    if (t === 'generalist') continue
    const k = TRACK_KB[t]
    score[t] += Math.min(3, count(k.coreKpisPattern, body) * 0.35) + Math.min(2, count(k.toolsPattern, body) * 0.35)
  }
  const bonus: Record<string, PmTrack> = { llm: 'ai_ml', rag: 'ai_ml', evals: 'ai_ml', ml: 'ai_ml', agents: 'ai_ml', api: 'platform_api', platform: 'platform_api', observability: 'platform_api', payments: 'fintech', lending: 'fintech', kyc_risk: 'fintech', banking: 'fintech', growth: 'growth_plg', plg: 'growth_plg', retention: 'growth_plg', b2b: 'b2b_saas', workflow: 'b2b_saas', crm_erp: 'b2b_saas' }
  for (const id of skills) if (bonus[id]) score[bonus[id]] += 0.6
  const best = (Object.entries(score) as [PmTrack, number][]).sort((a, b) => b[1] - a[1])[0]
  return best[1] >= 2 ? best[0] : 'generalist'
}

export function yearsRequiredFrom(text: string): number | null {
  const m =
    text.match(/(\d{1,2})\s*(?:\+|plus)?\s*(?:-\s*\d{1,2}\s*)?years?\s+(?:of\s+)?(?:product\s+management|pm|relevant|related|work|professional|experience)/i) ??
    text.match(/(?:minimum|at\s+least)\s+(\d{1,2})\s+years?/i)
  const n = m ? parseInt(m[1], 10) : NaN
  return Number.isFinite(n) && n > 0 && n < 25 ? n : null
}

const num = (x: string) => parseFloat(x.replace(/,/g, ''))

/** Pulls a pay range from posting text. USD is returned in thousands ($k), INR in lakhs per annum (L), like the compensation KB. */
export function parseSalary(text: string): SalaryBand | null {
  if (!text) return null
  const t = text.replace(/ /g, ' ')
  // India: ₹42L–₹54L, ₹30 - 45 LPA, INR 42,00,000 - 54,00,000
  let m = t.match(/(?:₹|inr|rs\.?)\s*(\d{1,3}(?:\.\d+)?)\s*(?:l|lpa|lakhs?)?\s*(?:-|–|—|to)\s*(?:₹|inr|rs\.?)?\s*(\d{1,3}(?:\.\d+)?)\s*(l|lpa|lakhs?)/i)
  if (m) {
    const a = num(m[1]), b = num(m[2])
    if (a >= 5 && b >= a && b <= 400) return { currency: 'INR', min: a, max: b }
  }
  m = t.match(/(?:₹|inr|rs\.?)\s*(\d{1,3}(?:,\d{2})*,\d{3})\s*(?:-|–|—|to)\s*(?:₹|inr|rs\.?)?\s*(\d{1,3}(?:,\d{2})*,\d{3})/i)
  if (m) {
    const a = num(m[1]) / 100000, b = num(m[2]) / 100000
    if (a >= 5 && b >= a && b <= 400) return { currency: 'INR', min: Math.round(a * 10) / 10, max: Math.round(b * 10) / 10 }
  }
  // USD: $210,000 - $260,000 or $210k–$260k
  m = t.match(/\$\s*(\d{2,3}(?:,\d{3})+)\s*(?:usd)?\s*(?:-|–|—|to)\s*\$?\s*(\d{2,3}(?:,\d{3})+)/i)
  if (m) {
    const a = num(m[1]) / 1000, b = num(m[2]) / 1000
    if (a >= 40 && b >= a && b <= 900) return { currency: 'USD', min: Math.round(a), max: Math.round(b) }
  }
  m = t.match(/\$\s*(\d{2,3})\s*k\s*(?:-|–|—|to)\s*\$?\s*(\d{2,3})\s*k/i)
  if (m) {
    const a = num(m[1]), b = num(m[2])
    if (a >= 40 && b >= a && b <= 900) return { currency: 'USD', min: a, max: b }
  }
  return null
}

export function classifyJob(job: JobInput): JobClass {
  const description = job.description ?? ''
  const location = job.location ?? ''
  const skills = extractSkills(`${job.title}\n${job.department ?? ''}\n${description}`)
  const { market, country } = marketFromLocation(location)
  return {
    isPm: isProductManagerTitle(job.title),
    level: levelFromTitle(job.title),
    track: trackFor(job.title, description, skills),
    market,
    country,
    workMode: workModeFrom(location, description),
    skills,
    yearsRequired: yearsRequiredFrom(description),
    salary: parseSalary(job.compensation ?? '') ?? parseSalary(description),
  }
}

/* ------------------------------------------------------------------ resume profile */

export interface ResumeProfile {
  skills: string[]
  level: Level
  track: PmTrack
  trackScores: Partial<Record<PmTrack, number>>
  market: MarketRegion
  archetype: CompanyArchetype
  years: number
  salary: { currency: 'INR' | 'USD'; low: number; high: number } | null
}

/** Postings stay in the feed for two weeks. Company boards post few PM roles a day, so a 72-hour window would leave only a handful. */
export const FEED_WINDOW_HOURS = 336
/** A posting counts as new for its first three days. */
export const NEW_HOURS = 72

/** Everything the matcher needs from a scored resume, small enough to store beside the scan. */
export function profileFromReport(r: ScoreReport): ResumeProfile {
  const p = r.parsed
  const text = [
    p.summary,
    p.basics.headline,
    ...p.skills.map((k) => k.items),
    ...p.experience.flatMap((e) => [e.title, ...e.bullets]),
    ...p.projects.flatMap((x) => [x.name, ...x.bullets]),
  ].join('\n')
  const trackScores: Partial<Record<PmTrack, number>> = {}
  for (const t of r.marketStanding.trackReadiness) trackScores[t.track] = t.readinessScore
  const best = [...r.marketStanding.trackReadiness].sort((a, b) => b.readinessScore - a.readinessScore)[0]
  const band = r.compensation.resumeCalibratedBand
  return {
    skills: extractSkills(text),
    level: r.contextUsed.level,
    track: best?.track ?? r.contextUsed.track,
    trackScores,
    market: r.contextUsed.market,
    archetype: r.contextUsed.companyArchetype,
    years: r.contextUsed.totalYears,
    salary: { currency: r.compensation.currency, low: band.low, high: band.high },
  }
}

/* ------------------------------------------------------------------ matching */

export interface MatchableJob {
  skills: string[]
  track: PmTrack
  level: Level | null
  archetype?: CompanyArchetype | null
  salary: SalaryBand | null
  /** Hours since the posting went live. */
  ageHours: number
}

export interface MatchResult {
  score: number
  matched: string[]
  missing: string[]
  parts: { skills: number; track: number; pay: number; fresh: number; level: number }
}

const LEVELS: Level[] = ['apm', 'pm', 'senior', 'lead']

/**
 * 45% skill overlap, 25% track and company type, 15% pay fit, 15% freshness (under a day 1, under 3 days 0.8, under a week 0.55, then 0.3), then scaled by how far the job's level is from yours.
 * Missing data scores neutral (0.5) rather than zero, so a posting without a salary is not punished.
 */
export function scoreMatch(profile: ResumeProfile, job: MatchableJob): MatchResult {
  const mine = new Set(profile.skills)
  const matched = job.skills.filter((k) => mine.has(k))
  const missing = job.skills.filter((k) => !mine.has(k))
  const skills = job.skills.length ? matched.length / job.skills.length : 0.5

  const trackFit = (profile.trackScores[job.track] ?? (job.track === 'generalist' ? 70 : 50)) / 100
  const archFit = job.archetype ? (job.archetype === profile.archetype ? 1 : 0.5) : 0.5
  const track = 0.75 * trackFit + 0.25 * archFit

  let pay = 0.5
  if (job.salary && profile.salary && job.salary.currency === profile.salary.currency) {
    const { low, high } = profile.salary
    pay = job.salary.max < low ? 0.2 : job.salary.min > high ? 1 : 0.75 + 0.25 * Math.min(1, (Math.min(job.salary.max, high) - Math.max(job.salary.min, low)) / Math.max(1, high - low))
  }

  const fresh = job.ageHours < 24 ? 1 : job.ageHours < NEW_HOURS ? 0.8 : job.ageHours < 168 ? 0.55 : 0.3

  const gap = job.level ? Math.abs(LEVELS.indexOf(job.level) - LEVELS.indexOf(profile.level)) : 0
  const level = gap === 0 ? 1 : gap === 1 ? 0.8 : 0.5

  // Round to 6 places first so an exact .5 tie rounds the same way as the database's exact arithmetic does (57.5 → 58, not 57.4999…).
  const raw = 100 * (0.45 * skills + 0.25 * track + 0.15 * pay + 0.15 * fresh) * level
  const score = Math.round(Math.round(raw * 1e6) / 1e6)
  return { score, matched, missing, parts: { skills, track, pay, fresh, level } }
}
