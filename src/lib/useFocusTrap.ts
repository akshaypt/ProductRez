import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keeps keyboard focus inside a dialog while it is open and hands it back to whatever opened it. */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!active) return
    const opener = document.activeElement as HTMLElement | null
    const root = ref.current
    const items = () => (root ? ([...root.querySelectorAll(FOCUSABLE)] as HTMLElement[]).filter((e) => e.offsetParent !== null || e === document.activeElement) : [])
    const t = setTimeout(() => {
      if (root && !root.contains(document.activeElement)) (items()[0] ?? root).focus()
    }, 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !root) return
      const list = items()
      if (!list.length) return e.preventDefault()
      const first = list[0]
      const last = list[list.length - 1]
      const cur = document.activeElement as HTMLElement | null
      if (!cur || !root.contains(cur)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [active])
  return ref
}
