import { describe, expect, it } from 'vitest'
import { detectCurrency } from '../src/lib/util'

describe('detectCurrency', () => {
  it('reads INR from rupee marks and Indian pay words', () => {
    expect(detectCurrency('Product Manager, Bengaluru. Current CTC ₹38 LPA. Led a team of 6.')).toBe('INR')
    expect(detectCurrency('+91 98765 43210  Gurugram, Haryana. Raised pay by Rs. 20 lakhs')).toBe('INR')
  })
  it('reads USD from US phone, state plus ZIP, and city', () => {
    expect(detectCurrency('(415) 555-0134  San Francisco, CA 94105. Grew ARR to $12M.')).toBe('USD')
    expect(detectCurrency('Seattle, WA. Base salary 185,000 USD')).toBe('USD')
  })
  it('does not let a dollar revenue figure outweigh an Indian location', () => {
    expect(detectCurrency('Mumbai, India. +91 99999 11111. Grew ARR to $5M for US customers.')).toBe('INR')
  })
  it('returns null when there is no evidence or it is split', () => {
    expect(detectCurrency('Product Manager with 5 years of experience building B2B SaaS.')).toBeNull()
    expect(detectCurrency('Grew revenue to $2M.')).toBeNull()
    expect(detectCurrency('Bengaluru, India. Previously in Seattle, WA 98101.')).toBeNull()
  })
})
