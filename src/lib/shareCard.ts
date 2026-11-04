import type { ScoreReport } from '@scoring'

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** Renders a monochrome 1200×630 card with scores only. No name, no resume text. */
export async function renderScoreCard(r: ScoreReport): Promise<Blob> {
  const W = 1200
  const H = 630
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  try {
    await document.fonts.load('500 200px "Geist Variable"')
    await document.fonts.load('600 24px "Geist Variable"')
  } catch {
    /* fall back to system fonts */
  }
  const F = '"Geist Variable", system-ui, -apple-system, "Segoe UI", sans-serif'

  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W * 0.25, -60, 10, W * 0.25, -60, 760)
  glow.addColorStop(0, 'rgba(255,255,255,0.18)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)
  g.strokeStyle = '#262626'
  g.lineWidth = 2
  rr(g, 24, 24, W - 48, H - 48, 28)
  g.stroke()

  // brand mark
  g.fillStyle = '#fff'
  rr(g, 68, 66, 46, 46, 12)
  g.fill()
  g.strokeStyle = '#000'
  g.lineWidth = 4.2
  g.lineCap = 'square'
  g.beginPath()
  g.moveTo(80, 79)
  g.lineTo(94, 79)
  g.arc(94, 87.5, 8.5, -Math.PI / 2, Math.PI / 2)
  g.lineTo(87.5, 96)
  g.lineTo(87.5, 104)
  g.stroke()
  g.fillStyle = '#fff'
  g.font = `600 30px ${F}`
  g.textBaseline = 'middle'
  g.fillText('ProductRez', 128, 90)

  // label + score
  g.fillStyle = '#9a9a9a'
  g.font = `600 22px ${F}`
  ;(g as unknown as { letterSpacing: string }).letterSpacing = '4px'
  g.fillText('PM RESUME SCORE', 68, 200)
  ;(g as unknown as { letterSpacing: string }).letterSpacing = '0px'
  g.fillStyle = '#fff'
  g.textBaseline = 'alphabetic'
  g.font = `500 250px ${F}`
  g.fillText(String(r.overall), 60, 440)
  const nw = g.measureText(String(r.overall)).width
  g.fillStyle = '#6e6e6e'
  g.font = `400 44px ${F}`
  g.fillText('/100', 68 + nw, 440)
  const band = r.overall >= 85 ? '#34d399' : r.overall >= 68 ? '#8fa8ff' : r.overall >= 48 ? '#ffb020' : '#ff6b6b'
  g.fillStyle = band
  g.beginPath()
  g.arc(78, 497, 8, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fff'
  g.font = `500 40px ${F}`
  g.fillText(r.gradeLabel.split('·')[0].trim(), 100, 508)

  // dimension bars
  const x0 = 700
  const x1 = 1136
  const dims = r.dimensions.filter((d) => d.id !== 'match')
  dims.forEach((d, i) => {
    const y = 190 + i * 66
    g.fillStyle = '#b0b0b0'
    g.font = `500 24px ${F}`
    g.textBaseline = 'alphabetic'
    g.fillText(d.label, x0, y)
    g.textAlign = 'right'
    g.fillStyle = '#fff'
    g.fillText(String(d.score), x1, y)
    g.textAlign = 'left'
    g.fillStyle = '#222'
    rr(g, x0, y + 14, x1 - x0, 8, 4)
    g.fill()
    const v = Math.max(8, ((x1 - x0) * d.score) / 100)
    g.fillStyle = d.score >= 80 ? '#34d399' : d.score >= 62 ? '#8fa8ff' : d.score >= 42 ? '#ffb020' : '#ff6b6b'
    rr(g, x0, y + 14, v, 8, 4)
    g.fill()
  })

  g.fillStyle = '#6e6e6e'
  g.font = `400 22px ${F}`
  g.fillText('Scored with ProductRez · impact, ownership, craft, clarity, ATS', 68, 574)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not render card'))), 'image/png'))
}
