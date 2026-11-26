import { JD_PHRASES, JD_SYNONYMS, PM_TITLE_PATTERN, STOPWORDS } from '../kb/index.ts'
import type { KeywordMatch, ResumeData } from '../types.ts'

const stem = (w: string) =>
  w
    .toLowerCase()
    .replace(/[^a-z0-9+#/&.-]/g, '')
    .replace(/(ing|ed|es|s)$/, (m, _a, _off, str) => (str.length - m.length >= 4 ? '' : m))

function extractJdYears(jd: string): number | null {
  const m =
    jd.match(/(\d{1,2})\s*(?:\+|plus)?\s*(?:-\s*\d{1,2}\s*)?years?\s+(?:of\s+)?(?:product\s+management|pm|experience)/i) ??
    jd.match(/(?:minimum|at\s+least)\s+(\d{1,2})\s+years?/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

function termAppears(term: string, textLower: string, stems: Set<string>): boolean {
  if (term.includes(' ') || term.includes('/') || term.includes('-')) {
    if (textLower.includes(term)) return true
  } else if (stems.has(stem(term))) {
    return true
  }
  const syns = JD_SYNONYMS[term]
  if (syns) {
    return syns.some((syn) =>
      syn.includes(' ') || syn.includes('/') || syn.includes('-') ? textLower.includes(syn) : stems.has(stem(syn)),
    )
  }
  return false
}

export function matchJobDescription(
  data: ResumeData,
  bulletTexts: string[],
  jdText?: string,
  targetRoleTitle?: string,
  candidatePmYears?: number,
): KeywordMatch | null {
  const hasJd = !!jdText && jdText.trim().length > 60
  const hasTitle = !!targetRoleTitle && targetRoleTitle.trim().length >= 2
  if (!hasJd && !hasTitle) return null

  const bulletsLower = bulletTexts.join('\n').toLowerCase()
  const bulletStems = new Set(bulletsLower.split(/[^a-z0-9+#/&.-]+/).map(stem))

  const nonBulletLower = [
    data.summary,
    ...data.skills.map((s) => s.items),
    data.basics.headline,
  ]
    .join('\n')
    .toLowerCase()
  const nonBulletStems = new Set(nonBulletLower.split(/[^a-z0-9+#/&.-]+/).map(stem))

  const titleSource = targetRoleTitle || (jdText?.split('\n').find((l) => l.trim().length > 3) ?? '')
  const resumeTitles = [data.basics.headline, ...data.experience.map((x) => x.title)].join(' ').toLowerCase()
  let titleAlignment: KeywordMatch['titleAlignment'] = 'unknown'
  if (titleSource.trim()) {
    const reqTokens = titleSource
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    const hits = reqTokens.filter((t) => resumeTitles.includes(t) || (t === 'pm' && PM_TITLE_PATTERN.test(resumeTitles)))
    const ratio = reqTokens.length ? hits.length / reqTokens.length : 0
    titleAlignment = ratio >= 0.6 ? 'strong' : ratio >= 0.3 || PM_TITLE_PATTERN.test(resumeTitles) ? 'partial' : 'weak'
  }

  if (!hasJd) {
    return {
      matchedInBullets: [],
      matchedSkillsOnly: [],
      missing: [],
      requiredYearsInJd: null,
      seniorityMismatch: null,
      titleAlignment,
      percent: titleAlignment === 'strong' ? 90 : titleAlignment === 'partial' ? 68 : 40,
    }
  }

  const jd = jdText!
  const jdLower = jd.toLowerCase()
  const tokens = jdLower.split(/[^a-z0-9+#/&.-]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t))
  const freq = new Map<string, number>()
  const cleanWord = new Map<string, string>()
  for (const t of tokens) {
    const s = stem(t)
    if (s.length > 2) {
      freq.set(s, (freq.get(s) ?? 0) + 1)
      if (!cleanWord.has(s)) cleanWord.set(s, t)
    }
  }

  const phraseHits = JD_PHRASES.filter((p) =>
    new RegExp(`(^|[^a-z])${p.replace(/[/+.]/g, '\\$&')}([^a-z]|$)`, 'i').test(jdLower),
  )
  const mustLines = jd
    .split('\n')
    .filter((l) => /\b(must[- ]have|required|requirements?|qualifications?|core\s+skills?|tech\s+stack)\b/i.test(l))
    .join(' ')
    .toLowerCase()
  const mustStems = new Set(
    mustLines
      .split(/[^a-z0-9+#/&.-]+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^(must|have|required|requirements?|qualifications?|skills?|experience|years?|preferred)$/.test(t))
      .map(stem),
  )
  const candidates = [...freq.entries()]
    .filter(([s, c]) => c >= 2 || mustStems.has(s) || phraseHits.some((p) => stem(p) === s))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 28)
    .map(([s]) => cleanWord.get(s) ?? s)

  const seenKeywordStems = new Set<string>()
  const keywords: string[] = []
  for (const k of [...phraseHits, ...candidates]) {
    const ks = k.includes(' ') || k.includes('/') || k.includes('-') ? k : stem(k)
    if (!seenKeywordStems.has(ks)) {
      seenKeywordStems.add(ks)
      keywords.push(k)
    }
    if (keywords.length >= 28) break
  }
  const matchedInBullets: string[] = []
  const matchedSkillsOnly: string[] = []
  const missing: string[] = []

  for (const k of keywords) {
    if (termAppears(k, bulletsLower, bulletStems)) {
      matchedInBullets.push(k)
    } else if (termAppears(k, nonBulletLower, nonBulletStems)) {
      matchedSkillsOnly.push(k)
    } else {
      missing.push(k)
    }
  }

  // Proven keywords in bullets carry full credit (1.0); skills-only keywords carry partial credit (0.65)
  const weightedHits = matchedInBullets.length + matchedSkillsOnly.length * 0.65
  const percent = keywords.length ? Math.min(100, Math.round((weightedHits / keywords.length) * 100)) : 0

  const requiredYearsInJd = extractJdYears(jd)
  let seniorityMismatch: string | null = null
  if (requiredYearsInJd !== null && candidatePmYears !== undefined && candidatePmYears + 1.5 < requiredYearsInJd) {
    seniorityMismatch = `JD asks for ${requiredYearsInJd}+ yrs while your profile reflects ~${candidatePmYears} yrs.`
  }

  return {
    matchedInBullets,
    matchedSkillsOnly,
    missing,
    requiredYearsInJd,
    seniorityMismatch,
    titleAlignment,
    percent,
  }
}
