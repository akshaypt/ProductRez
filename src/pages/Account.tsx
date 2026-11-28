import { useEffect, useState } from 'react'
import type { LatestScan } from '../lib/types'
import { Link, useNavigate } from 'react-router-dom'
import { CONTACT_EMAIL } from '../data/site'
import { useApp } from '../state/app'
import { AuthPrompt } from '../components/Paywall'
import { useInstall } from '../components/InstallPrompt'
import { formatDate } from '../lib/util'
import { Icon } from '../components/Icon'

export default function Account() {
  const { user, ent, api, prefs, setPrefs, openAuth, toast, ready } = useApp()
  const { canInstall, install, installed, ios } = useInstall()
  const [del, setDel] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const [scan, setScan] = useState<LatestScan | null>(null)
  useEffect(() => { if (api && user) api.getLatestScan().then(setScan).catch(() => {}) }, [api, user])
  if (!ready) return <div className="page"><div className="skeleton" style={{ height: 240 }} /></div>
  if (!user) return <div className="page"><AuthPrompt title="You’re not signed in" body="Sign in to see your plan and settings." onSignIn={() => openAuth()} /></div>
  return (
    <div className="page" style={{ maxWidth: 760, marginLeft: 0 }}>
      <div className="page-head"><div><h1 style={{ fontSize: 'clamp(2rem,4.5vw,3rem)' }}>Account</h1><p>{user.email}</p></div></div>
      <div className="stack">
        <div className="card">
          <h3>Plan</h3>
          <p style={{ margin: '8px 0' }}>
            {ent.active ? (ent.plan === 'lifetime' ? <><span className="chip good">Lifetime</span> You have access forever.</> : <><span className="chip good">Pro</span> Active until <b>{formatDate(ent.expiresAt)}</b>.</>) : <><span className="chip">Free</span> 1 free resume score.</>}
          </p>
          <Link className="btn" to="/pricing">{ent.active && ent.plan !== 'lifetime' ? 'Extend plan' : ent.active ? 'View plans' : 'Unlock everything'}</Link>
        </div>
        <div className="card stack">
          <h3>Preferences</h3>
          <div className="field"><span className="label">Currency for pay</span><div className="seg" role="group" aria-label="Currency">{(['INR', 'USD'] as const).map((c) => <button key={c} aria-pressed={prefs.currency === c} onClick={() => setPrefs({ currency: c })}>{c === 'INR' ? '₹ INR' : '$ USD'}</button>)}</div><span className="faint" style={{ fontSize: '0.85rem' }}>Used for pay bands in your next resume check.</span></div>
          <div className="field"><span className="label">Experience</span><div className="seg" role="group" aria-label="Stage">{([['aspiring', 'Aspiring'], ['pm', 'PM / APM'], ['senior', 'Senior+']] as const).map(([v, l]) => <button key={v} aria-pressed={prefs.stage === v} onClick={() => setPrefs({ stage: v })}>{l}</button>)}</div></div>
          <div className="field"><span className="label">Theme</span><div className="seg" role="group" aria-label="Theme">{(['system', 'light', 'dark'] as const).map((t) => <button key={t} aria-pressed={prefs.theme === t} onClick={() => setPrefs({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div></div>
        </div>
        <div className="card stack">
          <h3>Saved resume</h3>
          {scan ? (
            <>
              <p className="muted" style={{ overflowWrap: 'anywhere' }}><b>{scan.fileName}</b> · scored {scan.report.overall}/100 · saved {new Date(scan.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="faint" style={{ fontSize: '0.88rem' }}>We keep one resume check: the parsed resume and its score, never the file. A new upload replaces it.</p>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <Link className="btn ghost" to="/score">View report</Link>
                <button className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={async () => { try { await api?.deleteLatestScan(); setScan(null); toast('Saved resume deleted') } catch { toast('Could not delete it. Try again.', 'err') } }}>Delete saved resume</button>
              </div>
            </>
          ) : (
            <p className="muted">Nothing saved yet. Your latest resume check appears here once you score a resume.</p>
          )}
        </div>
        <div className="card stack">
          <h3>Install the app</h3>
          {installed ? <p className="muted">ProductRez is installed on this device.</p> : canInstall ? <button className="btn" onClick={install}><Icon name="download" size={18} /> Install ProductRez</button> : ios ? <p className="muted">On iPhone or iPad: tap the Share icon, then <b>Add to Home Screen</b>.</p> : <p className="muted">Use your browser’s menu → “Install app” to add ProductRez to your device.</p>}
        </div>
        <div className="card stack">
          <h3>Help &amp; legal</h3>
          <p className="muted">Questions or something broken? Email <a href={`mailto:${CONTACT_EMAIL}`} style={{ display: 'inline-flex', minHeight: 40, alignItems: 'center' }}><b>{CONTACT_EMAIL}</b></a>.</p>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>{[['/methodology', 'How scoring works'], ['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([to, t]) => <Link key={to} to={to} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 10px 0 0' }}>{t}</Link>)}</div>
        </div>
        <button className="btn ghost" onClick={async () => { await api?.signOut(); toast('Signed out'); nav('/') }}>Sign out</button>
        <div className="card stack">
          <h3>Delete account</h3>
          <p className="muted">Permanently removes your account, saved resumes, scores and progress. {ent.active && 'Your paid plan is lost and cannot be restored. '}This cannot be undone.</p>
          {!del ? (
            <button className="btn ghost" style={{ alignSelf: 'flex-start', color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => setDel(true)}>Delete my account…</button>
          ) : (
            <div className="stack">
              <label className="field"><span className="label">Type DELETE to confirm</span><input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></label>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn ghost" onClick={() => { setDel(false); setConfirm('') }}>Cancel</button>
                <button className="btn" style={{ background: 'var(--red)', color: '#fff' }} disabled={confirm !== 'DELETE' || busy} onClick={async () => { setBusy(true); try { await api?.deleteAccount(); toast('Your account was deleted') } catch (e) { toast(e instanceof Error ? e.message : 'Could not delete the account', 'err') } finally { setBusy(false) } }}>{busy ? 'Deleting…' : 'Delete permanently'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
