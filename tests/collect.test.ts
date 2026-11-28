import { describe, expect, it } from 'vitest'
import { scoreResume } from '../packages/ats-engine-v2/src/index.ts'
import { submissionPayload } from '../src/lib/g/collect'

const TEXT = `Jordan Lee
jordan@example.com | +1 (415) 555-0134 | San Francisco, CA 94105 | linkedin.com/in/jordanlee

EXPERIENCE
Senior Product Manager, Acme Cloud  2021 - Present
- Launched a self-serve onboarding flow that lifted activation from 31% to 47% across 12,000 accounts.
- Led 8 engineers and 2 designers to ship usage-based billing, adding 18% expansion revenue.
EDUCATION
B.S. Computer Science, State University 2014 - 2018
SKILLS
SQL, Roadmapping, Experimentation`

describe('submissionPayload', () => {
  const report = scoreResume({ text: TEXT, source: 'paste', market: 'us' })
  const p = submissionPayload({ resume: { name: 'x', text: TEXT, pageCount: null, size: 1, source: 'paste' }, picks: { level: 'Senior PM', track: null, company: null, currency: 'USD' }, jd: '', report }, 'landing')
  it('carries the parsed resume with its contact details, not the raw file', () => {
    expect(p.resume.basics.email).toBe('jordan@example.com')
    expect(p.resume.basics.name).toBe('Jordan Lee')
    expect(JSON.stringify(p)).not.toContain('"text"')
  })
  it('records scores, choices and the wording version', () => {
    expect(p.scores.overall).toBe(report.overall)
    expect(p.scores.currency).toBe('USD')
    expect(p.termsVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.anonId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(JSON.stringify(p).length).toBeLessThan(200_000)
  })
})
