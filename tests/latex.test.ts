import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseResume } from '@scoring'
import { buildLatex, TEMPLATES } from '@latex'
import { escapeLatex } from '@latex'

const hasTex = spawnSync('pdflatex', ['--version']).status === 0
const strong = parseResume(readFileSync('tests/fixtures/strong.txt', 'utf8')).data

describe('escapeLatex', () => {
  it('escapes specials and maps typography', () => {
    expect(escapeLatex('R&D 50% $5 #1 a_b {x} ~ ^')).toBe('R\\&D 50\\% \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{}')
    expect(escapeLatex('“Hi” – ’ok’ …')).toContain('``Hi\'\'')
    expect(escapeLatex('₹5 Cr')).toBe('INR\\,5 Cr')
    expect(escapeLatex('日本語 café')).toBe(' café')
  })
})

describe.skipIf(!hasTex)('pdflatex builds', () => {
  mkdirSync('tests/out', { recursive: true })
  const stress = structuredClone(strong)
  stress.basics.name = 'Zoë O’Brien-Müller'
  stress.experience[0].bullets.push('Grew revenue 25% & cut costs by ₹4 Cr using A/B tests for R&D_team {pilot} #1 ~ ^ 100% \\ of "users"')
  stress.projects = [{ id: 'p1', name: 'PM Tool', tag: 'Side project', link: 'github.com/a_b/c', bullets: ['Built **bold claim** in 3 weeks with 1,200 users'] }]
  for (const t of TEMPLATES) {
    for (const [label, data] of [['strong', strong], ['stress', stress]] as const) {
      it(`${t.id} compiles (${label}) to one clean page`, () => {
        const tex = buildLatex(data, t.id, { paper: 'letter', boldMetrics: true })
        const f = `tests/out/${t.id}-${label}`
        writeFileSync(`${f}.tex`, tex)
        const r = spawnSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', 'tests/out', `${f}.tex`], { encoding: 'utf8' })
        expect(r.status, r.stdout.slice(-1500)).toBe(0)
        const txt = execFileSync('pdftotext', ['-layout', `${f}.pdf`, '-'], { encoding: 'utf8' })
        expect(txt).toContain('Senior Product Manager')
        expect(txt).toMatch(/priya\.nair@example\.com/)
        expect(txt).not.toMatch(/\(cid:|�/)
        const info = execFileSync('pdfinfo', [`${f}.pdf`], { encoding: 'utf8' })
        const pages = Number(info.match(/Pages:\s+(\d+)/)![1])
        expect(pages).toBeLessThanOrEqual(1)
      })
    }
  }
})
