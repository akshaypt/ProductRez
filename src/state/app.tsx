import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getApi } from '../lib/api'
import type { Api, AppUser, Entitlement } from '../lib/types'
import { currencyForMarket, store, type Currency } from '../lib/util'
import { stageFor, takeHandoff } from '../lib/g/handoff'

export interface Prefs {
  /** Chosen by the person, or read from their resume. Null until one of those happens; never guessed. */
  currency: Currency | null
  stage: 'aspiring' | 'pm' | 'senior'
  onboarded: boolean
  theme: 'system' | 'light' | 'dark'
}

interface Ctx {
  api: Api | null
  ready: boolean
  user: AppUser | null
  ent: Entitlement
  refresh: () => Promise<void>
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  authOpen: boolean
  openAuth: (reason?: string) => void
  closeAuth: () => void
  authReason: string
  toast: (msg: string, kind?: 'ok' | 'err') => void
  toasts: { id: number; msg: string; kind: 'ok' | 'err' }[]
}

const NONE: Entitlement = { active: false, plan: 'none', expiresAt: null }
const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<Api | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [ent, setEnt] = useState<Entitlement>(NONE)
  const [ready, setReady] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authReason, setAuthReason] = useState('')
  const [toasts, setToasts] = useState<Ctx['toasts']>([])
  const [prefs, setPrefsState] = useState<Prefs>(() => {
    const { region: _old, ...saved } = store.get<Partial<Prefs> & { region?: string }>('pr.prefs', {})
    return { currency: null, stage: 'pm', onboarded: false, theme: 'dark', ...saved }
  })

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p }
      store.set('pr.prefs', next)
      return next
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (prefs.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', prefs.theme)
  }, [prefs.theme])

  // Someone who was scored on the landing page and then signs in has already told us their level, focus and market,
  // and we have their resume. Keep that check against the account (one per account, a new upload replaces it) and, for a
  // first-time user, complete setup and seed the Writer instead of asking again. Returning users keep their settings.
  const applyHandoff = useCallback((a: Api) => {
    const h = takeHandoff()
    if (!h) return
    // Deferred: supabase-js can deadlock if you call it from inside its own auth-change callback.
    setTimeout(() => a.saveLatestScan({ fileName: h.fileName, picks: { level: h.level, track: h.track, company: h.company }, report: h.report }).catch(() => {}), 0)
    const saved = store.get<Prefs | null>('pr.prefs', null)
    if (saved?.onboarded) return
    setPrefs({ stage: stageFor(h.level), currency: currencyForMarket(h.market), onboarded: true })
    store.set('pr.target', { level: h.level, track: h.track, company: h.company })
    import('@scoring').then(({ parseResume }) => store.set('pr.writer.import', parseResume(h.text).data)).catch(() => {})
  }, [setPrefs])

  const loadEnt = useCallback(async (a: Api, u: AppUser | null) => {
    setEnt(u ? await a.getEntitlement().catch(() => NONE) : NONE)
  }, [])

  useEffect(() => {
    let off = () => {}
    let alive = true
    getApi().then(async (a) => {
      if (!alive) return
      setApi(a)
      const u = await a.getUser()
      if (u) applyHandoff(a)
      setUser(u)
      await loadEnt(a, u)
      setReady(true)
      off = a.onAuthChange(async (nu) => {
        if (nu) applyHandoff(a)
        setUser(nu)
        await loadEnt(a, nu)
      })
    })
    return () => {
      alive = false
      off()
    }
  }, [loadEnt, applyHandoff])

  const refresh = useCallback(async () => {
    if (api) await loadEnt(api, await api.getUser())
  }, [api, loadEnt])

  const toast = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      api,
      ready,
      user,
      ent,
      refresh,
      prefs,
      setPrefs,
      authOpen,
      authReason,
      openAuth: (reason = '') => {
        setAuthReason(reason)
        setAuthOpen(true)
      },
      closeAuth: () => setAuthOpen(false),
      toast,
      toasts,
    }),
    [api, ready, user, ent, refresh, prefs, setPrefs, authOpen, authReason, toast, toasts],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
