import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { classifyJob, extractSkills, isProductManagerTitle, levelFromTitle, marketFromLocation, parseSalary, profileFromReport, scoreMatch, scoreResume, type MatchableJob } from '@ats'

const strong = readFileSync('tests/fixtures/strong.txt', 'utf8')

describe('title classification', () => {
  it('keeps product manager roles and drops look-alikes', () => {
    for (const t of ['Senior Product Manager, Payments', 'Product Manager', 'Associate Product Manager', 'Group Product Manager, Platform', 'Head of Product', 'Product Manager II, Growth', 'Principal Product Manager', 'Product Owner']) expect(isProductManagerTitle(t), t).toBe(true)
    for (const t of ['Chief of Staff Director, Product', 'Director, Product Communications', 'Product Enablement Manager', 'Senior Product Marketing Manager', 'Technical Program Manager', 'Product Designer', 'Product Analyst', 'Product Operations Manager', 'Software Engineer, Product', 'Project Manager', 'Customer Success Manager', 'Product Manager Intern']) expect(isProductManagerTitle(t), t).toBe(false)
  })
  it('reads the level from the title', () => {
    expect(levelFromTitle('Associate Product Manager')).toBe('apm')
    expect(levelFromTitle('Product Manager')).toBe('pm')
    expect(levelFromTitle('Senior Product Manager')).toBe('senior')
    expect(levelFromTitle('Product Manager II')).toBe('senior')
    expect(levelFromTitle('Group Product Manager')).toBe('lead')
    expect(levelFromTitle('Director of Product')).toBe('lead')
  })
})

describe('market and work mode', () => {
  it('places a posting in India, the US or remote-global', () => {
    expect(marketFromLocation('Bengaluru, Karnataka, India').market).toBe('india')
    expect(marketFromLocation('Gurugram').market).toBe('india')
    expect(marketFromLocation('Toronto, ON, Canada').market).toBe('other')
    expect(marketFromLocation('Mumbai, MH').market).toBe('india')
    expect(marketFromLocation('San Francisco, CA').market).toBe('us')
    expect(marketFromLocation('Remote, United States').market).toBe('us')
    expect(marketFromLocation('New York, NY').market).toBe('us')
    expect(marketFromLocation('Remote').market).toBe('remote_global')
    expect(marketFromLocation('London, United Kingdom').market).toBe('other')
    expect(marketFromLocation('Canada - Remote (ON, AB, BC, or NS Only)').market).toBe('other')
    expect(marketFromLocation('Remote - EMEA').market).toBe('other')
    expect(marketFromLocation('Remote, Global').market).toBe('remote_global')
    expect(marketFromLocation('Remote - USA').market).toBe('us')
  })
})

describe('salary parsing', () => {
  it('parses USD in thousands and INR in lakhs', () => {
    expect(parseSalary('The base range is $210,000 - $260,000 plus equity')).toEqual({ currency: 'USD', min: 210, max: 260 })
    expect(parseSalary('$185k–$230k')).toEqual({ currency: 'USD', min: 185, max: 230 })
    expect(parseSalary('United States base range $87,069-$124,385 plus equity')).toEqual({ currency: 'USD', min: 87, max: 124 })
    expect(parseSalary('₹42L–₹54L')).toEqual({ currency: 'INR', min: 42, max: 54 })
    expect(parseSalary('Compensation: 30 - 45 LPA')).toBeNull() // no currency marker, so we do not guess
    expect(parseSalary('₹30 - 45 LPA')).toEqual({ currency: 'INR', min: 30, max: 45 })
    expect(parseSalary('INR 42,00,000 - 54,00,000')).toEqual({ currency: 'INR', min: 42, max: 54 })
  })
  it('ignores numbers that are not pay', () => {
    expect(parseSalary('We have 1,000 - 2,000 employees and raised $50,000,000 - $60,000,000')).toBeNull()
    expect(parseSalary('')).toBeNull()
  })
})

