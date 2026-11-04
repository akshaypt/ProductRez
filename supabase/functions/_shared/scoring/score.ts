import {
  AI_PM_PATTERN,
  BUSINESS_METRIC_WORDS,
  BUZZWORDS,
  CHANGE_WORDS,
  COMPETENCIES,
  FIRST_PERSON,
  JD_PHRASES,
  LEVEL_SIGNALS,
  METRIC_PATTERNS,
  STOPWORDS,
  STRONG_VERBS,
  WEAK_PHRASES,
} from './lexicon.ts'
import { DATE_RANGE, parseResume } from './parse.ts'
import type {
  BulletFlag,
  BulletReview,
  Competency,
  Dimension,
  DimensionId,
  Finding,
  KeywordMatch,
  Level,
  ResumeData,
  ScoreInput,
  ScoreReport,
} from './types.ts'

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n)
const words = (s: string) => s.split(/\s+/).filter(Boolean)
const first = (s: string) => (s.match(/^[A-Za-z][A-Za-z'-]*/)?.[0] ?? '').toLowerCase()
const pct = (a: number, b: number) => (b === 0 ? 0 : a / b)
const trim = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

const LEVEL_ORDER: Level[] = ['apm', 'pm', 'senior', 'lead']
const LEVEL_LABEL: Record<Level, string> = {
  apm: 'Associate / entry-level PM',
  pm: 'Product Manager',
  senior: 'Senior PM',
  lead: 'Group PM / Director+',
}

export function hasMetric(text: string): boolean {
  return METRIC_PATTERNS.some((re) => re.test(text))
}

export function isWeakOpening(text: string): boolean {
  return WEAK_PHRASES.some((re) => re.test(text))
}

function looksLikeVerb(w: string): boolean {
  if (STRONG_VERBS.has(w)) return true
  return /(ed|ing)$/.test(w) && w.length > 4 && !/^(during|nothing|something|anything|everything|string|king|ring|bring)$/.test(w)
    ? w.endsWith('ed')
    : false
}

export function reviewBullet(
  text: string,
  section: BulletReview['section'],
  context: string,
  isCurrentRole: boolean,
): BulletReview {
  const flags: BulletFlag[] = []
  const w = words(text)
  const n = w.length
  const metric = hasMetric(text)
  const outcome = BUSINESS_METRIC_WORDS.test(text)
  const change = CHANGE_WORDS.test(text)
  const lead = first(text)

  let impact: 0 | 1 | 2 | 3 = 0
  if (metric && outcome && change) impact = 3
  else if (metric) impact = 2
  else if (outcome && change) impact = 1
  if (!metric) flags.push('no-metric')

  if (isWeakOpening(text)) flags.push('weak-verb')
  else if (!looksLikeVerb(lead) && !/^(ex-)?[a-z]+(ed)$/.test(lead)) flags.push('no-verb')
  else if (!isCurrentRole && /^(lead|manage|own|drive|build|launch|define|run|create|design)s?$/.test(lead)) flags.push('weak-verb')

  if (n > 38) flags.push('too-long')
  if (n < 8) flags.push('too-short')
  if (FIRST_PERSON.test(text)) flags.push('first-person')
  if (/\b(was|were|been|being|is|are)\s+(\w+ly\s+)?\w+(ed|en)\b/i.test(text) && !/^\w+ed\b/i.test(text)) flags.push('passive')
  const lower = text.toLowerCase()
  if (BUZZWORDS.some((b) => lower.includes(b))) flags.push('buzzword')

  const competencies = COMPETENCIES.filter((c) => c.pattern.test(text)).map((c) => c.id)
  return { text, section, context, impact, words: n, flags, competencies }
}

function yearOf(s: string): number | null {
  const m = s.match(/(19|20)\d{2}/)
  return m ? parseInt(m[0], 10) : null
}

function monthIndex(s: string): number {
  const m = s.toLowerCase().match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/)
  return m ? ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[0]) : 5
}

export function estimateYears(data: ResumeData, now = new Date()): number {
  const spans: [number, number][] = []
  for (const x of data.experience) {
    const sy = yearOf(x.start)
    if (!sy) continue
    const present = /present|current|now/i.test(x.end) || !x.end
    const ey = present ? now.getFullYear() : yearOf(x.end)
    if (!ey) continue
    const s = sy + monthIndex(x.start) / 12
    const e = present ? now.getFullYear() + now.getMonth() / 12 : ey + monthIndex(x.end) / 12
    if (e >= s) spans.push([s, e])
  }
  spans.sort((a, b) => a[0] - b[0])
  let total = 0
  let cur: [number, number] | null = null
  for (const sp of spans) {
    if (!cur) cur = [...sp]
    else if (sp[0] <= cur[1]) cur[1] = Math.max(cur[1], sp[1])
    else {
      total += cur[1] - cur[0]
      cur = [...sp]
    }
  }
  if (cur) total += cur[1] - cur[0]
  return Math.round(total * 10) / 10
}

function detectLevel(years: number, text: string): Level {
  const byYears: Level = years < 2.5 ? 'apm' : years < 5.5 ? 'pm' : years < 9 ? 'senior' : 'lead'
  const titles = text.toLowerCase()
  if (/\b(director|vp of product|vice president|head of product|chief product|cpo|group product manager|gpm)\b/.test(titles)) return 'lead'
  if (/\b(senior product manager|sr\.? product manager|principal product manager|staff product manager|lead product manager)\b/.test(titles) && byYears === 'pm') return 'senior'
  return byYears
}

const stem = (w: string) =>
  w
    .toLowerCase()
    .replace(/[^a-z0-9+#/&.-]/g, '')
    .replace(/(ing|ed|es|s)$/, (m, _a, off, str) => (str.length - m.length >= 4 ? '' : m))

export function matchKeywords(resumeText: string, jd: string): KeywordMatch {
  const tokens = jd
    .toLowerCase()
    .split(/[^a-z0-9+#/&.-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  const freq = new Map<string, number>()
  for (const t of tokens) {
    const s = stem(t)
    if (s.length > 2) freq.set(s, (freq.get(s) ?? 0) + 1)
  }
  const jdLower = jd.toLowerCase()
  const phraseHits = JD_PHRASES.filter((p) => new RegExp(`(^|[^a-z])${p.replace(/[/+.]/g, '\\$&')}([^a-z]|$)`, 'i').test(jdLower))
  const candidates = [...freq.entries()]
    .filter(([s, c]) => c >= 2 || phraseHits.some((p) => stem(p) === s))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([s]) => s)
  const resumeStems = new Set(resumeText.toLowerCase().split(/[^a-z0-9+#/&.-]+/).map(stem))
  const resumeLower = resumeText.toLowerCase()
  const keywords = [...new Set([...phraseHits, ...candidates])].slice(0, 28)
  const matched: string[] = []
  const missing: string[] = []
  for (const k of keywords) {
    const hit = k.includes(' ') || k.includes('/') ? resumeLower.includes(k) : resumeStems.has(stem(k))
    ;(hit ? matched : missing).push(k)
  }
  return { matched, missing, percent: keywords.length ? round((matched.length / keywords.length) * 100) : 0 }
}

interface Ctx {
  push: (f: Omit<Finding, 'id'>) => void
}

export function scoreResume(input: ScoreInput, now = new Date()): ScoreReport {
  const parsed = parseResume(input.text)
  const { data } = parsed
  const findings: Finding[] = []
  const ctx: Ctx = { push: (f) => findings.push({ ...f, id: `${f.priority.toLowerCase()}-${findings.length + 1}` }) }
  const strengths: string[] = []

  // ---- bullets -----------------------------------------------------------
  const bullets: BulletReview[] = []
  data.experience.forEach((x, i) => {
    const ctxLabel = [x.title, x.company].filter(Boolean).join(' · ') || 'Experience'
    const current = i === 0 || /present|current/i.test(x.end)
    x.bullets.forEach((b) => bullets.push(reviewBullet(b, 'experience', ctxLabel, current)))
  })
  data.projects.forEach((p) => p.bullets.forEach((b) => bullets.push(reviewBullet(b, 'projects', p.name || 'Project', false))))
  if (bullets.length === 0) {
    // Prose resume: treat long sentences as bullets so we can still score something.
    parsed.lines
      .filter((l) => l.length > 50 && /[a-z]/.test(l))
      .slice(0, 24)
      .forEach((l) => bullets.push(reviewBullet(l, 'other', 'Resume', false)))
  }
  const nb = bullets.length
  const withMetrics = bullets.filter((b) => !b.flags.includes('no-metric')).length

  const years = estimateYears(data, now)
  const allText = parsed.lines.join('\n')
  const detected = detectLevel(years, `${data.experience.map((e) => e.title).join(' | ')} ${data.basics.headline}`)
  const target: Level = input.targetLevel && input.targetLevel !== 'auto' ? input.targetLevel : detected
  const targetIdx = LEVEL_ORDER.indexOf(target)

  // ---- 1. Impact -----------------------------------------------------------
  const metricShare = pct(withMetrics, nb)
  const strongImpact = pct(bullets.filter((b) => b.impact >= 2).length, nb)
  const richImpact = pct(bullets.filter((b) => b.impact === 3).length, nb)
  const heroBullets = data.experience.flatMap((x) => x.bullets.slice(0, 2)).filter(Boolean)
  const heroMetricShare = pct(heroBullets.filter(hasMetric).length, heroBullets.length)
  let impact = nb === 0 ? 5 : 100 * (0.5 * Math.min(1, strongImpact / 0.7) + 0.2 * Math.min(1, richImpact / 0.35) + 0.15 * Math.min(1, metricShare / 0.8) + 0.15 * heroMetricShare)
  impact = clamp(impact)

  if (nb > 0 && metricShare < 0.5) {
    const missing = bullets.filter((b) => b.flags.includes('no-metric'))
    ctx.push({
      priority: metricShare < 0.3 ? 'P0' : 'P1',
      dimension: 'impact',
      title: `${missing.length} of ${nb} bullets have no measurable outcome`,
      why: 'PM hiring managers skim for the metric that moved. A bullet without a number reads as activity, not impact.',
      fix: 'Rewrite each as “Verb + what you owned + metric change + timeframe”. If you lack exact numbers, use a defensible range or a relative change (“~30%”, “2x”) and be ready to explain it.',
      evidence: missing.slice(0, 3).map((b) => trim(b.text)),
      gain: round(Math.min(18, (0.7 - metricShare) * 28)),
    })
  } else if (nb > 0) strengths.push(`${round(metricShare * 100)}% of your bullets carry a quantified outcome.`)
  if (nb > 0 && heroBullets.length >= 2 && heroMetricShare < 0.5) {
    ctx.push({
      priority: 'P1',
      dimension: 'impact',
      title: 'Your top bullets per role don’t lead with results',
      why: 'The first two bullets under each role get most of the attention. Put your biggest, most quantified win first.',
      fix: 'Reorder bullets so the highest-impact one is on top, and consider leading with the result: “Grew activation 31% by redesigning onboarding…”.',
      evidence: heroBullets.filter((b) => !hasMetric(b)).slice(0, 2).map((b) => trim(b)),
      gain: 4,
    })
  }
  if (nb > 0 && richImpact < 0.15 && metricShare >= 0.4) {
    ctx.push({
      priority: 'P2',
      dimension: 'impact',
      title: 'Numbers are present but rarely show a before → after',
      why: 'A lone number (“5 features”) is output. A change (“cut churn from 6% to 4%”) is outcome.',
      fix: 'Add a baseline or comparison to your best 3 metrics: from X to Y, vs. last quarter, or % change.',
      evidence: bullets.filter((b) => b.impact === 2).slice(0, 2).map((b) => trim(b.text)),
      gain: 3,
    })
  }

  // ---- 2. Ownership & seniority ------------------------------------------
  const weak = bullets.filter((b) => b.flags.includes('weak-verb'))
  const noVerb = bullets.filter((b) => b.flags.includes('no-verb'))
  const strongOpen = bullets.filter((b) => !b.flags.includes('weak-verb') && !b.flags.includes('no-verb'))
  const ownershipShare = pct(strongOpen.length, nb)
  const scopeRe = targetIdx >= 3 ? LEVEL_SIGNALS.lead : LEVEL_SIGNALS.senior
  const scopeHits = bullets.filter((b) => scopeRe.test(b.text)).length
  const scopeNeeded = targetIdx >= 3 ? 0.35 : targetIdx === 2 ? 0.3 : targetIdx === 1 ? 0.15 : 0.05
  const scopeShare = pct(scopeHits, nb)
  const levelGap = LEVEL_ORDER.indexOf(detected) - targetIdx
  let ownership = nb === 0 ? 5 : 100 * (0.55 * Math.min(1, ownershipShare / 0.85) + 0.45 * Math.min(1, scopeShare / Math.max(0.05, scopeNeeded)))
  if (targetIdx > LEVEL_ORDER.indexOf(detected)) ownership -= 8 * (targetIdx - LEVEL_ORDER.indexOf(detected))
  ownership = clamp(ownership)

  if (weak.length + noVerb.length >= Math.max(2, nb * 0.2)) {
    ctx.push({
      priority: weak.length >= nb * 0.35 ? 'P0' : 'P1',
      dimension: 'ownership',
      title: `${weak.length + noVerb.length} bullets use passive or “helper” language`,
      why: '“Responsible for”, “helped”, “worked on” and “assisted” hide what you personally decided. Hiring managers read them as low ownership.',
      fix: 'Open with what you did: Led, Defined, Launched, Prioritized, Negotiated. If you contributed to a team win, say your part: “Defined the pricing model that…”.',
      evidence: [...weak, ...noVerb].slice(0, 3).map((b) => trim(b.text)),
      gain: round(Math.min(14, 4 + (weak.length + noVerb.length) * 1.2)),
    })
  } else if (nb > 0 && ownershipShare > 0.85) strengths.push('Strong, ownership-first verbs open almost every bullet.')

  if (nb > 0 && scopeShare < scopeNeeded * 0.6 && targetIdx >= 1) {
    ctx.push({
      priority: targetIdx >= 2 ? 'P1' : 'P2',
      dimension: 'ownership',
      title: `Scope signals are light for a ${LEVEL_LABEL[target]} resume`,
      why:
        targetIdx >= 3
          ? 'Group-level roles are hired for portfolio ownership, org design, P&L, and multi-year strategy.'
          : targetIdx === 2
            ? 'Senior PM resumes need to show strategy, roadmap ownership across teams, and influence on stakeholders.'
            : 'PM resumes should show ownership of a product area, not just individual features.',
      fix: 'Name the size of what you owned: number of teams, users, revenue, roadmap horizon, and who you influenced (execs, partners, other PMs).',
      evidence: [],
      gain: 5,
    })
  }
  if (levelGap <= -1 && years > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'ownership',
      title: `Targeting ${LEVEL_LABEL[target]} with about ${years} yrs of experience`,
      why: 'Titles and years set a ceiling on how senior a resume reads. Bullets must overcome that with scope.',
      fix: 'Lead with the scope you carried at the next level (team size, budget, decisions you owned) and quote any manager-level responsibilities.',
      evidence: [],
      gain: 2,
    })
  }

  // ---- 3. Product craft -----------------------------------------------------
  const compBullets = bullets.map((b) => b.competencies)
  const summaryAndSkills = `${data.summary} ${data.skills.map((s) => s.items).join(' ')}`
  const competencies: Competency[] = COMPETENCIES.map((c) => {
    const hits = compBullets.filter((cs) => cs.includes(c.id)).length
    const fluff = c.pattern.test(summaryAndSkills) ? 0.5 : 0
    return { id: c.id, label: c.label, hits, covered: hits >= 1 || fluff > 0 }
  })
  const proven = competencies.filter((c) => c.hits >= 1).length
  const deep = competencies.filter((c) => c.hits >= 2).length
  const expectedProven = [4, 5, 6, 6][targetIdx]
  let craft = nb === 0 ? 5 : 100 * (0.7 * Math.min(1, proven / expectedProven) + 0.3 * Math.min(1, deep / Math.max(2, expectedProven - 2)))
  craft = clamp(craft)
  const unproven = competencies.filter((c) => c.hits === 0)
  if (nb > 0 && proven < expectedProven) {
    const must = unproven.slice(0, 3)
    ctx.push({
      priority: proven <= 2 ? 'P0' : 'P1',
      dimension: 'craft',
      title: `Only ${proven} of 8 PM competencies are evidenced in your bullets`,
      why: `Interviewers map resumes to the PM loop: discovery, strategy, prioritization, execution, data, GTM, technical fluency, and influence. For a ${LEVEL_LABEL[target]} role, expect to prove ${expectedProven}+.`,
      fix: must
        .map((m) => `${m.label}: ${COMPETENCIES.find((c) => c.id === m.id)!.hint}`)
        .join(' · '),
      evidence: [],
      gain: round(Math.min(14, (expectedProven - proven) * 3.5)),
    })
  } else if (proven >= expectedProven) strengths.push(`Your bullets prove ${proven} of 8 core PM competencies.`)
  const ai = AI_PM_PATTERN.test(allText)
  if (ai) strengths.push('AI/ML experience is visible, which is the most in-demand PM niche right now.')

  // ---- 4. Writing -------------------------------------------------------------
  const long = bullets.filter((b) => b.flags.includes('too-long'))
  const short = bullets.filter((b) => b.flags.includes('too-short'))
  const fp = bullets.filter((b) => b.flags.includes('first-person'))
  const passive = bullets.filter((b) => b.flags.includes('passive'))
  const buzz = bullets.filter((b) => b.flags.includes('buzzword'))
  const textBuzz = BUZZWORDS.filter((b) => `${data.summary} ${allText}`.toLowerCase().includes(b))
  const verbCounts = new Map<string, number>()
  bullets.forEach((b) => verbCounts.set(first(b.text), (verbCounts.get(first(b.text)) ?? 0) + 1))
  const repeated = [...verbCounts.entries()].filter(([v, c]) => c >= 3 && v).sort((a, b) => b[1] - a[1])
  const avgWords = nb ? bullets.reduce((s, b) => s + b.words, 0) / nb : 0
  let writing = 100
  writing -= Math.min(25, pct(long.length, nb) * 70)
  writing -= Math.min(10, pct(short.length, nb) * 30)
  writing -= Math.min(15, fp.length * 4)
  writing -= Math.min(12, passive.length * 3)
  writing -= Math.min(12, textBuzz.length * 3)
  writing -= Math.min(12, repeated.reduce((s, [, c]) => s + (c - 2) * 2.5, 0))
  if (nb > 0 && (avgWords < 12 || avgWords > 32)) writing -= 8
  if (nb === 0) writing = 10
  writing = clamp(writing)

  if (long.length >= 2) {
    ctx.push({
      priority: 'P1',
      dimension: 'writing',
      title: `${long.length} bullets run past 38 words`,
      why: 'Recruiters spend seconds per section. Long bullets bury the result and are often skipped.',
      fix: 'Cut to one idea per bullet, ideally 15–28 words. Move secondary detail into a second bullet or into the interview.',
      evidence: long.slice(0, 2).map((b) => trim(b.text, 120)),
      gain: 3,
    })
  }
  if (textBuzz.length > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: `Buzzwords: “${textBuzz.slice(0, 4).join('”, “')}”`,
      why: 'Self-descriptions can’t be verified and are interchangeable. Evidence beats adjectives.',
      fix: 'Delete the adjective and keep the proof. “Results-driven PM” → “Grew trial-to-paid conversion 22%”.',
      evidence: [],
      gain: 2,
    })
  }
  if (repeated.length > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: `“${repeated[0][0]}” opens ${repeated[0][1]} bullets`,
      why: 'Repeated openers make a resume feel templated.',
      fix: 'Vary verbs by what you actually did: discovered, framed, prioritized, negotiated, shipped, measured.',
      evidence: [],
      gain: 1,
    })
  }
  if (fp.length > 0) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: 'First-person pronouns in bullets',
      why: 'Resume convention drops “I/we/my”; “we” also blurs your personal contribution.',
      fix: 'Start with a verb and say what you did. Replace “we” with the specific part you owned.',
      evidence: fp.slice(0, 2).map((b) => trim(b.text, 120)),
      gain: 1,
    })
  }
  if (passive.length > 1) {
    ctx.push({
      priority: 'P2',
      dimension: 'writing',
      title: 'Passive voice hides ownership',
      why: '“Was selected to lead…” centres the company, not you.',
      fix: 'Flip it to active: “Led…”, “Drove…”.',
      evidence: passive.slice(0, 2).map((b) => trim(b.text, 120)),
      gain: 1,
    })
  }
  if (nb > 0 && avgWords >= 15 && avgWords <= 28 && long.length < 2) strengths.push(`Bullets are well sized (about ${round(avgWords)} words on average).`)

  // ---- 5. ATS & structure ------------------------------------------------------
  const wc = parsed.wordCount
  const pages = input.pageCount ?? null
  const hasEmail = !!data.basics.email
  const hasPhone = !!data.basics.phone
  const hasLink = !!(data.basics.linkedin || data.basics.website)
  const has = (s: string) => parsed.sectionsFound.includes(s)
  const rolesWithDates = data.experience.filter((x) => x.start).length
  const pipes = (allText.match(/\|/g) ?? []).length
  const weirdChars = (input.text.match(/[-�]/g) ?? []).length
  const spaced = (input.text.match(/\b(?:[A-Za-z] ){5,}[A-Za-z]\b/g) ?? []).length
  const dateFormats = new Set(
    data.experience.flatMap((x) => [x.start, x.end]).filter((d) => d && !/present/i.test(d)).map((d) => (/^\d{4}$/.test(d) ? 'Y' : /\d{1,2}\/\d{4}/.test(d) ? 'N' : 'M')),
  )
  let ats = 100
  if (wc < 120) ats -= 55
  if (!hasEmail) ats -= 14
  if (!hasPhone) ats -= 4
  if (!hasLink) ats -= 5
  if (!has('experience')) ats -= 18
  if (!has('education')) ats -= 6
  if (!has('skills')) ats -= 5
  if (data.experience.length > 0 && rolesWithDates < data.experience.length) ats -= 8
  if (dateFormats.size > 1) ats -= 4
  if (weirdChars > 0) ats -= Math.min(12, weirdChars * 2)
  if (spaced > 0) ats -= 8
  if (pipes > 12) ats -= 6
  if (pages && pages > 2) ats -= 12
  else if (pages === 1 || (!pages && wc < 900)) ats += 0
  if (wc > 1000 && (!pages || pages >= 2)) ats -= 6
  if (nb > 0 && data.experience.some((x) => x.bullets.length > 8)) ats -= 3
  if (data.experience.some((x) => x.bullets.length <= 1 && x.company)) ats -= 4
  ats = clamp(ats)

  if (wc < 120) {
    ctx.push({
      priority: 'P0',
      dimension: 'ats',
      title: 'We could barely read any text from this file',
      why: 'Scanned images, design-tool exports and outlined fonts look empty to an ATS, so a recruiter may never see your resume.',
      fix: 'Export a text-based PDF (not a screenshot). Our Writer outputs a LaTeX resume with a clean text layer.',
      evidence: [],
      gain: 25,
    })
  }
  if (!hasEmail) {
    ctx.push({
      priority: 'P0',
      dimension: 'ats',
      title: 'No email address found in the header',
      why: 'ATS contact extraction relies on a plain-text email. Missing contact info means no recruiter reply.',
      fix: 'Put name, email, phone, city and LinkedIn on one or two plain-text lines at the very top (no icons, no text boxes).',
      evidence: [],
      gain: 6,
    })
  }
  if (!has('experience')) {
    ctx.push({
      priority: 'P0',
      dimension: 'ats',
      title: 'No “Experience” section detected',
      why: 'Parsers look for standard headings. Creative titles like “My Journey” can cause the section to be dropped.',
      fix: 'Use conventional headings: Summary, Experience, Projects, Education, Skills.',
      evidence: [],
      gain: 10,
    })
  }
  if (data.experience.length > 0 && rolesWithDates < data.experience.length) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats',
      title: 'Some roles have no parsable date range',
      why: 'Applicant systems compute tenure from dates; unparsed dates can misplace or hide roles.',
      fix: 'Use “Mon YYYY – Mon YYYY” or “Mon YYYY – Present” on the same line as the title or company.',
      evidence: data.experience.filter((x) => !x.start).slice(0, 2).map((x) => [x.title, x.company].filter(Boolean).join(' · ')),
      gain: 3,
    })
  }
  if (weirdChars > 0 || spaced > 0 || pipes > 12) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats',
      title: 'Text extraction shows layout artefacts',
      why: 'Icon fonts, columns, tables and letter-spaced headings extract as garbled characters or out-of-order text.',
      fix: 'Use a single column, standard fonts, no icons or tables. Our LaTeX templates are built for clean extraction.',
      evidence: [],
      gain: 5,
    })
  }
  if (pages && pages > 2) {
    ctx.push({
      priority: 'P1',
      dimension: 'ats',
      title: `${pages} pages is too long`,
      why: 'Recruiters triage in under a minute. Up to 10 years of experience should fit on one page.',
      fix: 'Cut roles older than 10–12 years, merge bullets, and drop low-signal sections.',
      evidence: [],
      gain: 4,
    })
  }
  if (!hasLink) {
    ctx.push({
      priority: 'P2',
      dimension: 'ats',
      title: 'No LinkedIn or portfolio link',
      why: 'PM hiring teams check LinkedIn for recommendations and verify titles.',
      fix: 'Add your LinkedIn URL (and a product portfolio link if you have one) next to your email.',
      evidence: [],
      gain: 1,
    })
  }
  if (hasEmail && hasPhone && has('experience') && wc >= 200 && weirdChars === 0) strengths.push('Contact details and standard section headings parse cleanly.')

  // ---- 6. Job match (optional) -------------------------------------------------
  let keywordMatch: KeywordMatch | null = null
  if (input.jobDescription && input.jobDescription.trim().length > 80) {
    keywordMatch = matchKeywords(allText, input.jobDescription)
    if (keywordMatch.missing.length > 0 && keywordMatch.percent < 70) {
      ctx.push({
        priority: keywordMatch.percent < 40 ? 'P1' : 'P2',
        dimension: 'match',
        title: `Missing ${keywordMatch.missing.length} keywords from the job description`,
        why: 'Recruiters search ATS databases by keywords from the posting. Missing terms can mean you’re never surfaced.',
        fix: `Work in the ones that are true for you, inside real bullets (not a keyword dump): ${keywordMatch.missing.slice(0, 8).join(', ')}.`,
        evidence: [],
        gain: round(Math.min(8, (70 - keywordMatch.percent) / 8)),
      })
    } else if (keywordMatch.percent >= 70) strengths.push(`${keywordMatch.percent}% of the job description’s key terms appear in your resume.`)
  }
  const match = keywordMatch ? clamp(keywordMatch.percent * 1.15) : 0

  // ---- Summary / extras ---------------------------------------------------------
  if (targetIdx === 0 && data.projects.length === 0 && years < 2) {
    ctx.push({
      priority: 'P1',
      dimension: 'craft',
      title: 'No product projects to show',
      why: 'With little formal PM experience, shipped side projects, case studies, or internal initiatives are your proof of product sense.',
      fix: 'Add 1–2 projects: problem, who it was for, what you shipped, and a result (users, signups, feedback).',
      evidence: [],
      gain: 6,
    })
  }
  if (!data.summary && (targetIdx === 0 || years < 2)) {
    ctx.push({
      priority: 'P2',
      dimension: 'ats',
      title: 'No short summary',
      why: 'Early-career and career-switching candidates need a 2-line pitch to frame transferable experience.',
      fix: 'Add: who you are, the product area you want, and your single best proof point.',
      evidence: [],
      gain: 1,
    })
  }
  const numericPct = ((nb > 0 ? withMetrics : 0) / Math.max(nb, 1)) * 100

  // ---- Assemble --------------------------------------------------------------------
  const raw: { id: DimensionId; label: string; score: number; w: number }[] = [
    { id: 'impact', label: 'Impact & metrics', score: impact, w: 0.3 },
    { id: 'ownership', label: 'Ownership & scope', score: ownership, w: 0.18 },
    { id: 'craft', label: 'Product craft', score: craft, w: 0.2 },
    { id: 'writing', label: 'Writing clarity', score: writing, w: 0.14 },
    { id: 'ats', label: 'ATS & structure', score: ats, w: 0.18 },
  ]
  if (keywordMatch) {
    raw.forEach((r) => (r.w *= 0.9))
    raw.push({ id: 'match', label: 'Job match', score: match, w: 0.1 })
  }
  const total = raw.reduce((s, r) => s + r.w, 0)
  const verdict = (s: number) => (s >= 80 ? 'Strong' : s >= 62 ? 'Solid, a few fixes' : s >= 42 ? 'Needs work' : 'Critical gap')
  // Soft ceiling: a resume shouldn't read 100/100 just because every heuristic is satisfied.
  const compress = (s: number) => (s > 82 ? 82 + (s - 82) * 0.72 : s)
  const dimensions: Dimension[] = raw.map((r) => ({ id: r.id, label: r.label, score: round(compress(r.score)), weight: r.w / total, verdict: verdict(r.score) }))
  const overall = round(dimensions.reduce((s, d) => s + d.score * d.weight, 0))

  const grade = overall >= 85 ? 'ship' : overall >= 68 ? 'beta' : overall >= 48 ? 'alpha' : 'prototype'
  const gradeLabel = { ship: 'Ready to ship', beta: 'Beta · nearly there', alpha: 'Alpha · needs iteration', prototype: 'Prototype · rebuild the core' }[grade]
  const p0 = findings.filter((f) => f.priority === 'P0').length
  const headline =
    nb === 0
      ? 'We couldn’t find experience bullets to score. Check the file is a text PDF.'
      : p0 > 0
        ? `${p0} blocker${p0 > 1 ? 's' : ''} stand between this resume and an interview.`
        : grade === 'ship'
          ? 'This reads like a PM who ships outcomes. Polish and apply.'
          : `${findings.filter((f) => f.priority !== 'P2').length} meaningful fixes could lift this by up to ${Math.min(30, round(findings.reduce((s, f) => s + f.gain, 0)))} points.`

  const order = { P0: 0, P1: 1, P2: 2 }
  findings.sort((a, b) => order[a.priority] - order[b.priority] || b.gain - a.gain)
  findings.forEach((f, i) => (f.id = `${f.priority}-${i + 1}`))
  void numericPct
  void DATE_RANGE

  return {
    version: 1,
    overall,
    grade,
    gradeLabel,
    headline,
    dimensions,
    findings,
    strengths: strengths.slice(0, 5),
    bullets,
    competencies,
    level: {
      detected,
      target,
      years,
      note: input.targetLevel && input.targetLevel !== 'auto' && target !== detected ? `Scored for ${LEVEL_LABEL[target]} (resume reads as ${LEVEL_LABEL[detected]}).` : `Reads as ${LEVEL_LABEL[detected]}${years ? ` · ~${years} yrs` : ''}.`,
    },
    stats: { words: wc, bullets: nb, bulletsWithMetrics: withMetrics, roles: data.experience.length, pages },
    keywordMatch,
    parsed: data,
  }
}
