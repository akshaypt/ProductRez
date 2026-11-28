import { describe, expect, it } from 'vitest'
import { alignAt, edgeOf, levels, money, ordinal, parseAmount, posOf, scaleFor, splitLabel } from '../src/lib/pay'

const band = { min: 30, p25: 38, median: 45, p75: 55, max: 70 }

describe('pay chart geometry', () => {
  const s = scaleFor(band)
  it('leaves room either side of the band', () => {
    expect(s.lo).toBe(22)
    expect(s.hi).toBe(78)
  })
  it('stretches to keep a nearby pin on the chart, but not so far that the band is squeezed flat', () => {
    const near = scaleFor(band, [90])
    expect(near.hi).toBeGreaterThan(90)
    expect(edgeOf(90, near)).toBeNull()
    const far = scaleFor(band, [500])
    expect(far.hi).toBe(band.max + (band.max - band.min) * 1.5)
    expect(edgeOf(500, far)).toBe('above')
    const low = scaleFor(band, [1])
    expect(low.lo).toBe(0)
    expect(scaleFor(band, [45, 50])).toEqual(scaleFor(band))
  })
  it('places the median between the quartiles and keeps values inside 0 to 100', () => {
    expect(posOf(band.median, s)).toBeGreaterThan(posOf(band.p25, s))
    expect(posOf(band.median, s)).toBeLessThan(posOf(band.p75, s))
    expect(posOf(1, s)).toBe(0)
    expect(posOf(500, s)).toBe(100)
  })
  it('reports a value that falls off either end', () => {
    expect(edgeOf(10, s)).toBe('below')
    expect(edgeOf(90, s)).toBe('above')
    expect(edgeOf(45, s)).toBeNull()
  })
  it('keeps labels inside the chart', () => {
    expect(alignAt(5)).toBe('start')
    expect(alignAt(50)).toBe('mid')
    expect(alignAt(95)).toBe('end')
  })
  it('raises the second label when two pins would overlap', () => {
    expect(levels(40, 48)).toEqual([0, 1])
    expect(levels(10, 80)).toEqual([0, 0])
    expect(levels(40, null)).toEqual([0, 0])
  })
})

describe('pay text', () => {
  it('formats rupees in lakhs and dollars in thousands without false precision', () => {
    expect(money('INR', 38)).toBe('₹38L')
    expect(money('INR', 52.5)).toBe('₹52.5L')
    expect(money('USD', 185)).toBe('$185k')
    expect(money('USD', 185.04)).toBe('$185k')
  })
  it('reads typed amounts and rejects nonsense', () => {
    expect(parseAmount('38')).toBe(38)
    expect(parseAmount(' 52.5 ')).toBe(52.5)
    expect(parseAmount('1,200')).toBe(1200)
    for (const bad of ['', 'abc', '0', '-4', '20000', '1e9']) expect(parseAmount(bad)).toBeNull()
  })
  it('splits the engine verdict labels', () => {
    expect(splitLabel('Achievable — Well Calibrated')).toEqual(['Achievable', 'Well Calibrated'])
    expect(splitLabel('Top of Band')).toEqual(['Top of Band', ''])
  })
  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 62, 83, 99].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '62nd', '83rd', '99th'])
  })
})
