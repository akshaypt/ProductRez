import { useMemo, useState } from 'react'
import { reviewBullet } from '@scoring'

const EXAMPLES = ['Responsible for managing the product backlog and working with engineers', 'Led the redesign of onboarding, improving activation', 'Launched usage-based pricing for 12,000 SMB accounts, cutting churn from 5.1% to 3.8% in two quarters']
const VERDICT = ['Activity, not impact. A hiring manager learns nothing about what changed.', 'You hint at an outcome but give no number. Add the metric and the size of the change.', 'Quantified. Add a before → after or a timeframe to make it airtight.', 'Hiring-manager ready: outcome, number and change are all there.']
const FLAG: Record<string, string> = { 'no-metric': 'No metric', 'weak-verb': 'Weak opener', 'no-verb': 'No action verb', 'too-long': 'Too long', 'too-short': 'Too short', 'first-person': 'First person', passive: 'Passive voice', buzzword: 'Buzzword' }

export function Xray() {
  const [text, setText] = useState(EXAMPLES[0])
  const r = useMemo(() => reviewBullet(text.trim() || ' ', 'experience', '', true), [text])
  const level = text.trim().length < 4 ? -1 : r.impact
  return (
    <div className="aw-card xray" data-testid="xray" style={{ padding: '1.5rem', borderRadius: 20, boxShadow: 'var(--hi)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}><b style={{ fontWeight: 500, fontSize: '1.15rem', color: 'var(--text)' }}>Bullet X-ray</b><span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Runs in your browser</span></div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Resume bullet to analyse" />
      <div className="xray-meter" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={level > i ? `on${level - 1}` : ''} />)}</div>
      <p style={{ fontWeight: 500, fontSize: '0.98rem', color: 'var(--text)' }} aria-live="polite">{level < 0 ? 'Type a bullet to see its impact rating.' : `Impact ${r.impact}/3: ${VERDICT[r.impact]}`}</p>
      <div className="row" style={{ gap: 6, margin: '10px 0 14px', minHeight: 24 }}>{level >= 0 && r.flags.map((f) => <span key={f} className="chip bad">{FLAG[f]}</span>)}{level >= 0 && r.flags.length === 0 && <span className="chip good">No issues found</span>}</div>
      <div className="row" style={{ gap: 6 }}><span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Examples</span>{EXAMPLES.map((e, i) => <button key={i} className="chip btnish" onClick={() => setText(e)}>{i + 1}</button>)}</div>
    </div>
  )
}