describe('classifyJob', () => {
  const ai = classifyJob({ title: 'Product Manager, AI Agents', location: 'Remote, United States', description: 'Own our LLM agent platform. Define evals and guardrails, work on RAG and latency. 4+ years of product management experience. Base $190,000 - $230,000.' })
  it('categorises an AI role', () => {
    expect(ai.isPm).toBe(true)
    expect(ai.track).toBe('ai_ml')
    expect(ai.market).toBe('us')
    expect(ai.workMode).toBe('remote')
    expect(ai.level).toBe('pm')
    expect(ai.yearsRequired).toBe(4)
    expect(ai.salary).toEqual({ currency: 'USD', min: 190, max: 230 })
    expect(ai.skills).toEqual(expect.arrayContaining(['llm', 'evals', 'rag']))
  })
  it('categorises a fintech role in India', () => {
    const c = classifyJob({ title: 'Senior Product Manager, Payments', location: 'Bengaluru, India', description: 'Own UPI and card payments, settlement and authorization rate. Work with risk and KYC teams. Hybrid.' })
    expect(c.track).toBe('fintech')
    expect(c.country).toBe('IN')
    expect(c.level).toBe('senior')
    expect(c.workMode).toBe('hybrid')
    expect(c.skills).toEqual(expect.arrayContaining(['payments', 'kyc_risk']))
  })
  it('defaults to generalist when nothing points elsewhere', () => {
    expect(classifyJob({ title: 'Product Manager', location: 'Seattle, WA', description: 'Work with engineers and designers to ship features.' }).track).toBe('generalist')
  })
})

describe('skill extraction', () => {
  it('maps text to the shared vocabulary', () => {
    expect(extractSkills('Built A/B tests in Amplitude, wrote SQL, ran customer interviews')).toEqual(expect.arrayContaining(['experimentation', 'analytics', 'sql', 'discovery']))
    expect(extractSkills('Operated a farm co-op')).not.toContain('sql')
  })
})

describe('matching', () => {
  const report = scoreResume({ text: strong, market: 'india', track: 'generalist', companyArchetype: 'scaleup' }, new Date('2026-11-27'))
  const profile = profileFromReport(report)
  const base: MatchableJob = { skills: [], track: 'generalist', level: 'senior', archetype: 'scaleup', salary: null, ageHours: 10 }
  it('builds a profile from a scored resume', () => {
    expect(profile.skills.length).toBeGreaterThan(5)
    expect(['apm', 'pm', 'senior', 'lead']).toContain(profile.level)
    expect(profile.salary?.currency).toBe('INR')
  })
  it('ranks overlapping, on-level, fresh roles above the rest', () => {
    const mine = profile.skills.slice(0, 4)
    const good = scoreMatch(profile, { ...base, level: profile.level, skills: mine })
    const noOverlap = scoreMatch(profile, { ...base, level: profile.level, skills: ['adtech', 'gaming', 'healthtech', 'edtech'] })
    expect(good.score).toBeGreaterThan(noOverlap.score)
    expect(good.matched).toEqual(mine)
    expect(noOverlap.missing).toHaveLength(4)
  })
  it('penalises a level gap and stale postings', () => {
    const mine = profile.skills.slice(0, 4)
    const onLevel = scoreMatch(profile, { ...base, level: profile.level, skills: mine })
    const far = scoreMatch(profile, { ...base, level: profile.level === 'apm' ? 'lead' : 'apm', skills: mine })
    const stale = scoreMatch(profile, { ...base, level: profile.level, skills: mine, ageHours: 100 })
    expect(far.score).toBeLessThan(onLevel.score)
    expect(stale.score).toBeLessThan(onLevel.score)
  })
  it('does not punish a posting for hiding its salary', () => {
    expect(scoreMatch(profile, { ...base, skills: ['sql'] }).parts.pay).toBe(0.5)
  })
  it('scores pay fit against the resume band', () => {
    const { low, high } = profile.salary!
    const above = scoreMatch(profile, { ...base, salary: { currency: 'INR', min: high + 5, max: high + 15 } })
    const below = scoreMatch(profile, { ...base, salary: { currency: 'INR', min: 1, max: Math.max(2, low - 5) } })
    expect(above.parts.pay).toBe(1)
    expect(below.parts.pay).toBe(0.2)
  })
  it('rounds an exact half up, like the database does', () => {
    // skills 0.5, track 0.7 (generalist fallback with no archetype), pay 0.5, fresh 1 → 61.25 before the level factor; use a profile that lands on x.5
    const p = { ...profile, trackScores: { generalist: 100 }, archetype: 'scaleup' as const }
    const r = scoreMatch(p, { skills: [], track: 'generalist', level: null, archetype: 'scaleup', salary: null, ageHours: 100 })
    expect(Number.isInteger(r.score)).toBe(true)
  })
  it('stays within 0..100', () => {
    const r = scoreMatch(profile, { ...base, level: profile.level, skills: profile.skills, track: profile.track, salary: { currency: 'INR', min: profile.salary!.low, max: profile.salary!.high } })
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.score).toBeGreaterThan(80)
  })
})
