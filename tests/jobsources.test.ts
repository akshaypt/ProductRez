import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { boardUrl, greenhouseDetailUrl, htmlToText, keepFor, normalize, toRow, type Company } from '../supabase/functions/_shared/jobs/sources.ts'

const fx = (n: string) => JSON.parse(readFileSync(`tests/fixtures/jobs/${n}.json`, 'utf8'))
const co = (ats: Company['ats'], token: string, name: string): Company => ({ id: `${ats}:${token}`, ats, token, name, archetype: 'scaleup' })

describe('htmlToText', () => {
  it('decodes escaped markup, keeps list structure and drops tags', () => {
    expect(htmlToText('&lt;p&gt;Own the &amp;roadmap&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;li&gt;A/B tests&lt;/li&gt;&lt;/ul&gt;')).toBe('Own the &roadmap\n\n• SQL\n• A/B tests')
    expect(htmlToText('<script>x()</script><p>Hello&nbsp;world &#8211; ok</p>')).toBe('Hello world – ok')
  })
  it('caps the length', () => expect(htmlToText('x'.repeat(9000), 100)).toHaveLength(100))
})

describe('board urls', () => {
  it('points at each public API', () => {
    expect(boardUrl({ ats: 'greenhouse', token: 'stripe' })).toBe('https://boards-api.greenhouse.io/v1/boards/stripe/jobs')
    expect(greenhouseDetailUrl('stripe', '123')).toBe('https://boards-api.greenhouse.io/v1/boards/stripe/jobs/123')
    expect(boardUrl({ ats: 'lever', token: 'paytm' })).toBe('https://api.lever.co/v0/postings/paytm?mode=json')
    expect(boardUrl({ ats: 'ashby', token: 'openai' })).toContain('/posting-api/job-board/openai')
  })
})

describe('Greenhouse (Razorpay)', () => {
  const raw = normalize('greenhouse', fx('greenhouse'))
  it('normalises every field', () => {
    expect(raw).toHaveLength(3)
    expect(raw[0]).toMatchObject({ title: 'Product Manager II', url: expect.stringContaining('greenhouse.io') })
    expect(raw[0].postedAt).toMatch(/^2026-09-07T/)
    expect(raw[0].description.length).toBeGreaterThan(200)
    expect(raw[0].description).not.toContain('&lt;')
  })
  it('keeps a fresh PM role and classifies it', () => {
    const r = toRow(raw[1], co('greenhouse', 'razorpay', 'Razorpay'), new Date('2026-11-11T08:00:00Z'))
    expect(r).not.toBeNull()
    expect(r!.id).toMatch(/^greenhouse:razorpay:\d+$/)
    expect(r!.company).toBe('Razorpay')
    expect(r!.market).toBe('india')
    expect(r!.country).toBe('IN')
    expect(r!.level).toBe('senior')
    expect(r!.posted_on).toBe('2026-11-10')
    expect(r!.skills.length).toBeGreaterThan(0)
  })
  it('skips stale roles and non-PM roles', () => {
    expect(toRow(raw[0], co('greenhouse', 'razorpay', 'Razorpay'), new Date('2026-11-11T08:00:00Z'))).toBeNull() // posted two months earlier
    expect(toRow(raw[2], co('greenhouse', 'razorpay', 'Razorpay'), new Date('2026-10-08T20:00:00Z'))).toBeNull() // analyst
  })
})

describe('Lever (Paytm)', () => {
  const raw = normalize('lever', fx('lever'))
  it('normalises and classifies a fresh role', () => {
    expect(raw[0].location).toContain('Noida')
    const r = toRow(raw[0], co('lever', 'paytm', 'Paytm'), new Date(Number(fx('lever')[0].createdAt) + 5 * 3_600_000))
    expect(r).toMatchObject({ market: 'india', source: 'lever', company: 'Paytm', is_active: true })
    expect(r!.url).toContain('jobs.lever.co')
  })
  it('drops the ads sales role', () => {
    expect(toRow(raw[2], co('lever', 'paytm', 'Paytm'), new Date(Number(fx('lever')[2].createdAt) + 3_600_000))).toBeNull()
  })
})

describe('Ashby (Sarvam)', () => {
  const raw = normalize('ashby', fx('ashby'))
  it('normalises and classifies', () => {
    const r = toRow(raw[0], co('ashby', 'sarvam', 'Sarvam AI'), new Date('2026-11-20T10:00:00Z'))
    expect(r).toMatchObject({ market: 'india', source: 'ashby', company: 'Sarvam AI' })
    expect(r!.posted_at).toBe('2026-11-19T08:33:12.352Z')
  })
  it('rejects a posting dated in the future by more than a day', () => {
    expect(toRow(raw[0], co('ashby', 'sarvam', 'Sarvam AI'), new Date('2026-11-01T00:00:00Z'))).toBeNull()
  })
})

describe('pre-filter', () => {
  it('drops stale, non-PM and undated postings before any text work', () => {
    const now = new Date('2026-11-11T08:00:00Z')
    const keep = keepFor(now)
    expect(keep('Senior Product Manager', '2026-11-10T00:00:00Z')).toBe(true)
    expect(keep('Senior Product Manager', '2026-09-01T00:00:00Z')).toBe(false)
    expect(keep('Software Engineer', '2026-11-10T00:00:00Z')).toBe(false)
    expect(keep('Product Manager', null)).toBe(false)
  })
  it('normalises only what passes the filter', () => {
    const now = new Date('2026-11-11T08:00:00Z')
    expect(normalize('greenhouse', fx('greenhouse'), keepFor(now)).map((r) => r.sourceId)).toHaveLength(1)
    expect(normalize('greenhouse', { jobs: [{ id: 1, title: 'Product Manager', first_published: '2026-11-10T00:00:00Z', location: { name: 'Remote - USA' }, absolute_url: 'https://x' }] })[0].description).toBe('')
  })
})
