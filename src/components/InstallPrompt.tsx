import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { LogoMark } from './Logo'
import { store } from '../lib/util'

interface BIPEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches)
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault()
      setEvt(e as BIPEvent)
    }
    const done = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', h)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', h)
      window.removeEventListener('appinstalled', done)
    }
  }, [])
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !installed
  return {
    canInstall: !!evt && !installed,
    ios,
    installed,
    install: async () => {
      if (!evt) return
      await evt.prompt()
      await evt.userChoice
      setEvt(null)
    },
  }
}

export function InstallPrompt() {
  const { canInstall, install } = useInstall()
  const [hidden, setHidden] = useState(() => store.get('pr.install.dismissed', 0) > Date.now() - 14 * 86400000)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 20000)
    return () => clearTimeout(t)
  }, [])
  if (!canInstall || hidden || !show) return null
  return (
    <div className="card install" role="dialog" aria-label="Install ProductRez">
      <LogoMark size={40} />
      <div style={{ flex: 1 }}>
        <b>Install ProductRez</b>
        <div className="muted" style={{ fontSize: '0.85rem' }}>Faster, full-screen, works offline.</div>
      </div>
      <button className="btn sm" onClick={install}>
        Install
      </button>
      <button
        className="x"
        style={{ position: 'static', width: 30, height: 30 }}
        aria-label="Dismiss"
        onClick={() => {
          store.set('pr.install.dismissed', Date.now())
          setHidden(true)
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}
