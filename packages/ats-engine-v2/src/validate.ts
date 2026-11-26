import { parseResume } from './parser/parse.ts'

export type ResumeCheck =
  | { ok: true }
  | { ok: false; reason: 'too_short' | 'not_resume'; message: string }

/** Cheap gate run before consuming a free score: is this plausibly a resume? */
export function checkResume(text: string): ResumeCheck {
  const p = parseResume(text)
  const bullets =
    p.data.experience.reduce((n, e) => n + e.bullets.length, 0) +
    p.data.projects.reduce((n, e) => n + (e.bullets?.length ?? 0), 0)
  if (p.wordCount < 60) {
    return {
      ok: false,
      reason: 'too_short',
      message: `Only ${p.wordCount} words detected. A resume typically has 200+ words. Paste full text or upload a text-selectable PDF.`,
    }
  }
  const resumeLike = p.sectionsFound.length >= 2 || p.data.experience.length >= 1 || bullets >= 3
  if (!resumeLike) {
    return {
      ok: false,
      reason: 'not_resume',
      message: 'This does not look like a resume (no experience, education, or skills sections detected).',
    }
  }
  return { ok: true }
}
