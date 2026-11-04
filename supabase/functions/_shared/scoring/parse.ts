import { SECTION_ALIASES, TITLE_WORDS } from './lexicon.ts'
import type { ExperienceItem, ParseResult, ResumeData } from './types.ts'

const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const DATE = `(?:${MONTHS}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`
const PRESENT = '(?:present|current|now|today|ongoing)'
export const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|${PRESENT})`, 'i')
const SINGLE_YEAR = /\b(19|20)\d{2}\b/

const BULLET_START = /^\s*(?:[•●▪■◦‣∙·○◆▸►➢➤✓✔*]|[-–—](?=\s)|\d{1,2}[.)](?=\s)|[a-z][.)](?=\s))\s*/
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}|\+?\d{2}[\s-]?\d{5}[\s-]?\d{5}/
const LINKEDIN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i
const URL = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|io|dev|me|co|net|org|in|app|design|xyz)(?:\/[\w\-./?=%&#]*)?/i

let uid = 0
const id = (p: string) => `${p}${++uid}`

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/­/g, '')
    .replace(/ {3,}|\t+/g, '\t') // column gaps (dates, locations) become a tab so we can split on them
    .replace(/ {2}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sectionOf(line: string): keyof typeof SECTION_ALIASES | null {
  const t = line.replace(/[:：]\s*$/, '').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 40) return null
  if (BULLET_START.test(t) && !/^[A-Za-z]/.test(t)) return null
  for (const [key, re] of Object.entries(SECTION_ALIASES)) if (re.test(t)) return key as keyof typeof SECTION_ALIASES
  return null
}

function looksLikeHeader(line: string): boolean {
  if (DATE_RANGE.test(line)) return true
  const words = line.split(/\s+/)
  if (words.length > 9 || line.length > 70) return false
  if (/[.!?]$/.test(line)) return false
  const caps = words.filter((w) => /^[A-Z0-9(&]/.test(w)).length
  return caps / words.length >= 0.6
}

/** Join PDF-wrapped lines into logical bullets / lines. */
export function logicalLines(text: string): { text: string; bullet: boolean }[] {
  const raw = normalizeText(text).split('\n').map((l) => l.trim())
  const out: { text: string; bullet: boolean }[] = []
  for (const line of raw) {
    if (!line) {
      out.push({ text: '', bullet: false })
      continue
    }
    const isBullet = BULLET_START.test(line) && line.replace(BULLET_START, '').length > 0
    if (isBullet) {
      out.push({ text: line.replace(BULLET_START, '').replace(/\t+/g, ' ').trim(), bullet: true })
      continue
    }
    const prev = out[out.length - 1]
    const startsLower = /^[a-z(]/.test(line)
    const isHeading = !!sectionOf(line)
    if (
      prev &&
      prev.text &&
      !isHeading &&
      !DATE_RANGE.test(line) &&
      (prev.bullet || prev.text.length > 70) &&
      (startsLower || (prev.bullet && prev.text.length >= 85 && !looksLikeHeader(line)) || /[,;:&(]$|\b(and|or|to|for|with|of|in|on|by|the|a)$/i.test(prev.text))
    ) {
      prev.text = `${prev.text} ${line}`.replace(/\s+/g, ' ')
      continue
    }
    out.push({ text: line, bullet: false })
  }
  return out
}

function splitHeader(lines: string[]): Pick<ExperienceItem, 'company' | 'title' | 'location' | 'start' | 'end'> {
  let start = ''
  let end = ''
  const rest: string[] = []
  for (const l of lines) {
    const m = l.match(DATE_RANGE)
    if (m) {
      start = m[1]
      end = /present|current|now|today|ongoing/i.test(m[2]) ? 'Present' : m[2]
      const remainder = l.replace(DATE_RANGE, '').replace(/[|•·,–—-]\s*$/g, '').trim()
      if (remainder) rest.push(remainder)
    } else rest.push(l)
  }
  const segs = rest
    .flatMap((r) => r.split(/\t+|\s+[|•·]\s+|\s+[–—]\s+|\s+-\s+/))
    .map((s) => s.trim())
    .filter(Boolean)
  let title = ''
  let company = ''
  let location = ''
  for (const s of segs) {
    const at = s.match(/^(.*?)\s+(?:at|@)\s+(.*)$/i)
    if (at && TITLE_WORDS.test(at[1])) {
      title ||= at[1]
      company ||= at[2]
      continue
    }
    const tc = s.match(/^([^,]+),\s+(.+)$/)
    if (!title && tc && TITLE_WORDS.test(tc[1]) && !/^[A-Z]{2}$/.test(tc[2].trim()) && tc[1].split(/\s+/).length <= 6) {
      title = tc[1].trim()
      company ||= tc[2].trim()
      continue
    }
    if (!title && TITLE_WORDS.test(s) && s.split(/\s+/).length <= 8) title = s
    else if (!location && /,\s*[A-Z]{2}\b|\b(remote|india|usa|united states|uk|canada)\b/i.test(s) && s.length < 40) location = s
    else if (!company) company = s
    else if (!title) title = s
  }
  if (!location && company) {
    const m = company.match(/^(.*?),\s*([A-Z][A-Za-z .]+(?:,\s*[A-Z]{2,})?)$/)
    if (m && m[1].length > 1) {
      company = m[1]
      location = m[2]
    }
  }
  return { company, title, location, start, end }
}

export function parseResume(rawText: string): ParseResult {
  uid = 0
  const lines = logicalLines(rawText)
  const flat = (t: string) => t.replace(/\t+/g, ' ').trim()
  const plain = lines.map((l) => flat(l.text))
  const wordCount = plain.join(' ').split(/\s+/).filter(Boolean).length

  const data: ResumeData = {
    basics: { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '',
    experience: [],
    projects: [],
    education: [],
    skills: [],
    extras: [],
  }

  // Header block = everything before the first section heading.
  let firstSection = lines.findIndex((l) => !l.bullet && sectionOf(l.text))
  if (firstSection === -1) firstSection = Math.min(lines.length, 6)
  const head = lines.slice(0, firstSection).filter((l) => l.text)
  const headText = head.map((l) => l.text).join('\n')
  data.basics.email = headText.match(EMAIL)?.[0] ?? plain.join('\n').match(EMAIL)?.[0] ?? ''
  data.basics.phone = headText.match(PHONE)?.[0]?.trim() ?? ''
  data.basics.linkedin = (headText.match(LINKEDIN) ?? plain.join('\n').match(LINKEDIN))?.[0] ?? ''
  const urls = headText.match(new RegExp(URL, 'gi')) ?? []
  data.basics.website = urls.find((u) => !/linkedin|@/.test(u) && !EMAIL.test(u)) ?? ''
  const firstLine = head[0]?.text ?? ''
  if (firstLine && !EMAIL.test(firstLine) && firstLine.split(/\s+/).length <= 5) data.basics.name = firstLine
  const second = head[1]?.text ?? ''
  if (second && !EMAIL.test(second) && !PHONE.test(second) && !URL.test(second) && second.length < 90) data.basics.headline = second
  const locM = headText.match(/\b([A-Z][a-zA-Z .]+,\s*(?:[A-Z]{2}|India|USA|United States|Remote))\b/)
  data.basics.location = locM?.[1] ?? ''

  // Sections
  const sectionsFound: string[] = []
  let current: keyof typeof SECTION_ALIASES | 'head' = 'head'
  const buckets: Record<string, { text: string; bullet: boolean }[]> = {}
  for (let i = firstSection; i < lines.length; i++) {
    const l = lines[i]
    const s = !l.bullet ? sectionOf(l.text) : null
    if (s) {
      current = s
      if (!sectionsFound.includes(s)) sectionsFound.push(s)
      buckets[s] ??= []
      continue
    }
    if (current !== 'head') (buckets[current] ??= []).push(l)
  }

  data.summary = (buckets.summary ?? []).map((l) => flat(l.text)).filter(Boolean).join(' ')

  const parseEntries = (items: { text: string; bullet: boolean }[]) => {
    const entries: { header: string[]; bullets: string[] }[] = []
    let cur: { header: string[]; bullets: string[] } | null = null
    for (const it of items) {
      if (!it.text) continue
      if (it.bullet) {
        if (!cur) entries.push((cur = { header: [], bullets: [] }))
        cur.bullets.push(it.text)
      } else {
        if (!cur || cur.bullets.length > 0 || (DATE_RANGE.test(it.text) && cur.header.some((h) => DATE_RANGE.test(h)))) {
          entries.push((cur = { header: [], bullets: [] }))
        }
        if (cur.header.length < 4) cur.header.push(it.text)
        else cur.bullets.push(it.text)
      }
    }
    return entries
  }

  for (const e of parseEntries(buckets.experience ?? [])) {
    if (e.header.length === 0 && e.bullets.length === 0) continue
    data.experience.push({ id: id('x'), bullets: e.bullets, ...splitHeader(e.header) })
  }
  for (const e of parseEntries(buckets.projects ?? [])) {
    const h = e.header[0] ?? ''
    const [name, ...tag] = flat(h).split(/\s+[|–—-]\s+/)
    data.projects.push({ id: id('p'), name: name ?? '', tag: tag.join(' | '), link: '', bullets: e.bullets })
  }
  for (const e of parseEntries(buckets.education ?? [])) {
    const dm = e.header.join(' ').match(DATE_RANGE)
    const yr = e.header.join(' ').match(SINGLE_YEAR)
    const hdr = e.header.filter((h) => !DATE_RANGE.test(h) || h.replace(DATE_RANGE, '').trim())
    data.education.push({
      id: id('e'),
      school: flat(hdr[0] ?? '').replace(DATE_RANGE, '').replace(/[,|–—-]\s*$/, '').trim(),
      degree: flat(hdr[1] ?? '').replace(DATE_RANGE, '').trim(),
      location: '',
      start: dm?.[1] ?? '',
      end: dm?.[2] ?? yr?.[0] ?? '',
      details: e.bullets.join('; '),
    })
  }
  for (const l0 of buckets.skills ?? []) {
    const l = { ...l0, text: flat(l0.text) }
    if (!l.text) continue
    const m = l.text.match(/^([A-Za-z &/+]{2,32}):\s*(.+)$/)
    data.skills.push({ id: id('s'), label: m ? m[1].trim() : 'Skills', items: m ? m[2].trim() : l.text })
  }
  if (data.skills.length > 1 && data.skills.every((s) => s.label === 'Skills')) {
    data.skills = [{ id: id('s'), label: 'Skills', items: data.skills.map((s) => s.items).join(', ') }]
  }
  if (buckets.extras?.length) {
    data.extras.push({ id: id('o'), title: 'Additional', items: buckets.extras.map((l) => flat(l.text)).filter(Boolean) })
  }

  return { data, lines: plain, sectionsFound, wordCount }
}
