import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useApp } from '../state/app'
import { Icon, type IconName } from './Icon'
import { LogoMark } from './Logo'
import { AuthModal } from './AuthModal'
import { InstallPrompt } from './InstallPrompt'
import { Onboarding } from './Onboarding'
import { CommandPalette } from './CommandPalette'
import { formatDate } from '../lib/util'

const NAV: { to: string; label: string; icon: IconName; paid: boolean }[] = [
  { to: '/score', label: 'Resume Score', icon: 'score', paid: false },
  { to: '/writer', label: 'Resume Writer', icon: 'pen', paid: true },
  { to: '/jobs', label: 'Fresh Jobs', icon: 'briefcase', paid: true },
  { to: '/learn', label: 'Learn', icon: 'book', paid: true },
]

function useOnline() {
  const [on, setOn] = useState(navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true)
    const b = () => setOn(false)
    window.addEventListener('online', a)
    window.addEventListener('offline', b)
    return () => {
      window.removeEventListener('online', a)
      window.removeEventListener('offline', b)
    }
  }, [])
  return on
}

export function Shell() {
  const { user, ent, openAuth, api, toasts } = useApp()
  const online = useOnline()
  const loc = useLocation()
  const [cmd, setCmd] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmd((c) => !c)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const idx = NAV.findIndex((n) => loc.pathname.startsWith(n.to))
  const planLabel = ent.active ? (ent.plan === 'lifetime' ? 'Lifetime' : `Pro until ${formatDate(ent.expiresAt)}`) : 'Free plan'
  return (
    <>
      {!online && <div className="offline">You’re offline. Your resume edits are saved on this device.</div>}
      <div className="shell">
        <aside className="rail" aria-label="Primary">
          <Link to="/" className="logo" aria-label="ProductRez home"><LogoMark size={36} /></Link>
          <nav className="rail-nav">
            <span className="rail-ind" style={{ ['--y' as string]: `${Math.max(idx, 0) * 48}px`, opacity: idx < 0 ? 0 : 1 }} />
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label={n.label}>
                <Icon name={n.icon} size={20} />
                {n.paid && !ent.active && <Icon name="lock" size={10} className="lock" />}
                <span className="lbl">{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="spacer" />
          <button className="nav-link" onClick={() => setCmd(true)} aria-label="Open command palette"><Icon name="filter" size={19} /><span className="lbl">Search <kbd>⌘K</kbd></span></button>
          {!ent.active && <Link to="/pricing" className="nav-link up" aria-label="Upgrade"><Icon name="zap" size={19} /><span className="lbl">Upgrade</span></Link>}
          {user ? (
            <Link to="/account" className="rail-avatar" aria-label="Account">{(user.email[0] ?? 'U').toUpperCase()}<span className="lbl">{user.email}<small>{planLabel}</small></span></Link>
          ) : (
            <button className="nav-link" onClick={() => openAuth()} aria-label="Sign in"><Icon name="user" size={19} /><span className="lbl">Sign in</span></button>
          )}
          {api?.mode === 'demo' && <span className="demo-dot" title="Demo mode: data stays in this browser" />}
        </aside>
        <div className="shell-main">
          <header className="topbar">
            <Link to="/" aria-label="ProductRez home"><LogoMark size={30} /></Link>
            <b style={{ fontWeight: 500 }}>{NAV.find((n) => loc.pathname.startsWith(n.to))?.label ?? 'ProductRez'}</b>
            {user ? <Link to="/account" className="chip">{ent.active ? 'Pro' : 'Free'}</Link> : <button className="btn sm" onClick={() => openAuth()}>Sign in</button>}
          </header>
          <main className="main" id="main" key={loc.pathname}>
            <Outlet />
          </main>
        </div>
      </div>
      <nav className="tabbar" aria-label="Primary mobile">
        {[...NAV, { to: '/account', label: 'Account', icon: 'user' as IconName, paid: false }].map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={n.icon} size={22} />
            {n.label.replace('Resume ', '').replace('Fresh ', '')}
          </NavLink>
        ))}
      </nav>
      <AuthModal />
      <CommandPalette open={cmd} onClose={() => setCmd(false)} />
      <Onboarding />
      <InstallPrompt />
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>{t.msg}</div>)}
      </div>
    </>
  )
}
