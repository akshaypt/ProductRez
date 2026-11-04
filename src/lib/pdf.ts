import type { TextItem } from 'pdfjs-dist/types/src/display/api'

export interface ExtractedPdf {
  text: string
  pageCount: number
}

/** Extracts text client-side (the file never leaves the browser). Wide x-gaps become tabs so columns survive. */
export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items = content.items.filter((i): i is TextItem => 'str' in i && i.str.length > 0)
    const rows: { y: number; parts: { x: number; w: number; s: string }[] }[] = []
    for (const it of items) {
      const x = it.transform[4]
      const y = it.transform[5]
      const row = rows.find((r) => Math.abs(r.y - y) < 2.5)
      const part = { x, w: it.width, s: it.str }
      if (row) row.parts.push(part)
      else rows.push({ y, parts: [part] })
    }
    rows.sort((a, b) => b.y - a.y)
    const lines = rows.map((r) => {
      r.parts.sort((a, b) => a.x - b.x)
      let out = ''
      let prevEnd = 0
      r.parts.forEach((pt, i) => {
        const gap = pt.x - prevEnd
        if (i > 0) out += gap > 18 ? '\t' : gap > 0.8 && !out.endsWith(' ') && !pt.s.startsWith(' ') ? ' ' : ''
        out += pt.s
        prevEnd = pt.x + pt.w
      })
      return out.replace(/[ ]+$/g, '')
    })
    pages.push(lines.join('\n'))
  }
  return { text: pages.join('\n\n'), pageCount: doc.numPages }
}
