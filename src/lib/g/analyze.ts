import type { ScoreReport } from '@ats'
import { extractPdfText } from '../pdf'
import { guessRegion } from '../util'
import { COMPANIES, LEVELS, TRACKS } from './data'

export interface LoadedResume { name: string; text: string; pageCount: number | null; size: number; source: 'pdf' | 'docx' | 'paste' }
export interface Picks { level: string | null; track: string | null; company: string | null }
export interface Analysis { resume: LoadedResume; picks: Picks; jd: string; report: ScoreReport }

export const MAX_BYTES = 5 * 1024 * 1024

/** Minimal .docx reader: finds word/document.xml in the zip and inflates it in the browser. */
async function docxText(buf: ArrayBuffer): Promise<string> {
  const v = new DataView(buf)
  const u8 = new Uint8Array(buf)
  let eocd = -1
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('not a docx')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const method = v.getUint16(p + 10, true)
    const csize = v.getUint32(p + 20, true)
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true)
    const lho = v.getUint32(p + 42, true)
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl))
    if (name === 'word/document.xml') {
      const lnl = v.getUint16(lho + 26, true), lel = v.getUint16(lho + 28, true)
      const data = u8.subarray(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize)
      let xml: string
      if (method === 0) xml = new TextDecoder().decode(data)
      else {
        const ds = new DecompressionStream('deflate-raw')
        const w = ds.writable.getWriter()
        w.write(data).catch(() => {})
        w.close().catch(() => {})
        xml = await new Response(ds.readable).text()
      }
      return xml
        .replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => (/<w:numPr>/.test(para) ? '• ' : '') + para + '\n')
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
    }
    p += 46 + nl + el + cl
  }
  throw new Error('not a docx')
}

export class ResumeReadError extends Error {}

export async function readResume(file: File): Promise<LoadedResume> {
  if (file.size > MAX_BYTES) throw new ResumeReadError('That file is over 5 MB. Export a smaller PDF and try again.')
  const n = file.name.toLowerCase()
  const isPdf = n.endsWith('.pdf') || file.type === 'application/pdf'
  const isDocx = n.endsWith('.docx')
  const isTxt = n.endsWith('.txt') || n.endsWith('.md') || file.type.startsWith('text/')
  if (!isPdf && !isDocx && !isTxt) throw new ResumeReadError('Upload a PDF or DOCX file.')
  try {
    if (isPdf) {
      const r = await extractPdfText(file)
      return { name: file.name, text: r.text, pageCount: r.pageCount, size: file.size, source: 'pdf' }
    }
    if (isDocx) return { name: file.name, text: await docxText(await file.arrayBuffer()), pageCount: null, size: file.size, source: 'docx' }
    return { name: file.name, text: await file.text(), pageCount: null, size: file.size, source: 'paste' }
  } catch {
    throw new ResumeReadError('We could not read that file. Export your resume as a text-based PDF or DOCX and try again.')
  }
}

const lbl = <T extends { label: string; v: string }>(list: T[], v: string | undefined) => list.find((x) => x.v === v)?.label ?? null

export function marketOf(): 'india' | 'us' { return guessRegion() === 'IN' ? 'india' : 'us' }

/** A first pass with everything on auto, used only to pre-fill the three pills from what the resume says. */
export async function suggest(r: LoadedResume): Promise<{ picks: Picks; message?: string }> {
  const eng = await import('@ats')
  const chk = eng.checkResume(r.text)
  if (!chk.ok) {
    return {
      picks: { level: null, track: null, company: null },
      message: chk.reason === 'too_short'
        ? 'We could only read a few words from that file. It may be a scanned image. Export a text-based PDF or DOCX and try again.'
        : 'That does not look like a resume. We found no experience, education or skills sections.',
    }
  }
  const rep = eng.scoreResume({ text: r.text, source: r.source, pageCount: r.pageCount ?? undefined, fileSizeBytes: r.size, market: marketOf() })
  const top = [...rep.marketStanding.trackReadiness].sort((a, b) => b.readinessScore - a.readinessScore)[0]
  return { picks: { level: lbl(LEVELS, rep.contextUsed.detectedLevel), track: lbl(TRACKS, top?.track), company: null } }
}

export async function runAnalysis(r: LoadedResume, picks: Picks, jd: string): Promise<Analysis> {
  const eng = await import('@ats')
  const report = eng.scoreResume({
    text: r.text,
    source: r.source,
    pageCount: r.pageCount ?? undefined,
    fileSizeBytes: r.size,
    targetLevel: LEVELS.find((x) => x.label === picks.level)?.v ?? 'auto',
    track: TRACKS.find((x) => x.label === picks.track)?.v ?? 'generalist',
    companyArchetype: COMPANIES.find((x) => x.label === picks.company)?.v ?? 'scaleup',
    market: marketOf(),
    jobDescription: jd.trim() ? jd : undefined,
  })
  return { resume: r, picks, jd, report }
}
