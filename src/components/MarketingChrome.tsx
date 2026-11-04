import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/app'
import { Logo } from './Logo'
import { AuthModal } from './AuthModal'

export function MkNav({ onHome = false }: { onHome?: boolean }) {
  const { user, ready, openAuth } = useApp()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  const h = (id: string) => (onHome ? `#${id}` : `/#${id}`)
  return (
    <header className={`mk-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="mk-nav-in">
        <Link to="/" aria-label="ProductRez home"><Logo /></Link>
        <nav aria-label="Marketing">
          <a className="t" href={h('product')}>Product</a>
          <a className="t" href={h('templates')}>Templates</a>
          <Link className="t" to="/methodology">How scoring works</Link>
          <a className="t" href={h('pricing')}>Pricing</a>
          {ready && user ? <Link className="btn sm" to="/score">Open app</Link> : <><button className="t" style={{ background: 'none', border: 0, cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-2)' }} onClick={() => openAuth()}>Sign in</button><button className="btn sm" onClick={() => openAuth('Create a free account. Your first resume score is on us.')}>Get started</button></>}
        </nav>
      </div>
    </header>
  )
}

export function MkFooter() {
  return (
    <footer className="footer">
      <div className="footer-in">
        <div style={{ maxWidth: 340 }}>
          <Logo size={26} />
          <p style={{ marginTop: 12 }}>The career platform for product managers and aspiring PMs in the US and India.</p>
          <p style={{ marginTop: 8 }}>Not affiliated with LinkedIn. Job listings link to their original postings.</p>
        </div>
        <div className="cols">
          <div><b style={{ color: 'var(--text)' }}>Product</b><Link to="/score">Resume Score</Link><Link to="/writer">Resume Writer</Link><Link to="/jobs">Fresh Jobs</Link><Link to="/learn">Learn</Link></div>
          <div><b style={{ color: 'var(--text)' }}>Trust</b><Link to="/methodology">How scoring works</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/pricing">Pricing</Link></div>
        </div>
      </div>
    </footer>
  )
}

export function LegalPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-wrap">
      <div className="mk-glow" />
      <MkNav />
      <main className="section prose" style={{ paddingTop: 'clamp(2rem,5vw,4rem)' }}>{children}</main>
      <MkFooter />
      <AuthModal />
    </div>
  )
}
