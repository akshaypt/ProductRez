import { describe, expect, it } from 'vitest'

// The same pattern the bullet list uses to find figures. Kept here so a unit-and-word mix-up cannot come back.
const NUMBER = /([$₹]\s?\d[\d,.]*\s?(?:k|m|mn|bn|cr|crore|lpa|lakhs?|l|million|billion)?(?![A-Za-z])|\b\d[\d,.]*\s?(?:%|x|×|k|m|mn|bn|cr|crore|lpa|lakhs?|l|million|billion)?\+?(?![A-Za-z]))/gi
const figures = (t: string) => t.split(NUMBER).filter((_, i) => i % 2 === 1).map((s) => s.trim())

describe('figures in a bullet', () => {
  it('finds numbers with their units', () => {
    expect(figures('Grew conversion 2.7x (2.1% to 5.7%) across 100K farmers and 10,000+ trades')).toEqual(['2.7x', '2.1%', '5.7%', '100K', '10,000+'])
    expect(figures('Scaled disbursals from Rs.30 Cr to over Rs.100 Cr')).toEqual(['30 Cr', '100 Cr'])
    expect(figures('Saved $2M and ₹40L a year')).toEqual(['$2M', '₹40L'])
  })
  it('does not split a number from a word that merely starts with a unit letter', () => {
    expect(figures('launched the MVP in 3 months')).toEqual(['3'])
    expect(figures('onboarded 41 merchants in the first 4 months')).toEqual(['41', '4'])
    expect(figures('reached 5 million views')).toEqual(['5 million'])
  })
  it('ignores names that contain a digit', () => {
    expect(figures('Grew D2C apps and B2B SaaS')).toEqual([])
  })
})

describe('lakh units', () => {
  it('reads L and LPA, and still ignores words that start with l', () => {
    expect(figures('Moved from 38 LPA to ₹52L')).toEqual(['38 LPA', '₹52L'])
    expect(figures('ran 3 launches and 12 listings')).toEqual(['3', '12'])
  })
})
