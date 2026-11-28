import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../state/app'
import { GoogleG, Ico } from './icons'
import { analysisStore } from '../../lib/g/store'
import { useScanTimeline, type ScanStage } from '../../lib/g/scan'
import { AiLog } from './AiLog'

export function GToast({ msg }: { msg: string }) {
  return (
    <div className={'g-toast' + (msg ? ' g-show' : '')} role="status" aria-live="polite">
      <Ico n="info" sm />
      <span>{msg || 'Please upload your resume first.'}</span>
    </div>
  )
}

// Google sign-in is shown only once the provider is enabled in Supabase and VITE_GOOGLE_AUTH=true is set in the host's env.
const GOOGLE_ON = import.meta.env.VITE_GOOGLE_AUTH === 'true'
const friendly = (m: string | undefined, fallback: string) => (/provider is not enabled|unsupported provider/i.test(m ?? '') ? 'Google sign-in is not available yet. Use your email instead.' : !m || /fetch|network|load failed|timeout/i.test(m) ? 'We could not reach the sign-in service. Please try again in a moment.' : m || fallback)

export function GScan({ open, plan, sub }: { open: boolean; plan: ScanStage[] | null; sub: string }) {
  const v = useScanTimeline(open, plan)
  const titles = plan?.map((p) => p.title) ?? []
  return (
    <div className={'scan-overlay' + (open ? ' g-open' : '')} role="dialog" aria-modal="true" aria-label="Analyzing your resume" aria-hidden={!open}>
      <div className="scan-modal">
        <div className="g-scan-doc">
          <div className="scan-laser" />
          <div className="sd-h" /><div className="sd-l" /><div className="sd-l g-s" /><div className="sd-l" /><div className="sd-l g-s" /><div className="sd-l" />
        </div>
        <h3>{v.stage >= 0 && titles[v.stage] ? titles[v.stage] + '…' : 'Analyzing your PM resume'}</h3>
        <p className="scan-sub">{sub}</p>
        <div className="scan-progress"><div className="scan-bar" style={{ width: `${v.pct}%`, transition: 'width 0.3s linear' }} /></div>
        <div className="ai-meta"><span>Step {Math.max(1, v.stage + 1)} of {titles.length || 6}</span><span>{v.pct}%</span></div>
        <div className="scan-steps">
          {titles.map((s, i) => (
            <div key={s} className={'scan-step' + (v.stage === i ? ' g-active' : v.stage > i ? ' g-done' : '')}>
              <span className="step-dot">{v.stage > i && <svg style={{ width: 10, height: 10, stroke: '#fff', fill: 'none', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <AiLog view={v} />
      </div>
    </div>
  )
}

/** Sign-in dialog in the marketing design. Uses the real auth API (email code or link, and Google). */
export function GAuth({ open, title, onClose, onDone }: { open: boolean; title: string; onClose: () => void; onDone: () => void }) {
  const { api, user } = useApp()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const first = useRef<HTMLInputElement>(null)
  const demo = api?.mode === 'demo'
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (open) { setStep('email'); setCode(''); setErr(''); setTimeout(() => first.current?.focus(), 60) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  // A magic link clicked in another tab lands here as a session change.
  useEffect(() => { if (open && user) done.current() }, [open, user])
  if (!open) return null

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address.')
    if (!api) return
    setBusy(true)
    try {
      if (demo) { await api.verifyCode(email, '000000'); onDone() } else { await api.sendCode(email); setStep('code') }
    } catch (e) { setErr(friendly((e as Error).message, 'We could not send the code.')) } finally { setBusy(false) }
  }
  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!api) return
    setErr('')
    setBusy(true)
    try { await api.verifyCode(email, code.trim()); onDone() } catch (e) { setErr(friendly((e as Error).message, 'That code did not work. Check it and try again.')) } finally { setBusy(false) }
  }

  return (
    <div className="auth-overlay g-open" role="dialog" aria-modal="true" aria-label="Sign in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-card">
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close"><Ico n="x" sm /></button>
        <div className="auth-head">
          <div className="brand-mark">PR</div>
          <h3>{step === 'email' ? title : 'Check your inbox'}</h3>
          {step === 'code' && <p>We sent a sign-in email to {email}.</p>}
        </div>
        {step === 'email' ? (
          <form onSubmit={sendEmail}>
            {!demo && GOOGLE_ON && (
              <>
                <button type="button" className="google-btn" onClick={() => api?.signInWithGoogle().catch((e) => setErr(friendly(e.message, 'Google sign-in is not available right now.')))}><GoogleG /> Continue with Google</button>
                <div className="auth-div">or continue with email</div>
              </>
            )}
            <input ref={first} type="email" className="auth-input" placeholder="you@company.com" aria-label="Email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {err && <p className="drop-err" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{err}</p>}
            <button type="submit" className="g-btn btn-primary btn-main" style={{ width: '100%', padding: 11 }} disabled={busy}>{busy ? 'One sec…' : demo ? 'Continue' : 'Continue with email'}</button>
            {demo && <div className="auth-foot">Demo mode: no email is sent and everything stays in this browser.</div>}
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="auth-foot" style={{ marginTop: 0, marginBottom: 10, textAlign: 'left' }}>Click the sign-in link in the email and this window closes by itself. If the email shows a code instead, type it here.</p>
            <input ref={first} className="auth-input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Enter 6-digit code" aria-label="Sign-in code" style={{ textAlign: 'center', letterSpacing: '0.2em', fontWeight: 800 }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            {err && <p className="drop-err" role="alert" style={{ marginTop: 0, marginBottom: 10 }}>{err}</p>}
            <button type="submit" className="g-btn btn-primary btn-main" style={{ width: '100%', padding: 11 }} disabled={busy || code.length < 6}>{busy ? 'Verifying…' : 'Verify & Continue'}</button>
            <button type="button" className="auth-foot" style={{ background: 'none', border: 0, cursor: 'pointer', width: '100%', textDecoration: 'underline' }} onClick={() => setStep('email')}>Use a different email</button>
          </form>
        )}
        {analysisStore.get() && <div className="auth-foot" style={{ marginTop: 0, marginBottom: 8 }}>Your resume check will be saved to your account, replacing any earlier one.</div>}
        <div className="auth-foot">By continuing, you agree to our <a href="/terms" style={{ color: 'inherit' }}>Terms</a> and <a href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</a>.</div>
      </div>
    </div>
  )
}
