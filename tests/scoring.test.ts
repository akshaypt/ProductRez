import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hasMetric, isWeakOpening, parseResume, reviewBullet, scoreResume } from '@scoring'

const weak = readFileSync('tests/fixtures/weak.txt', 'utf8')
const strong = readFileSync('tests/fixtures/strong.txt', 'utf8')
const now = new Date('2026-11-04')

describe('parser', () => {
  it('extracts contact and sections', () => {
    const p = parseResume(strong)
    expect(p.data.basics.name).toBe('Priya Nair')
    expect(p.data.basics.email).toBe('priya.nair@example.com')
    expect(p.data.basics.linkedin).toContain('linkedin.com/in/priyanair')
    expect(p.sectionsFound).toEqual(expect.arrayContaining(['summary', 'experience', 'education', 'skills']))
  })
  it('splits roles and bullets', () => {
    const p = parseResume(strong)
    expect(p.data.experience).toHaveLength(2)
    expect(p.data.experience[0].bullets).toHaveLength(5)
    expect(p.data.experience[0].end).toBe('Present')
    expect(p.data.experience[1].bullets).toHaveLength(3)
  })
  it('joins wrapped bullet lines', () => {
    const p = parseResume('Jo\njo@x.com\n\nExperience\nPM, Acme   Jan 2020 - Present\n• Launched a new onboarding flow that\nincreased activation by 20% in Q3\n• Defined roadmap')
    expect(p.data.experience[0].bullets[0]).toBe('Launched a new onboarding flow that increased activation by 20% in Q3')
  })
})

describe('signals', () => {
  it('detects metrics', () => {
    expect(hasMetric('Grew revenue 32%')).toBe(true)
    expect(hasMetric('Saved ₹4 crore annually')).toBe(true)
    expect(hasMetric('Led 5 engineers')).toBe(true)
    expect(hasMetric('Managed the backlog')).toBe(false)
  })
  it('detects weak openings', () => {
    expect(isWeakOpening('Responsible for the roadmap')).toBe(true)
    expect(isWeakOpening('Helped the team ship')).toBe(true)
    expect(isWeakOpening('Shipped a billing portal')).toBe(false)
  })
})

describe('scoring', () => {
  const w = scoreResume({ text: weak }, now)
  const s = scoreResume({ text: strong }, now)
  it('ranks strong above weak by a wide margin', () => {
    console.log('weak', w.overall, w.dimensions.map((d) => `${d.id}:${d.score}`).join(' '), '|', w.headline)
    console.log('strong', s.overall, s.dimensions.map((d) => `${d.id}:${d.score}`).join(' '), '|', s.headline)
    expect(s.overall).toBeGreaterThan(w.overall + 25)
    expect(s.overall).toBeGreaterThanOrEqual(75)
    expect(w.overall).toBeLessThan(50)
  })
  it('flags blockers on the weak resume', () => {
    expect(w.findings.some((f) => f.priority === 'P0' || f.priority === 'P1')).toBe(true)
    expect(w.findings.map((f) => f.title).join(' ')).toMatch(/no measurable outcome|helper/)
    expect(w.findings[0].evidence.length + w.findings.length).toBeGreaterThan(2)
  })
  it('estimates level and years', () => {
    expect(s.level.detected === 'senior' || s.level.detected === 'lead').toBe(true)
    expect(w.level.detected).toBe('apm')
  })
  it('matches keywords against a job description', () => {
    const jd = 'We need a Product Manager with experience in A/B testing, SQL, roadmap ownership, stakeholder management, Kubernetes, pricing and go-to-market launches. Roadmap, experimentation, pricing and SQL are essential. Kubernetes experience helpful. Stakeholder alignment crucial.'
    const m = scoreResume({ text: strong, jobDescription: jd }, now)
    expect(m.keywordMatch).not.toBeNull()
    expect(m.keywordMatch!.matched.length).toBeGreaterThan(2)
    expect(m.dimensions.some((d) => d.id === 'match')).toBe(true)
    expect(m.dimensions.reduce((a, d) => a + d.weight, 0)).toBeCloseTo(1, 5)
  })
  it('handles junk input without throwing', () => {
    const j = scoreResume({ text: 'hello' }, now)
    expect(j.overall).toBeLessThan(40)
    expect(j.findings[0].priority).toBe('P0')
  })
})

describe('header split', () => {
  it('separates title, company, location and dates by column gaps', () => {
    const x = parseResume(strong).data.experience[0]
    expect(x.title).toBe('Senior Product Manager')
    expect(x.company).toBe('Stripe-like Co. (sample)')
    expect(x.location).toBe('San Francisco, CA')
    expect(x.start).toBe('Jan 2021')
  })
})

describe('verb recognition', () => {
  it('treats irregular past-tense verbs as action verbs (no false "no-verb")', () => {
    for (const b of ['Wrote requirements for the reporting module shipped to 2,400 customers', 'Ran 6 pricing A/B tests, lifting conversion 14%', 'Grew activation from 38% to 52%', 'Built a self-serve billing portal for 8,000 customers']) {
      expect(reviewBullet(b, 'experience', '', true).flags).not.toContain('no-verb')
    }
  })
})
