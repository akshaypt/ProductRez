import { describe, expect, it } from 'vitest'
import { inferContext, scoreResume } from '../src/index.ts'
import { isPmTitle } from '../src/kb/index.ts'
import * as FX from './fixtures.ts'

const NOW = new Date('2026-11-28')

interface Role { title: string; company: string; start: string; end?: string; bullets: string[] }
const resume = (roles: Role[], summary = 'Product leader building customer-facing products.') => `Alex Kim
alex@example.com | +1 415 555 0100 | San Francisco, CA | linkedin.com/in/alexkim

SUMMARY
${summary}

EXPERIENCE
${roles.map((r) => `${r.title}, ${r.company}  ${r.start} - ${r.end ?? 'Present'}\n${r.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n')}

EDUCATION
B.S. Computer Science, State University  2012 - 2016

SKILLS
SQL, Roadmapping, Experimentation, Figma, Jira
`

const infer = (text: string) => inferContext(scoreResume({ text, source: 'paste', market: 'india' }, NOW))
const GENERIC = ['Cut onboarding time from 9 days to 3 days by redesigning the setup flow for 12,000 accounts.', 'Led a team of 8 across engineering and design to ship the roadmap.']

describe('company type is read from the employers, not assumed', () => {
  it.each([
    ['Google', 'maang'],
    ['Amazon Web Services', 'maang'],
    ['Infosys Ltd', 'enterprise'],
    ['Oracle', 'enterprise'],
    ['Razorpay', 'scaleup'],
  ])('%s is %s', (company, want) => {
    const c = infer(resume([{ title: 'Product Manager', company, start: 'Jan 2021', bullets: GENERIC }]))
    expect(c.archetype).toBe(want)
    expect(c.companyConfidence).toBe('clear')
    expect(c.reasons.company).toContain(company)
  })

  it('reads funding stages from the role text', () => {
    const early = infer(resume([{ title: 'Product Manager', company: 'Nimbus', start: 'Jan 2024', bullets: ['Joined as the first PM at a seed-stage startup and shipped the MVP to 400 customers.', ...GENERIC] }]))
    expect(early.archetype).toBe('early_startup')
    const scale = infer(resume([{ title: 'Product Manager', company: 'Nimbus', start: 'Jan 2024', bullets: ['Scaled the product after the Series C round, from 2,000 to 40,000 customers.', ...GENERIC] }]))
    expect(scale.archetype).toBe('scaleup')
  })

  it('treats a recent founder role as an early-stage signal, but an old one says nothing about where the person works now', () => {
    const recent = infer(resume([{ title: 'Co-Founder & CPO', company: 'Orbit Labs', start: 'Jan 2024', bullets: GENERIC }]))
    expect(recent.archetype).toBe('early_startup')
    const old = infer(resume([
      { title: 'Product Manager', company: 'Brightly', start: 'Mar 2023', bullets: GENERIC },
      { title: 'Senior Product Manager', company: 'Acme', start: 'Mar 2022', end: 'Feb 2023', bullets: GENERIC },
      { title: 'Co-Founder', company: 'Tiny Ventures', start: 'Jan 2016', end: 'Dec 2019', bullets: GENERIC },
    ]))
    expect(old.companyConfidence).toBe('guess')
  })

  it('does not treat "0 to 1" or "MVP" alone as proof of an early-stage company, and says when it is guessing', () => {
    const c = infer(resume([{ title: 'Product Manager', company: 'Brightly', start: 'Jan 2021', bullets: ['Led 0-to-1 development of the billing product and shipped the MVP in 8 weeks.', ...GENERIC] }]))
    expect(c.archetype).toBe('scaleup')
    expect(c.companyConfidence).toBe('guess')
    expect(c.reasons.company).toMatch(/does not say what kind of companies/)
  })
})

describe('PM focus is the domain the person works in, not the track their resume is best written for', () => {
  const fintech = [
    'Launched UPI autopay and wallet top-ups, cutting payment failures from 4.1% to 1.9% across 2M transactions.',
    'Rebuilt KYC onboarding for a lending product, lifting loan disbursals by 31% while holding fraud flat.',
    'Owned the payouts and ledger roadmap for 3 bank partners.',
  ]
  it('picks fintech for a payments PM, where the old method said Core / Generalist', () => {
    const c = infer(resume([{ title: 'Product Manager, Payments', company: 'Brightly', start: 'Jan 2020', bullets: fintech }]))
    expect(c.track).toBe('fintech')
    expect(c.trackConfidence).toBe('clear')
    expect(c.reasons.track).toMatch(/fintech/i)
  })

  it('picks AI when the work is AI, even when it sits inside a B2B SaaS product', () => {
    const c = inferContext(scoreResume({ text: FX.STRONG_AI_PM, source: 'paste' }, NOW))
    expect(c.track).toBe('ai_ml')
  })

  it('stays broad, and says why, when several domains are about equally strong', () => {
    const c = infer(resume([
      { title: 'Senior Product Manager', company: 'Brightly', start: 'Jan 2023', bullets: ['Lifted activation and paywall conversion with 14 growth experiments and a referral loop.', 'Shipped multi-tenant enterprise SaaS admin controls with SSO and RBAC for B2B customers.', 'Launched a lending and KYC flow with wallet payouts for 3 bank partners.'] },
      { title: 'Product Manager', company: 'Acme', start: 'Jan 2020', end: 'Dec 2022', bullets: ['Grew referral and reactivation funnels, adding 40% to subscription conversion.', 'Built B2B SaaS integrations and a workflow engine for enterprise customers.', 'Owned the payments and credit roadmap.'] },
    ]))
    expect(c.track).toBe('generalist')
    expect(c.trackConfidence).toBe('mixed')
    expect(c.reasons.track).toMatch(/spans .*(growth|fintech|B2B SaaS)/)
  })

  it('starts broad, and says so, when no domain stands out', () => {
    const c = infer(resume([{ title: 'Product Manager', company: 'Brightly', start: 'Jan 2020', bullets: GENERIC }]))
    expect(c.track).toBe('generalist')
    expect(c.trackConfidence).toBe('none')
    expect(c.reasons.track).toMatch(/No single product domain stands out/)
  })
})

describe('level from years and the titles held', () => {
  const nine = (title: string) => infer(resume([{ title, company: 'Brightly', start: 'Jan 2017', bullets: GENERIC }]))
  it('does not make a nine-year Product Manager a Lead / Group PM; the realistic next level is Senior', () => {
    expect(nine('Product Manager').level).toBe('senior')
  })
  it('reaches Lead by years only with a senior title in the career', () => {
    expect(nine('Senior Product Manager').level).toBe('lead')
  })
  it('explains the pick in words', () => {
    expect(nine('Senior Product Manager').reasons.level).toMatch(/years in product, latest title Senior Product Manager/)
  })
})

describe('what counts as a PM title', () => {
  it('accepts the bare abbreviation, but not a project or program manager', () => {
    expect(isPmTitle('PM')).toBe(true)
    expect(isPmTitle('Sr. PM, Growth')).toBe(true)
    expect(isPmTitle('Product Manager')).toBe(true)
    expect(isPmTitle('Project Manager (PM)')).toBe(false)
    expect(isPmTitle('Program Manager')).toBe(false)
    expect(isPmTitle('QA Engineer')).toBe(false)
  })
})
