import { describe, expect, it } from 'vitest'
import { scoreResume } from '../src/index.ts'
import * as FX from './fixtures.ts'

const NOW = new Date('2026-11-28')

/** A realistic QA resume. `start` sets how many years of QA experience it shows. */
const qa = (start: string, title = 'QA Engineer', extra = '') => `Riya Sharma
riya.sharma@example.com | +91 98765 43210 | Pune, India | linkedin.com/in/riyasharma

SUMMARY
Detail-oriented ${title} with experience in manual and automation testing, API testing and regression suites for web and mobile apps.

EXPERIENCE
${title}, Infosys Ltd  ${start} - Present
- Executed 400+ manual test cases per release across web and Android apps and logged 250+ defects in JIRA.
- Built a Selenium and Java automation suite covering 60 regression scenarios, cutting regression time from 3 days to 1 day.
- Tested REST APIs with Postman and wrote SQL queries to validate data across 3 microservices.
- Participated in daily stand-ups and sprint planning with 8 developers.
${extra}
EDUCATION
B.E. Computer Engineering, Pune University  2014 - 2018

SKILLS
Manual Testing, Selenium, Java, Postman, SQL, JIRA, TestRail, Agile, API Testing
`

/** What the app does on upload: a first pass to prefill the level, then the real scoring with that level. */
const asTheAppScores = (text: string) => {
  const first = scoreResume({ text, source: 'paste', market: 'india' }, NOW)
  return scoreResume({ text, source: 'paste', market: 'india', targetLevel: first.contextUsed.detectedLevel, track: 'generalist', companyArchetype: 'scaleup' }, NOW)
}

describe('a resume with no product experience', () => {
  it.each([
    ['a junior with 2 years of QA', qa('Jul 2024', 'Junior QA Engineer')],
    ['6 years of QA', qa('Jan 2021')],
    ['11 years of QA, leading a small team', qa('Aug 2015', 'QA Engineer', '- Led a team of 4 testers and owned the test strategy for the payments release.\n')],
  ])('is an entry-level PM candidate, never a senior one: %s', (_, text) => {
    const r = asTheAppScores(text)
    expect(r.contextUsed.isPmResume).toBe(false)
    expect(r.contextUsed.background).toBe('engineering')
    expect(r.contextUsed.detectedLevel).toBe('apm')
    expect(r.contextUsed.level).toBe('apm')
    expect(r.compensation.cohortLabel.startsWith('APM')).toBe(true)
    // The entry-level band for India, nowhere near the 50 to 85 lakh a Lead / Group PM sees.
    expect(r.compensation.marketBand.max).toBeLessThan(30)
  })

  it('says so in the headline and does not call the resume nearly ready for a PM interview', () => {
    const r = asTheAppScores(qa('Aug 2015', 'QA Engineer', '- Led a team of 4 testers.\n'))
    expect(r.headline).toMatch(/engineering or QA resume, not yet as a product management resume/)
    expect(r.gradeLabel).toBe('Not a PM resume yet')
    expect(['ship', 'beta']).not.toContain(r.grade)
  })

  it('is not made a Lead PM by a title like "Director of Engineering"', () => {
    const text = qa('Mar 2012', 'Director of Engineering').replace('Detail-oriented Director of Engineering', 'Engineering leader')
    const r = asTheAppScores(text)
    expect(r.contextUsed.detectedLevel).toBe('apm')
    expect(r.contextUsed.isPmResume).toBe(false)
  })

  it('does not count a Product Designer or Product Analyst title as years of PM experience', () => {
    for (const title of ['Product Designer', 'Product Analyst', 'Product Marketing Manager']) {
      const r = asTheAppScores(qa('Jan 2019', title))
      expect(r.contextUsed.isPmResume, title).toBe(false)
      expect(r.contextUsed.detectedLevel, title).toBe('apm')
    }
  })

  it('still honours a level the person picks themselves', () => {
    const r = scoreResume({ text: qa('Jan 2021'), source: 'paste', market: 'india', targetLevel: 'senior' }, NOW)
    expect(r.contextUsed.level).toBe('senior')
    expect(r.compensation.cohortLabel.startsWith('Senior PM')).toBe(true)
  })
})

describe('a resume that does show product experience', () => {
  it('is unchanged: a PM resume is a PM resume, at the level its years and titles give', () => {
    const r = scoreResume({ text: FX.STRONG_AI_PM, source: 'paste' }, NOW)
    expect(r.contextUsed.isPmResume).toBe(true)
    expect(r.contextUsed.background).toBe('practicing_pm')
    expect(r.gradeLabel).not.toBe('Not a PM resume yet')
  })

  it('treats a short stint as a PM role as still a PM resume', () => {
    const text = qa('Jun 2026', 'Associate Product Manager')
    const r = scoreResume({ text, source: 'paste', market: 'india' }, NOW)
    expect(r.contextUsed.isPmResume).toBe(true)
    expect(r.contextUsed.background).toBe('practicing_pm')
  })

  it('still reads a real "Director of Product" as lead', () => {
    const text = qa('Mar 2014', 'Director of Product').replace('Detail-oriented Director of Product', 'Product leader')
    const r = scoreResume({ text, source: 'paste', market: 'india' }, NOW)
    expect(r.contextUsed.isPmResume).toBe(true)
    expect(r.contextUsed.detectedLevel).toBe('lead')
  })
})

describe('headline wording', () => {
  it('uses the right verb for one blocker', () => {
    for (const text of Object.values(FX).filter((v) => typeof v === 'string') as string[]) {
      const r = scoreResume({ text, source: 'paste' }, NOW)
      expect(r.headline).not.toMatch(/\b1 critical blockers\b|\b1 critical blocker stand\b/)
    }
  })
})
