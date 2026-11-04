import Lenis from 'lenis'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** One easing curve for every transition: crisp start, long soft landing. */
export const EASE = 'cubic-bezier(0.165, 0.84, 0.44, 1)'

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/* ------------------------------------------------------------------ shared scroll ticker */
type Tick = () => void
const subs = new Set<Tick>()
let scheduled = false
let bound = false
const run = () => {
  scheduled = false
  subs.forEach((f) => f())
}
const schedule = () => {
  if (!scheduled) {
    scheduled = true
    requestAnimationFrame(run)
  }
}
export function onScrollFrame(fn: Tick): () => void {
  subs.add(fn)
  if (!bound) {
    bound = true
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
  }
  schedule()
  return () => void subs.delete(fn)
}

/* ------------------------------------------------------------------ smooth scrolling (marketing only) */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || reducedMotion() || coarse()) return
    const lenis = new Lenis({ duration: 1.15, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, anchors: true })
    let raf = 0
    const loop = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [enabled])
}

/* ------------------------------------------------------------------ in-view */
export function useInView<T extends Element>(opts: { once?: boolean; threshold?: number; margin?: string } = {}): [RefObject<T | null>, boolean] {
  const { once = true, threshold = 0.2, margin = '0px 0px -8% 0px' } = opts
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window) || reducedMotion()) return void setSeen(true)
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? (setSeen(true), once && io.disconnect()) : !once && setSeen(false)), { threshold, rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [once, threshold, margin])
  return [ref, seen]
}

/* ------------------------------------------------------------------ scroll-linked CSS variable */
export type ScrollMode = 'through' | 'enter' | 'sticky' | 'cover'
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Writes --p (0..1) on the element as the page scrolls, with no React re-render.
 *  through: 0 as it enters from the bottom, 1 as it leaves the top
 *  enter:   0 when its top is at the viewport bottom, 1 when its top reaches 30% from the top
 *  sticky:  progress through a tall pinned container
 *  cover:   how much the *next* sibling has slid over this element (for stacked cards)
 */
export function useScrollVar(ref: RefObject<HTMLElement | null>, mode: ScrollMode = 'through') {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) {
      el.style.setProperty('--p', mode === 'cover' ? '0' : '1')
      return
    }
    const off = onScrollFrame(() => {
      const vh = window.innerHeight
      const r = el.getBoundingClientRect()
      let p = 0
      if (mode === 'through') p = clamp01((vh - r.top) / (vh + r.height))
      else if (mode === 'enter') p = clamp01((vh - r.top) / (vh * 0.7))
      else if (mode === 'sticky') p = clamp01(-r.top / Math.max(1, r.height - vh))
      else {
        const next = el.nextElementSibling as HTMLElement | null
        p = next ? clamp01(1 - next.getBoundingClientRect().top / vh) : 0
      }
      el.style.setProperty('--p', p.toFixed(4))
    })
    return off
  }, [ref, mode])
}

/* ------------------------------------------------------------------ nav visibility */
export function useScrollDirection() {
  const [state, setState] = useState({ hidden: false, scrolled: false })
  useEffect(() => {
    let last = window.scrollY
    return onScrollFrame(() => {
      const y = window.scrollY
      const dy = y - last
      if (Math.abs(dy) > 6) {
        setState((s) => (s.hidden === dy > 0 && y > 200 ? s : { ...s, hidden: dy > 0 && y > 200 }))
        last = y
      }
      setState((s) => (s.scrolled === y > 8 ? s : { ...s, scrolled: y > 8 }))
    })
  }, [])
  return state
}

/* ------------------------------------------------------------------ count-up */
export function useCountUp(target: number, run = true, ms = 1300) {
  const [v, setV] = useState(reducedMotion() ? target : 0)
  useEffect(() => {
    if (!run) return
    if (reducedMotion()) return void setV(target)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(target * (1 - Math.pow(1 - p, 4)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return v
}

/* ------------------------------------------------------------------ pointer effects (spotlight + magnetic CTAs) */
const SPOT = '.card,.wcard,.rz-stat,.topic,.plan,.tm-card,.res,.aw-card,.rz-upload,.ticket,.path'
const MAG = '.rz .btn.lg'
export function installPointerFx(): () => void {
  if (typeof window === 'undefined' || reducedMotion() || coarse()) return () => {}
  const move = (e: PointerEvent) => {
    const el = e.target as Element | null
    const t = el?.closest?.(SPOT) as HTMLElement | null
    if (t) {
      const r = t.getBoundingClientRect()
      t.style.setProperty('--mx', `${e.clientX - r.left}px`)
      t.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    const m = el?.closest?.(MAG) as HTMLElement | null
    if (m) {
      const r = m.getBoundingClientRect()
      m.style.setProperty('--tx', `${((e.clientX - (r.left + r.width / 2)) * 0.16).toFixed(1)}px`)
      m.style.setProperty('--ty', `${((e.clientY - (r.top + r.height / 2)) * 0.28).toFixed(1)}px`)
    }
  }
  const out = (e: PointerEvent) => {
    const m = (e.target as Element | null)?.closest?.(MAG) as HTMLElement | null
    if (m && !m.contains(e.relatedTarget as Node | null)) {
      m.style.setProperty('--tx', '0px')
      m.style.setProperty('--ty', '0px')
    }
  }
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerout', out, { passive: true })
  return () => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerout', out)
  }
}
