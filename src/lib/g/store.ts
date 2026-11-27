import type { Analysis } from './analyze'

/** The analysis lives in memory only: a refresh clears it, and nothing about a resume is persisted or sent anywhere. */
let current: Analysis | null = null
const subs = new Set<() => void>()
export const analysisStore = {
  get: () => current,
  set(a: Analysis | null) { current = a; subs.forEach((f) => f()) },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
}
