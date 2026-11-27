import { analysisStore } from './store'
import { LEVELS } from './data'
import { guessRegion, store } from '../util'

/**
 * Carries a just-scored resume across sign-in. Sign-in can reload the page (Google, an emailed link), which clears the
 * in-memory analysis, so a small hand-off is kept for two hours, only once the person chooses to sign in, and is
 * deleted the moment it is used.
 */
const KEY = 'pr.handoff'
const TTL = 2 * 60 * 60 * 1000

interface Handoff { ts: number; text: string; level: string | null; track: string | null; company: string | null; market: string }

export function saveHandoffFromAnalysis() {
  const a = analysisStore.get()
  if (!a) return
  const h: Handoff = { ts: Date.now(), text: a.resume.text, level: a.picks.level, track: a.picks.track, company: a.picks.company, market: a.report.contextUsed.market }
  store.set(KEY, h)
}

/** Reads and deletes the hand-off. Null when there is none or it has expired. */
export function takeHandoff(): Handoff | null {
  const h = store.get<Handoff | null>(KEY, null)
  if (h) store.set(KEY, null)
  return h && Date.now() - h.ts < TTL ? h : null
}

export function stageFor(levelLabel: string | null): 'pm' | 'senior' {
  const v = LEVELS.find((l) => l.label === levelLabel)?.v
  return v === 'senior' || v === 'lead' ? 'senior' : 'pm'
}

export function regionFor(market: string): 'IN' | 'US' {
  return market === 'india' ? 'IN' : market === 'us' ? 'US' : guessRegion()
}
