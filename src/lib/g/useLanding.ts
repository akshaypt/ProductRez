import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../state/app'
import { analysisStore } from './store'
import { SCAN_MS, scanPlan, type ScanStage } from './scan'
import { readResume, ResumeReadError, runAnalysis, suggest, type LoadedResume, type Picks } from './analyze'

const THEME_KEY = 'productrez_theme'
const read = () => { try { return localStorage.getItem(THEME_KEY) } catch { return null } }
const write = (v: string) => { try { localStorage.setItem(THEME_KEY, v) } catch { /* private mode */ } }

export type Theme = 'light' | 'dark'

export function useTheme(): [Theme, () => void] {
  const mql = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
  const [theme, setTheme] = useState<Theme>(() => (read() as Theme | null) ?? (mql?.matches ? 'dark' : 'light'))
  useEffect(() => {
    if (!mql) return
    const on = (e: MediaQueryListEvent) => { if (!read()) setTheme(e.matches ? 'dark' : 'light') }
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [mql])
  return [theme, () => setTheme((t) => { const n = t === 'dark' ? 'light' : 'dark'; write(n); return n })]
}

export function useMedia(q: string): boolean {
  const [m, setM] = useState(() => (typeof matchMedia === 'function' ? matchMedia(q).matches : false))
  useEffect(() => {
    const l = matchMedia(q)
    const on = () => setM(l.matches)
    on()
    l.addEventListener('change', on)
    return () => l.removeEventListener('change', on)
  }, [q])
  return m
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useLanding() {
  const { user, openAuth, prefs, setPrefs } = useApp()
  const go = useNavigate()
  const [loaded, setLoaded] = useState<LoadedResume | null>(null)
  const [reading, setReading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [picks, setPicks] = useState<Picks>({ level: null, track: null, company: null, currency: prefs.currency })
  const [autofilled, setAutofilled] = useState(false)
  // A currency the person chooses by hand is remembered for onboarding and the account. A detected one is not.
  const setCurrency = useCallback((currency: Picks['currency']) => { setPicks((p) => ({ ...p, currency })); if (currency) setPrefs({ currency }) }, [setPrefs])
  const [jd, setJd] = useState('')
  const [jdOpen, setJdOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [nudge, setNudge] = useState(0)
  const [scan, setScan] = useState<{ open: boolean; plan: ScanStage[] | null }>({ open: false, plan: null })
  const tt = useRef<number | undefined>(undefined)

  const say = useCallback((msg: string) => {
    setToast(msg); setNudge((n) => n + 1)
    window.clearTimeout(tt.current)
    tt.current = window.setTimeout(() => setToast(''), 2800)
  }, [])
  const nudgeOnly = useCallback(() => setNudge((n) => n + 1), [])

  const onFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return
    setFileError(''); setReading(true); setLoaded(null); setAutofilled(false)
    try {
      const r = await readResume(file)
      const s = await suggest(r)
      if (s.message) { setFileError(s.message); return }
      setLoaded(r)
      setPicks((p) => ({ level: p.level ?? s.picks.level, track: p.track ?? s.picks.track, company: p.company ?? 'Scale-ups', currency: s.picks.currency ?? p.currency }))
      setAutofilled(true)
    } catch (e) {
      setFileError(e instanceof ResumeReadError ? e.message : 'We could not read that file. Try a text-based PDF or DOCX.')
    } finally {
      setReading(false)
    }
  }, [])

  const review = useCallback(async () => {
    if (!loaded) { say(fileError ? 'Fix the file above, then try again.' : 'Please upload your resume first.'); return }
    if (!picks.currency) { say('Pick the currency for pay first: tap the last chip.'); return }
    try {
      // The score is computed at once. The review then plays for a full read so each stage can show what it found.
      const a = await runAnalysis(loaded, picks, jd)
      setScan({ open: true, plan: scanPlan(a.report) })
      await sleep(SCAN_MS + 400)
      analysisStore.set(a)
      setScan({ open: false, plan: null })
      go('/report')
    } catch {
      setScan({ open: false, plan: null })
      say('Something went wrong reading that resume. Please try another file.')
    }
  }, [loaded, picks, jd, fileError, say, go])

  return { user, openAuth, go, loaded, reading, fileError, picks, setPicks, setCurrency, autofilled, jd, setJd, jdOpen, setJdOpen, toast, nudge, nudgeOnly, onFile, review, scan, say }
}
