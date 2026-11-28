import type { Picks } from './analyze'

/**
 * What the form shows after a new resume is read. A pick the person changed by hand is kept; a pick the app filled in from an earlier
 * resume is replaced by the new suggestion. Without this, the first resume's picks stuck for good and a second upload never re-filled them.
 */
export function mergePicks(prev: Picks, auto: Picks | null, next: Picks): Picks {
  const keep = (id: 'level' | 'track' | 'company') => (prev[id] !== null && !(auto && prev[id] === auto[id]) ? prev[id] : next[id])
  return { level: keep('level'), track: keep('track'), company: keep('company'), currency: next.currency ?? prev.currency }
}
