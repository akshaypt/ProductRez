import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { checkResume } from '../supabase/functions/_shared/scoring/index'

describe('checkResume', () => {
  it('accepts the strong and weak fixtures', () => {
    expect(checkResume(readFileSync('tests/fixtures/strong.txt', 'utf8')).ok).toBe(true)
    expect(checkResume(readFileSync('tests/fixtures/weak.txt', 'utf8')).ok).toBe(true)
  })
  it('rejects very short text', () => {
    const r = checkResume('hello world')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('too_short')
  })
  it('rejects long non-resume prose without spending a score', () => {
    const r = checkResume('The quick brown fox jumps over the lazy dog. '.repeat(80))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not_resume')
  })
})
