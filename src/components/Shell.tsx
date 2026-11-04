import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useApp } from '../state/app'
import { Icon, type IconName } from './Icon'
import { Logo, LogoMark } from './Logo'
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
  { to: '/account', label: 'Account', icon: 'user', paid: false },
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
  const planLabel = ent.active ? (ent.plan === 'lifetime' ? 'Lifetime member' : `Pro · until ${formatDate(ent.expiresAt)}`) : 'Free plan'
  return (
    <>
      {!online && <div className="offline">You’re offline. Your resume edits are saved on this device.</div>}
      <div className="shell">
        <aside className="rail" aria-label="Primary">
          <Link to="/" className="logo" aria-label="ProductRez home">
            <Logo />
          </Link>
          <button className="cmdk-btn" onClick={() => setCmd(true)} aria-label="Open command palette">
            <Icon name="filter" size={15} /> Search <kbd>⌘K</kbd>
          </button>
          <div className="nav-label">Workspace</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon name={n.icon} />
              {n.label}
              {n.paid && !ent.active && <Icon name="lock" size={14} className="lock" />}
            </NavLink>
          ))}
          <div className="spacer" />
          <div className="plan-chip">
            <b>{planLabel}</b>
            {!ent.active && (
              <p className="muted" style={{ fontSize: '0.8rem', margin: '4px 0 8px' }}>
                Unlock the Writer, Jobs and Learn.
              </p>
            )}
            {!ent.active && (
              <Link to="/pricing" className="btn sm block">
                See plans
              </Link>
            )}
            {!user && (
              <button className="btn sm ghost block" style={{ marginTop: 8 }} onClick={() => openAuth()}>
                Sign in
              </button>
            )}
          </div>
          {api?.mode === 'demo' && (
            <span className="chip warn" title="No backend configured: data is stored in this browser only">
              demo mode
            </span>
          )}
        </aside>
        <div>
          <header className="topbar">
            <Link to="/" aria-label="ProductRez home">
              <LogoMark size={32} />
            </Link>
            <b style={{ fontFamily: 'var(--font-display)' }}>{NAV.find((n) => loc.pathname.startsWith(n.to))?.label ?? 'ProductRez'}</b>
            {user ? (
              <Link to="/account" className="chip">
                {ent.active ? 'Pro' : 'Free'}
              </Link>
            ) : (
              <button className="btn sm" onClick={() => openAuth()}>
                Sign in
              </button>
            )}
          </header>
          <main className="main" id="main">
            <Outlet />
          </main>
        </div>
      </div>
      <nav className="tabbar" aria-label="Primary mobile">
        {NAV.map((n) => (
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
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}
