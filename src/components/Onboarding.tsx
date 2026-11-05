import { useFocusTrap } from '../lib/useFocusTrap'
import { useState } from 'react'
import { useApp, type Prefs } from '../state/app'

const STAGES: { id: Prefs['stage']; t: string; d: string }[] = [
  { id: 'aspiring', t: 'Aspiring PM', d: 'Breaking in or switching careers' },
  { id: 'pm', t: 'PM / APM', d: '0–6 years in product' },
  { id: 'senior', t: 'Senior PM or above', d: 'Leading products and people' },
]

export function Onboarding() {
  const { user, prefs, setPrefs } = useApp()
  const [stage, setStage] = useState<Prefs['stage']>(prefs.stage)
  const [region, setRegion] = useState<Prefs['region']>(prefs.region)
  const trap = useFocusTrap<HTMLDivElement>(!!user && !prefs.onboarded)
  if (!user || prefs.onboarded) return null
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Personalise ProductRez">
      <div className="card modal wide" ref={trap}>
        <div className="stack">
          <div>
            <span className="chip accent">30 seconds</span>
            <h2 style={{ marginTop: 10 }}>Let’s tune ProductRez to you</h2>
            <p className="muted" style={{ marginTop: 6 }}>We’ll score your resume against the right bar, pick the right template and show jobs from your market.</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="label">Where are you in your PM journey?</span>
            {STAGES.map((s) => (
              <button key={s.id} className="onboard-opt" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>
                <b>{s.t}</b>
                <span className="muted" style={{ fontSize: '0.9rem' }}>{s.d}</span>
              </button>
            ))}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="label">Which job market?</span>
            <div className="seg" role="group" aria-label="Market">
              {(['IN', 'US'] as const).map((r) => (
                <button key={r} aria-pressed={region === r} onClick={() => setRegion(r)}>
                  {r === 'IN' ? 'India' : 'United States'}
                </button>
              ))}
            </div>
          </div>
          <button className="btn lg block" onClick={() => setPrefs({ stage, region, onboarded: true })}>
            Start
          </button>
        </div>
      </div>
    </div>
  )
}
