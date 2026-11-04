import { describe, expect, it } from 'vitest'
import { classifyCountry, classifyLevel, isProductRole, parseCards, toJobs } from '../scripts/lib/linkedin.ts'

const card = (id: string, title: string, company: string, loc: string, date: string) => `
<li><div class="base-card relevance-card job-search-card" data-entity-urn="urn:li:jobPosting:${id}">
  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/${title.toLowerCase().replace(/\W+/g, '-')}-at-x-${id}?position=1&amp;pageNum=0"><span class="sr-only">${title}</span></a>
  <div class="base-search-card__info"><h3 class="base-search-card__title">  ${title}  </h3>
  <h4 class="base-search-card__subtitle"><a class="hidden-nested-link" href="#">${company}</a></h4>
  <div class="base-search-card__metadata"><span class="job-search-card__location">${loc}</span>
  <time class="job-search-card__listdate" datetime="${date}">1 day ago</time></div></div></div></li>`

const NOW = new Date('2026-11-04T01:30:00Z')
const html = [
  card('1001', 'Senior Product Manager, Payments', 'Lumen &amp; Co', 'San Francisco, CA', '2026-11-04'),
  card('1002', 'Associate Product Manager', 'Chaiwala', 'Gurugram, Haryana, India', '2026-11-03'),
  card('1003', 'Product Manager', 'Old Co', 'Austin, TX', '2026-10-30'),
  card('1004', 'Product Marketing Manager', 'Mkt Co', 'New York, NY', '2026-11-04'),
  card('1005', 'Product Manager', 'London Ltd', 'London, England, United Kingdom', '2026-11-04'),
  card('1006', 'Group Product Manager (Remote)', 'Halcyon', 'United States', '2026-11-03'),
  card('1001', 'Senior Product Manager, Payments', 'Lumen &amp; Co', 'San Francisco, CA', '2026-11-04'),
].join('\n')

describe('linkedin parser', () => {
  const cards = parseCards(html)
  it('extracts cards and decodes entities', () => {
    expect(cards).toHaveLength(7)
    expect(cards[0]).toMatchObject({ id: '1001', title: 'Senior Product Manager, Payments', company: 'Lumen & Co', location: 'San Francisco, CA', postedOn: '2026-11-04' })
  })
  const jobs = toJobs(cards, NOW)
  it('keeps only PM roles in US/IN posted within the last 2 days, deduped', () => {
    expect(jobs.map((j) => j.id).sort()).toEqual(['1001', '1002', '1006'])
  })
  it('drops stale, marketing and out-of-market listings', () => {
    const ids = jobs.map((j) => j.id)
    expect(ids).not.toContain('1003') // 5 days old
    expect(ids).not.toContain('1004') // product marketing
    expect(ids).not.toContain('1005') // UK
  })
  it('classifies country, level, mode and canonical url', () => {
    const by = Object.fromEntries(jobs.map((j) => [j.id, j]))
    expect(by['1002']).toMatchObject({ country: 'IN', level: 'apm', url: 'https://www.linkedin.com/jobs/view/1002' })
    expect(by['1001']).toMatchObject({ country: 'US', level: 'senior' })
    expect(by['1006']).toMatchObject({ level: 'lead', work_mode: 'remote' })
  })
  it('role + country helpers', () => {
    expect(isProductRole('Product Owner')).toBe(true)
    expect(isProductRole('Project Manager')).toBe(false)
    expect(isProductRole('Software Engineer')).toBe(false)
    expect(classifyCountry('Bengaluru, Karnataka, India')).toBe('IN')
    expect(classifyCountry('Remote, United States')).toBe('US')
    expect(classifyCountry('Berlin, Germany')).toBe('OTHER')
    expect(classifyLevel('Director of Product')).toBe('lead')
  })
})
