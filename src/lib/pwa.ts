import { registerSW } from 'virtual:pwa-register'

/**
 * A new build is downloaded in the background but never swapped in by itself: a forced reload a few seconds after the page loads
 * (which is what the plugin's "autoUpdate" mode does) throws away work in progress, such as a resume check that is not saved yet.
 * The person applies the update from the banner, or it takes effect the next time all tabs are closed.
 */
type Listener = (ready: boolean) => void
let ready = false
let apply: (() => void) | null = null
const listeners = new Set<Listener>()
const set = (v: boolean) => { ready = v; listeners.forEach((l) => l(v)) }

export function startPwa() {
  const update = registerSW({ immediate: true, onNeedRefresh() { set(true) } })
  apply = () => { void update(true) }
}
export const updateReady = () => ready
export const applyUpdate = () => apply?.()
export const dismissUpdate = () => set(false)
export function onUpdate(l: Listener) { listeners.add(l); return () => { listeners.delete(l) } }
