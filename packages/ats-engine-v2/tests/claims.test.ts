import { describe, expect, it } from 'vitest'
import { reviewBullet, scoreResume } from '../src/index.ts'
import * as FX from './fixtures.ts'

const rv = (text: string, current = true, index = 3) => reviewBullet(text, 'experience', 'Senior PM · Acme', 0, current, 'generalist', index)

describe('which bullets are asked for a number', () => {
  it('does not tag a bullet that only describes a system, platform or team it built or led', () => {
    for (const t of [
      'Architected role-based access control and a configurable workflow engine that enforces approval limits across five lending products',
      'Led a cross-functional team using Agile and Scrum, owning delivery of the payments roadmap end to end',
      'Built a full-stack content creation platform with Next.js and Supabase, shipping end to end without a developer or designer',
      'Defined the product vision, strategy and roadmap for a multi-tenant enterprise SaaS platform',
    ]) {
      const b = rv(t)
      expect(b.needsMetric, t).toBe(false)
      expect(b.flags, t).not.toContain('no-metric')
      expect(b.flags, t).not.toContain('activity-only')
    }
  })

  it('tags a bullet that claims a result without proving it', () => {
    for (const t of ['Improved the onboarding experience for new enterprise customers', 'Significantly reduced support tickets through better self-serve content', 'Drove growth in the partner channel by launching a referral program']) {
      const b = rv(t)
      expect(b.needsMetric, t).toBe(true)
      expect(b.flags, t).toContain('no-metric')
    }
  })

  it('does not mistake nouns such as "generation" or "optimization" for a claim', () => {
    expect(rv('Built an AI image generation pipeline with Next.js and OpenAI for the content studio').flags).not.toContain('no-metric')
  })

  it('does not ask for a before/after when the number already carries one', () => {
    for (const t of [
      'Improved gross margins by 4% through automated flash sale logic that reduced waste',
      'Cut onboarding time from 9 days to 3 days by automating KYC checks',
      'Reduced cash transactions 70% by launching digital payment at delivery',
      'Grew the channel to 10K followers in its first 2 weeks by testing short-form formats',
    ]) expect(rv(t).flags, t).not.toContain('no-baseline-delta')
  })

  it('asks for a baseline when a claim is backed only by a bare count', () => {
    expect(rv('Improved activation by onboarding 12,000 accounts onto the new self-serve flow').flags).toContain('no-baseline-delta')
  })

  it('still flags weak openers and activity logs', () => {
    expect(rv('Responsible for the roadmap and attending stakeholder meetings').flags).toContain('weak-verb')
    expect(rv('Helped with various tasks').flags).toContain('activity-only')
  })
})

describe('pointing at the bullet', () => {
  it('gives every bullet a role and position', () => {
    expect(rv('Shipped a pricing experiment that lifted conversion 12%').ref).toBe('Senior PM · Acme · bullet 3')
    const r = scoreResume({ text: FX.WEAK_FEATURE_FACTORY_AI_WASHED, source: 'paste' })
    expect(r.bullets.every((b) => b.index >= 1 && b.ref.includes(`bullet ${b.index}`))).toBe(true)
  })

  it('attaches the exact bullets to a finding that quotes them', () => {
    const r = scoreResume({ text: FX.WEAK_FEATURE_FACTORY_AI_WASHED, source: 'paste' })
    const f = r.findings.find((x) => x.kbRuleId === 'metric_density')!
    expect(f.evidenceBullets?.length).toBeGreaterThan(0)
    for (const e of f.evidenceBullets!) {
      expect(e.ref).toMatch(/ · bullet \d+$/)
      expect(r.bullets.some((b) => b.ref === e.ref && b.text === e.text)).toBe(true)
    }
  })
})

describe('resume-level metric density', () => {
  it('does not ask for more numbers when about half the bullets are quantified and the rest describe what was built', () => {
    const text = `Dana Roy
dana@example.com | +1 415 555 0100 | Austin, TX | linkedin.com/in/danaroy

EXPERIENCE
Senior Product Manager, Northwind  2021 - Present
- Cut loan approval time from 9 days to 3 days by automating document checks, lifting conversion 14%.
- Architected the rules engine and approval workflow behind five lending products.
- Led a team of 12 across engineering, design and data to deliver the payments roadmap.
- Grew activation from 31% to 47% across 12,000 accounts by redesigning onboarding.
- Defined the platform strategy and data model for the multi-tenant lending stack.
Product Manager, Brightly  2018 - 2021
- Launched search ranking experiments that reduced time-to-result by 40%.
- Built the experimentation platform used by six product squads.

EDUCATION
B.S. Computer Science, State University  2014 - 2018

SKILLS
SQL, Product analytics, Roadmapping, Experimentation, Stakeholder management, Figma, Jira`
    const r = scoreResume({ text, source: 'paste' })
    expect(r.findings.some((f) => f.kbRuleId === 'metric_density')).toBe(false)
    expect(r.bullets.some((b) => b.flags.includes('no-metric'))).toBe(false)
  })

  it('still penalises a resume with no numbers at all', () => {
    const r = scoreResume({ text: FX.WEAK_FEATURE_FACTORY_AI_WASHED, source: 'paste' })
    expect(r.findings.some((f) => f.kbRuleId === 'metric_density')).toBe(true)
    expect(r.dimensions.find((d) => d.id === 'impact')!.score).toBeLessThan(20)
  })
})

