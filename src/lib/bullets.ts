/** Flags that mean a bullet has a real problem to fix. A scope-only bullet without a number, or one that lacks a before/after, is not a problem. */
const PROBLEM = new Set(['no-metric', 'weak-verb', 'no-verb', 'activity-only', 'passive', 'missing-guardrail', 'first-person'])
export const isWeakBullet = (b: { flags: readonly string[] }): boolean => b.flags.some((f) => PROBLEM.has(f))

/** "+3" for a gain of about 3 points; "<1" when it is under half a point. Gains are estimates, so no false precision. */
export const fmtGain = (g: number): string => (g < 0.5 ? '<1' : `+${Math.max(1, Math.round(g))}`)
