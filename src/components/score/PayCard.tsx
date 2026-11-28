import { useEffect, useMemo, useRef, useState } from 'react'
import type { CompensationReport, ScoreReport } from '@ats'
import type { Api } from '../../lib/types'
import { Icon } from '../Icon'
import { Ring } from './charts'
import { PayChart } from './PayChart'
import { money, ordinal, parseAmount, splitLabel, unitName } from '../../lib/pay'

type Status = 'idle' | 'saving' | 'saved' | 'error'

const CUR_TONE: Record<string, string> = { significantly_underpaid: 'bad', underpaid: 'warn', decent: 'info', good: 'good', top_of_band: 'good' }
const EXP_TONE: Record<string, string> = { easy: 'info', achievable: 'good', stretch: 'warn', inflated: 'bad' }
const TONE_VAR: Record<string, string> = { good: 'var(--green)', info: 'var(--info)', warn: 'var(--amber)', bad: 'var(--red)' }

/** Where the market pays, where the person is, and where they want to be. Current and expected pay are saved to the account. */
export function PayCard({ report, api, signedIn }: { report: ScoreReport; api: Api | null; signedIn: boolean }) {
  const base = report.compensation
  const cur$ = base.currency
  const [cur, setCur] = useState('')
  const [exp, setExp] = useState('')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [otherCur, setOtherCur] = useState(false)
  const [cmp, setCmp] = useState<CompensationReport | null>(null)
  const [why, setWhy] = useState(false)
  const loaded = useRef(false)

  const curN = parseAmount(cur)
  const expN = parseAmount(exp)
  const curBad = cur.trim() !== '' && curN === null
  const expBad = exp.trim() !== '' && expN === null

  // Load what was saved last time.
  useEffect(() => {
    if (!api || !signedIn) { loaded.current = true; return }
    let alive = true
    api.getPay().then((p) => {
      if (!alive) return
      if (p && p.currency === cur$) { setCur(p.current === null ? '' : String(p.current)); setExp(p.expected === null ? '' : String(p.expected)) }
      else if (p) setOtherCur(true)
    }).catch(() => {}).finally(() => { loaded.current = true })
    return () => { alive = false }
  }, [api, signedIn, cur$])

  // Compare against the market whenever the numbers change.
  useEffect(() => {
    if (curN === null && expN === null) { setCmp(null); return }
    let alive = true
    void import('@ats').then((eng) => { if (alive) setCmp(eng.compareSalaryExpectations(report, { currentSalary: curN ?? undefined, expectedSalary: expN ?? undefined })) })
    return () => { alive = false }
  }, [report, curN, expN])

  // Save a moment after the person stops typing.
  useEffect(() => {
    if (!dirty || !api || !signedIn || curBad || expBad) return
    setStatus('saving')
    const t = setTimeout(() => {
      api.savePay({ currency: cur$, current: curN, expected: expN }).then(() => { setStatus('saved'); setDirty(false) }).catch(() => setStatus('error'))
    }, 700)
    return () => clearTimeout(t)
  }, [dirty, api, signedIn, cur$, curN, expN, curBad, expBad])

  const comp = cmp ?? base
  const c = comp.comparison?.currentSalary
  const e = comp.comparison?.expectedSalary
  const fit = base.resumeCalibratedBand
  const cohort = useMemo(() => base.cohortLabel.split('·').map((x) => x.trim()), [base.cohortLabel])
  const label = cur$ === 'INR' ? 'CTC' : 'pay'
  const unit = unitName(cur$)

  const field = (id: 'cur' | 'exp', title: string, value: string, bad: boolean) => (
    <label className={'sd-field' + (bad ? ' bad' : '')}>
      <span>{title}</span>
      <div>
        <em>{cur$ === 'INR' ? '₹' : '$'}</em>
        <input inputMode="decimal" autoComplete="off" placeholder={cur$ === 'INR' ? 'e.g. 38' : 'e.g. 150'} value={value} aria-invalid={bad} aria-label={`${title} in ${unit}`}
          onChange={(ev) => { (id === 'cur' ? setCur : setExp)(ev.target.value); setDirty(true); setStatus('idle') }} />
        <u>{unit}</u>
      </div>
    </label>
  )

  return (
    <section className="sd-card sd-paycard" aria-labelledby="pay-h">
      <header className="sd-card-h">
        <div>
          <h2 id="pay-h">What the market pays</h2>
          <p className="sd-sub">{cohort.slice(0, 3).join(' · ')}</p>
        </div>
        <span className="sd-chip">{cohort[3] ?? ''}</span>
      </header>

      <div className="sd-pay-top">
        <div>
          <small>Range your resume supports</small>
          <div className="sd-big">{money(cur$, fit.low)} <span>to</span> {money(cur$, fit.high)}</div>
        </div>
        <div className="sd-pay-med">
          <small>Market median</small>
          <b>{money(cur$, base.marketBand.median)}</b>
        </div>
      </div>

      <PayChart band={base.marketBand} fit={fit} currency={cur$} current={curN} expected={expN} />

      <div className="sd-pay-inputs">
        {field('cur', `Current ${label}`, cur, curBad)}
        {field('exp', `Expected ${label}`, exp, expBad)}
      </div>
      <div className="sd-save" aria-live="polite">
        {curBad || expBad ? <span className="err">Enter a number between 1 and 10,000.</span>
          : !signedIn ? <span><Icon name="lock" size={13} /> Sign in to save this.</span>
          : status === 'saving' ? <span>Saving…</span>
          : status === 'saved' ? <span className="ok"><Icon name="check" size={13} strokeWidth={3} /> Saved to your account</span>
          : status === 'error' ? <span className="err">Could not save. Check your connection and try again.</span>
          : <span><Icon name="lock" size={13} /> Saved to your account. Only you can see it, and it never changes your score.</span>}
      </div>
      {otherCur && curN === null && expN === null && <p className="sd-note">You saved pay in {cur$ === 'INR' ? 'dollars' : 'rupees'} before. This report is in {cur$ === 'INR' ? 'rupees' : 'dollars'}, so enter amounts in {unit}.</p>}

      {(c || e) && (
        <div className="sd-verdicts">
          {c && (
            <div className={`sd-verdict ${CUR_TONE[c.verdict]}`}>
              <Ring value={c.percentileInBand} size={64} stroke={7} color={TONE_VAR[CUR_TONE[c.verdict]]} label={`${ordinal(c.percentileInBand)} percentile of the band`}>
                <b>{c.percentileInBand}</b>
              </Ring>
              <div>
                <small>Where you are now</small>
                <strong>{splitLabel(c.verdictLabel)[0]}</strong>
                <span>{c.gapVsMedian === 0 ? 'At the median' : `${money(cur$, Math.abs(c.gapVsMedian))} ${c.gapVsMedian > 0 ? 'above' : 'below'} the median`}</span>
              </div>
            </div>
          )}
          {e && (
            <div className={`sd-verdict ${EXP_TONE[e.verdict]}`}>
              <Ring value={e.percentileInBand} size={64} stroke={7} color={TONE_VAR[EXP_TONE[e.verdict]]} label={`${ordinal(e.percentileInBand)} percentile of the band`}>
                <b>{e.percentileInBand}</b>
              </Ring>
              <div>
                <small>What you are asking</small>
                <strong>{splitLabel(e.verdictLabel)[0]}</strong>
                <span>{e.deltaVsCurrentPercent !== null ? `${e.deltaVsCurrentPercent >= 0 ? '+' : ''}${e.deltaVsCurrentPercent}% vs now` : splitLabel(e.verdictLabel)[1] || 'Calibrated to your resume'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {(c || e) && (
        <button type="button" className="sd-link" aria-expanded={why} onClick={() => setWhy((w) => !w)}>
          {why ? 'Hide the detail' : 'What does this mean?'} <Icon name="chevd" size={14} style={{ transform: why ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}
      {why && (c || e) && (
        <div className="sd-why">
          {c && <p>{c.summary}</p>}
          {e && <p>{e.summary} <b>{e.actionNote}</b></p>}
        </div>
      )}

      {!c && !e && <p className="sd-empty">Add your current and expected {label} and we will show where you stand against the market and whether your ask is realistic.</p>}

      <details className="sd-how">
        <summary>How we estimate this</summary>
        <p>{base.methodologyNote}</p>
        <p>{base.baseVsTotalNote}</p>
        <p>{base.trackPremiumNote}</p>
      </details>
    </section>
  )
}