describe('how many points a fix is claimed to be worth', () => {
  const all = Object.entries(FX).filter(([, v]) => typeof v === 'string') as [string, string][]
  it.each(all)('%s: no finding promises more than its dimension can give, and the total fits under the score', (_, text) => {
    const r = scoreResume({ text, source: 'paste' })
    const total = r.findings.reduce((s, f) => s + f.gain, 0)
    expect(total).toBeLessThanOrEqual(100 - r.overall)
    for (const f of r.findings) {
      const d = r.dimensions.find((x) => x.id === f.dimension)
      expect(f.gain).toBeGreaterThanOrEqual(0)
      expect(f.gain).toBeLessThanOrEqual(((100 - (d?.score ?? 100)) * (d?.weight ?? 0)) + 0.05)
    }
  })

  it('a high-scoring resume is never told it can gain much', () => {
    const r = scoreResume({ text: FX.STRONG_AI_PM, source: 'paste' })
    expect(r.overall).toBeGreaterThanOrEqual(85)
    expect(r.findings.reduce((s, f) => s + f.gain, 0)).toBeLessThanOrEqual(3)
  })

  it('no single finding is worth more than 15 overall points, even on a weak resume', () => {
    const r = scoreResume({ text: FX.WEAK_FEATURE_FACTORY_AI_WASHED, source: 'paste' })
    expect(Math.max(...r.findings.map((f) => f.gain))).toBeLessThanOrEqual(15)
    expect(r.findings.reduce((s, f) => s + f.gain, 0)).toBeLessThanOrEqual(35)
  })
})

describe('naming the role in a finding', () => {
  const text = `Alex Kim
alex@example.com | +1 415 555 0100 | San Francisco, CA | linkedin.com/in/alexkim

EXPERIENCE
Product Manager, Northwind Labs  Mar 2021 - Present
- Cut loan approval time from 9 days to 3 days by automating document checks.
- Grew activation from 31% to 47% across 12,000 accounts by redesigning onboarding.
- Architected the rules engine behind five lending products.
- Responsible for the roadmap and attending weekly stakeholder meetings.
- Helped with various analytics tasks for the growth team.
- Launched a referral program that added 4,000 paying customers in 6 months.
- Worked on the notification settings page.
- Improved the help center for new customers.
Product Manager, Brightly  Jan 2018 - Feb 2021
- Launched search ranking experiments that reduced time-to-result by 40%.
- Built the experimentation platform used by six product squads.

EDUCATION
B.S. Computer Science, State University  2014 - 2018

SKILLS
SQL, Product analytics, Roadmapping, Experimentation, Figma, Jira`
  const r = scoreResume({ text, source: 'paste', companyArchetype: 'scaleup' })
  const f = r.findings.find((x) => x.kbRuleId === 'feature_factory')

  it('says which company and dates a role finding is about, so two roles with one title are distinguishable', () => {
    expect(f).toBeDefined()
    expect(f!.evidence[0]).toContain('Northwind Labs')
    expect(f!.evidence[0]).toMatch(/Mar 2021/)
    expect(f!.evidence[0]).toMatch(/8 bullets/)
    expect(f!.evidence[0]).not.toContain('Brightly')
  })

  it("points at the weak bullets in that role as the ones to trim", () => {
    expect(f!.evidenceBullets?.length).toBeGreaterThan(0)
    for (const e of f!.evidenceBullets!) {
      expect(e.ref).toContain('Northwind Labs')
      expect(e.ref).toMatch(/bullet \d+/)
    }
    const texts = f!.evidenceBullets!.map((e) => e.text).join(' ')
    expect(texts).toMatch(/Helped with|Worked on|Responsible for|Improved the help center/)
    expect(texts).not.toMatch(/Cut loan approval time/)
  })
})

describe('role findings name the role in the title', () => {
  it('names the company in the feature-factory title', () => {
    const r = scoreResume({ text: FX.WEAK_FEATURE_FACTORY_AI_WASHED, source: 'paste' })
    const f = r.findings.find((x) => x.kbRuleId === 'feature_factory')
    if (f) expect(f.title).toMatch(/Feature factory.*(·|roles)/)
  })
})

describe('findings that talk about bullets point at them', () => {
  it('names the bullets that repeat an opener', () => {
    const text = `Alex Kim
alex@example.com | +1 415 555 0100 | San Francisco, CA

EXPERIENCE
Product Manager, Northwind Labs  Mar 2021 - Present
- Designed the onboarding flow and lifted activation from 31% to 47% across 12,000 accounts.
- Designed the pricing page and raised paid conversion 18% in one quarter.
- Designed the referral program and added 4,000 paying customers in 6 months.
- Designed the notification center, cutting churn from 6% to 4.5%.

EDUCATION
B.S. Computer Science, State University  2014 - 2018

SKILLS
SQL, Product analytics, Roadmapping, Experimentation, Figma, Jira`
    const r = scoreResume({ text, source: 'paste' })
    const f = r.findings.find((x) => x.kbRuleId === 'verb_variety')!
    expect(f).toBeDefined()
    expect(f.evidenceBullets?.length).toBe(4)
    expect(f.evidenceBullets!.map((e) => e.ref)).toEqual(['1', '2', '3', '4'].map((n) => `Product Manager · Northwind Labs · bullet ${n}`))
  })
})
