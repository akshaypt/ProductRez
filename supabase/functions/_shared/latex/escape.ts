const MAP: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '<': '\\textless{}',
  '>': '\\textgreater{}',
  '|': '\\textbar{}',
  '“': '``',
  '”': "''",
  '‘': '`',
  '’': "'",
  '–': '--',
  '—': '---',
  '‑': '-',
  '−': '-',
  '…': '\\ldots{}',
  '•': '\\textbullet{}',
  '·': '\\textperiodcentered{}',
  '₹': 'INR\\,',
  '€': '\\texteuro{}',
  '£': '\\pounds{}',
  '°': '\\textdegree{}',
  '×': '\\ensuremath{\\times}',
  '→': '\\ensuremath{\\rightarrow}',
  '←': '\\ensuremath{\\leftarrow}',
  '≥': '\\ensuremath{\\geq}',
  '≤': '\\ensuremath{\\leq}',
  '≈': '\\ensuremath{\\approx}',
  '±': '\\ensuremath{\\pm}',
  '\u00a0': '~',
  '\u200b': '',
  '\ufeff': '',
  '\t': ' ',
}

/** Escape plain text for pdflatex (T1 + utf8). Unsupported glyphs are dropped, never emitted raw. */
export function escapeLatex(input: string): string {
  let out = ''
  for (const ch of input.normalize('NFC')) {
    if (MAP[ch] !== undefined) out += MAP[ch]
    else {
      const cp = ch.codePointAt(0)!
      if (cp < 0x20) continue
      if (cp <= 0x24f) out += ch // Latin-1 + Latin Extended A/B are covered by T1 + utf8
      else out += ''
    }
  }
  return out.replace(/\s{2,}/g, ' ')
}

/** URL inside \href{…}: only %, #, & and \ are special. */
export function escapeUrl(url: string): string {
  return url.replace(/\\/g, '').replace(/([%#&])/g, '\\$1').replace(/\s/g, '')
}

const METRIC = /([$₹€£]\s?\d[\d,.]*\s?(?:[kKmMbB]\b|mn\b|bn\b|cr\b|crore\b|lakhs?\b)?|\d[\d,.]*\s?(?:%|x\b|×))/g

/** Supports **bold** markers and optional auto-bolding of metrics. */
export function inline(input: string, autoBoldMetrics: boolean): string {
  const parts = input.split('**')
  return parts
    .map((seg, i) => {
      if (!seg) return ''
      if (i % 2 === 1) return `\\textbf{${escapeLatex(seg)}}`
      if (!autoBoldMetrics) return escapeLatex(seg)
      return seg
        .split(METRIC)
        .map((p, j) => (j % 2 === 1 ? `\\textbf{${escapeLatex(p)}}` : escapeLatex(p)))
        .join('')
    })
    .join('')
}

export const stripMarkers = (s: string) => s.replace(/\*\*/g, '')
