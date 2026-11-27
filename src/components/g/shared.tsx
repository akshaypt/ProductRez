import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../state/app'
import { GoogleG, Ico } from './icons'

export function GToast({ msg }: { msg: string }) {
  return (
    <div className={'g-toast' + (msg ? ' g-show' : '')} role="status" aria-live="polite">
      <Ico n="info" sm />
      <span>{msg || 'Please upload your resume first.'}</span>
    </div>
  )
}

const STEPS = ['Reading resume structure & role timeline', 'Auditing bullet impact & PM craft', 'Benchmarking market standing & salary fit']

export function GScan({ open, step, sub }: { open: boolean; step: number; sub: string }) {
  const pct = [10, 48, 82, 100][Math.max(0, Math.min(3, step))]
  return (
    <div className={'scan-overlay' + (open ? ' g-open' : '')} role="dialog" aria-modal="true" aria-label="Analyzing your resume" aria-hidden={!open}>
      <div className="scan-modal">
        <div className="g-scan-doc">
          <div className="scan-laser" />
          <div className="sd-h" /><div className="sd-l" /><div className="sd-l g-s" /><div className="sd-l" /><div className="sd-l g-s" /><div className="sd-l" />
        </div>
        <h3>Analyzing your PM resume</h3>
        <p className="scan-sub">{sub}</p>
        <div className="scan-progress"><div className="scan-bar" style={{ width: `${pct}%` }} /></div>
        <div className="scan-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={'scan-step' + (step === i ? ' g-active' : step > i ? ' g-done' : '')}>
              <span className="step-dot">{step > i && <svg style={{ width: 10, height: 10, stroke: '#fff', fill: 'none', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Sign-in dialog in the marketing design. Uses the real auth API (email code or link, and Google). */
export function GAuth({ open, title, onClose, onDone }: { open: boolean; title: string; onClose: () => void; onDone: () => void }) {
  const { api, user, toast } = useApp()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const demo = api?.mode === 'demo'
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (open) { setStep('email'); setCode(''); setTimeout(() => first.current?.focus(), 60) }
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
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email address', 'err')
    if (!api) return
    setBusy(true)
    try {
      if (demo) { await api.verifyCode(email, '000000'); onDone() } else { await api.sendCode(email); setStep('code') }
    } catch (err) { toast((err as Error).message || 'Could not send the code', 'err') } finally { setBusy(false) }
  }
  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!api) return
    setBusy(true)
    try { await api.verifyCode(email, code.trim()); onDone() } catch (err) { toast((err as Error).message || 'That code did not work', 'err') } finally { setBusy(false) }
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
            {!demo && (
              <>
                <button type="button" className="google-btn" onClick={() => api?.signInWithGoogle().catch((e) => toast(e.message, 'err'))}><GoogleG /> Continue with Google</button>
                <div className="auth-div">or continue with email</div>
              </>
            )}
            <input ref={first} type="email" className="auth-input" placeholder="you@company.com" aria-label="Email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="g-btn btn-primary btn-main" style={{ width: '100%', padding: 11 }} disabled={busy}>{busy ? 'One sec…' : demo ? 'Continue' : 'Send 6-Digit Code'}</button>
            {demo && <div className="auth-foot">Demo mode: no email is sent and everything stays in this browser.</div>}
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="auth-foot" style={{ marginTop: 0, marginBottom: 10, textAlign: 'left' }}>Enter the 6-digit code from the email. If the email has a sign-in link instead, click it and this window closes by itself.</p>
            <input ref={first} className="auth-input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Enter 6-digit code" aria-label="Sign-in code" style={{ textAlign: 'center', letterSpacing: '0.2em', fontWeight: 800 }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <button type="submit" className="g-btn btn-primary btn-main" style={{ width: '100%', padding: 11 }} disabled={busy || code.length < 6}>{busy ? 'Verifying…' : 'Verify & Continue'}</button>
            <button type="button" className="auth-foot" style={{ background: 'none', border: 0, cursor: 'pointer', width: '100%', textDecoration: 'underline' }} onClick={() => setStep('email')}>Use a different email</button>
          </form>
        )}
        <div className="auth-foot">By continuing, you agree to our <a href="/terms" style={{ color: 'inherit' }}>Terms</a> and <a href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</a>.</div>
      </div>
    </div>
  )
}
