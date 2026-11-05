import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/app'
import { useFocusTrap } from '../lib/useFocusTrap'
import { Icon } from './Icon'
import { LogoMark } from './Logo'

export function AuthModal() {
  const { authOpen, closeAuth, api, authReason, toast, user } = useApp()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const trap = useFocusTrap<HTMLDivElement>(authOpen)
  const demo = api?.mode === 'demo'

  useEffect(() => {
    if (authOpen) {
      setStep('email')
      setCode('')
      setTimeout(() => first.current?.focus(), 50)
    }
  }, [authOpen])
  // The email may carry a magic link instead of a code: when it is clicked (in this or another tab) the session
  // arrives through the auth listener, so close the dialog on our own.
  useEffect(() => {
    if (authOpen && user && !demo) {
      closeAuth()
      toast('Signed in')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authOpen])
  useEffect(() => {
    if (!authOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAuth()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authOpen, closeAuth])
  if (!authOpen || !api) return null

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email address', 'err')
    setBusy(true)
    try {
      if (demo) {
        await api.verifyCode(email, '000000')
        toast('Signed in (demo mode)')
        closeAuth()
      } else {
        await api.sendCode(email)
        setStep('code')
      }
    } catch (err) {
      toast((err as Error).message || 'Could not send the code', 'err')
    } finally {
      setBusy(false)
    }
  }
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.verifyCode(email, code.trim())
      closeAuth()
      toast('Welcome to ProductRez')
    } catch (err) {
      toast((err as Error).message || 'That code did not work', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Sign in" onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}>
      <div className="card modal" ref={trap}>
        <button className="x" onClick={closeAuth} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <div className="stack">
          <LogoMark size={44} />
          <div>
            <h2 style={{ fontSize: '1.8rem' }}>{step === 'email' ? 'Sign in to ship your career' : 'Check your inbox'}</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              {authReason || (step === 'email' ? 'No password. We’ll email you a secure sign-in link.' : `We sent a sign-in email to ${email}.`)}
            </p>
          </div>
          {step === 'email' ? (
            <form className="stack" onSubmit={submitEmail}>
              <div className="field">
                <label htmlFor="em">Email</label>
                <input id="em" ref={first} className="input" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn lg block" disabled={busy}>
                {busy ? 'One sec…' : demo ? 'Continue' : 'Email me a sign-in link'} <Icon name="arrow" size={18} />
              </button>
              {!demo && (
                <button type="button" className="btn ghost block" onClick={() => api.signInWithGoogle().catch((e) => toast(e.message, 'err'))}>
                  Continue with Google
                </button>
              )}
              {demo && <p className="faint" style={{ fontSize: '0.85rem' }}>Demo mode: no email is sent and everything stays in this browser.</p>}
            </form>
          ) : (
            <form className="stack" onSubmit={submitCode}>
              <p className="muted" style={{ fontSize: '0.95rem' }}>
                Open the email and <b>click the sign-in link</b>. This window closes by itself once you’re in. If the email shows a code instead, type it here.
              </p>
              <input ref={first} className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="One-time code" />
              <button className="btn lg block" disabled={busy || code.length < 6}>
                {busy ? 'Verifying…' : 'Verify code'}
              </button>
              <button type="button" className="link-btn" onClick={() => setStep('email')}>
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
