import { parseResume } from './parse.ts'

export type ResumeCheck = { ok: true } | { ok: false; reason: 'too_short' | 'not_resume'; message: string }

/** Cheap gate run BEFORE a free score is spent: is this plausibly a resume at all? */
export function checkResume(text: string): ResumeCheck {
  const p = parseResume(text)
  const bullets = p.data.experience.reduce((n, e) => n + e.bullets.length, 0) + p.data.projects.reduce((n, e) => n + (e.bullets?.length ?? 0), 0)
  if (p.wordCount < 60)
    return { ok: false, reason: 'too_short', message: `That is only ${p.wordCount} words. A resume usually has 200+. Paste the full text (or upload the PDF) so we can score it properly.` }
  const resumeLike = p.sectionsFound.length >= 2 || p.data.experience.length >= 1 || bullets >= 3
  if (!resumeLike)
    return { ok: false, reason: 'not_resume', message: 'This does not look like a resume (no experience, education or skills sections found). Your free score was not used, so try again with your resume.' }
  return { ok: true }
}
