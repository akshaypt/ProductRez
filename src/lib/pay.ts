/** Helpers for the pay chart and the pay inputs. INR is in lakhs per year (CTC), USD in thousands per year. */
export type Cur = 'INR' | 'USD'
export interface Band { min: number; p25: number; median: number; p75: number; max: number }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** "38" or "52.5", never "52.50" or "38.0". */
export const num = (n: number): string => String(Math.round(n * 10) / 10)

export const money = (c: Cur, n: number): string => (c === 'INR' ? `₹${num(n)}L` : `$${num(n)}k`)
export const unitName = (c: Cur): string => (c === 'INR' ? 'LPA' : 'k / year')

/**
 * The visible range of the chart: the market band with a little room either side. A value outside it stretches the chart so the pin stays
 * visible, but never by more than one and a half band-widths: past that, the median and the quartiles would be squeezed into a sliver, so
 * the value is pinned to the edge instead.
 */
export const scaleFor = (b: Band, values: number[] = []): { lo: number; hi: number } => {
  const span = Math.max(1, b.max - b.min)
  let lo = Math.max(0, b.min - span * 0.2)
  let hi = b.max + span * 0.2
  const room = span * 1.5
  for (const v of values) {
    if (v < lo) lo = Math.max(0, b.min - room, v - span * 0.08)
    if (v > hi) hi = Math.min(b.max + room, v + span * 0.08)
  }
  return { lo, hi }
}

/** Position along the chart as a percentage from the left, kept inside 0 to 100. */
export const posOf = (v: number, s: { lo: number; hi: number }): number => clamp(((v - s.lo) / (s.hi - s.lo)) * 100, 0, 100)

/** Says whether a value falls off either end of the visible range, so the pin can be shown at the edge with an arrow. */
export const edgeOf = (v: number, s: { lo: number; hi: number }): 'below' | 'above' | null => (v < s.lo ? 'below' : v > s.hi ? 'above' : null)

/** Where a label sits relative to its pin, so it never runs off the chart. */
export const alignAt = (pct: number): 'start' | 'mid' | 'end' => (pct < 18 ? 'start' : pct > 82 ? 'end' : 'mid')

/**
 * Two pins closer than `gap` percent of the chart would collide if each had its own label, so they share one label ("₹35L → ₹40L").
 * Stacking two labels with two stems on top of each other is what made this part of the chart look cluttered.
 */
export const clusters = (a: number | null, b: number | null, gap = 26): boolean => a !== null && b !== null && Math.abs(a - b) < gap

/** Reads a typed amount. Null for empty, not a number, zero, negative or an unreasonable size. */
export const parseAmount = (s: string): number | null => {
  const n = Number(s.replace(/,/g, '').trim())
  return s.trim() !== '' && Number.isFinite(n) && n > 0 && n <= 10000 ? Math.round(n * 100) / 100 : null
}

/** "Achievable — Well Calibrated" becomes ["Achievable", "Well Calibrated"]; the engine labels use a dash. */
export const splitLabel = (label: string): [string, string] => {
  const [a, ...rest] = label.split(/\s+[—–-]\s+/)
  return [a.trim(), rest.join(' ').trim()]
}

/** A short, readable ordinal such as "62nd". */
export const ordinal = (n: number): string => {
  const v = n % 100
  const s = ['th', 'st', 'nd', 'rd']
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}
