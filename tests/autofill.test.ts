import { describe, expect, it } from 'vitest'
import { mergePicks } from '../src/lib/g/autofill'

const picks = (level: string | null, track: string | null, company: string | null) => ({ level, track, company, currency: null })

describe('mergePicks', () => {
  const first = picks('Senior PM', 'Fintech', 'Scale-ups')
  const second = picks('Product Manager', 'AI / ML Product', 'Big Tech / MAANG')

  it('fills an empty form from the suggestion', () => {
    expect(mergePicks(picks(null, null, null), null, first)).toEqual({ ...first, currency: null })
  })

  it('replaces picks the app filled in from the first resume when a second resume is read', () => {
    // The person changed nothing, so every pick still equals what the app filled in earlier.
    expect(mergePicks(first, first, second)).toEqual({ ...second, currency: null })
  })

  it('keeps a pick the person changed by hand, and replaces the rest', () => {
    const edited = picks('Senior PM', 'Growth & PLG', 'Scale-ups')
    const m = mergePicks(edited, first, second)
    expect(m.track).toBe('Growth & PLG')
    expect(m.level).toBe('Product Manager')
    expect(m.company).toBe('Big Tech / MAANG')
  })

  it('keeps the currency the person set when the new resume does not say', () => {
    expect(mergePicks({ ...first, currency: 'INR' }, first, { ...second, currency: null }).currency).toBe('INR')
    expect(mergePicks({ ...first, currency: 'INR' }, first, { ...second, currency: 'USD' }).currency).toBe('USD')
  })
})
