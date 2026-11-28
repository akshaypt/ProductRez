import { useEffect, useMemo, useRef, useState } from 'react'
import type { CompensationReport, ScoreReport } from '@ats'
import type { Api } from '../../lib/types'
import { Icon } from '../Icon'
import { Ring } from './charts'
import { PayChart } from './PayChart'
import { money, ordinal, parseAmount, splitLabel, unitName } from '../../lib/pay'

type Status = 'idle' | 'saving' | 'saved' | 'error'
type Lvl = 'apm' | 'pm' | 'senior' | 'lead'

const LEVELS: [Lvl, string, string][] = [['apm', 'APM', 'Entry level'], ['pm', 'PM', 'Product Manager'], ['senior', 'Senior', 'Senior PM'], ['lead', 'Lead', 'Lead / Group PM']]
const CUR_TONE: Record<string, string> = { significantly_underpaid: 'bad', underpaid: 'warn', decent: 'info', good: 'good', top_of_band: 'good' }
const EXP_TONE: Record<string, string> = { easy: 'info', achievable: 'good', stretch: 'warn', inflated: 'bad' }
/** The engine's labels ("Inflated for Selected Cohort") are for people already in PM. Someone asking about a move into product gets plainer words. */
const ENTRY_ASK: Record<string, string> = { easy: 'Room to ask for more', achievable: 'Realistic for entry-level PM', stretch: 'Top of the entry-level range', inflated: 'Above entry-level PM pay' }
const TONE_VAR: Record<string, string> = { good: 'var(--green)', info: 'var(--info)', warn: 'var(--amber)', bad: 'var(--red)' }

/**
 * For someone who is not in a PM role yet, "underpaid" would be a verdict on the wrong job. Their current pay is shown against the
 * entry-level PM band instead, in plain words, and a move into product is flagged honestly when it may start lower.
 */
const entryVerdict = (p: number): { label: string; tone: string; hint?: string } =>
  p <= 25 ? { label: 'Below entry-level PM pay', tone: 'info' }
  : p <= 65 ? { label: 'In line with entry-level PM pay', tone: 'good' }
  : p <= 85 ? { label: 'Above entry-level PM pay', tone: 'info' }
  : { label: 'Well above entry-level PM pay', tone: 'warn', hint: 'A move into PM may start below your current pay' }

/** Where the market pays, where the person is, and where they want to be. Current and expected pay are saved to the account. */
export function PayCard({ report, api, signedIn }: { report: ScoreReport; api: Api | null; signedIn: boolean }) {
  const ctx = report.contextUsed
  // Reports saved before the PM-fit flag existed: a background other than a practising PM means a resume from outside product.
  const isPm = ctx.isPmResume ?? ctx.background === 'practicing_pm'
  const startLvl: Lvl = isPm ? (ctx.level as Lvl) : 'apm'
  const cur$ = report.compensation.currency
  const [lvl, setLvl] = useState<Lvl>(startLvl)
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

  // Work out the band and the comparison whenever the numbers or the level being looked at change.
  const needsCompute = curN !== null || expN !== null || lvl !== ctx.level
  useEffect(() => {
    if (!needsCompute) { setCmp(null); return }
    let alive = true
    void import('@ats').then((eng) => {
      if (!alive) return
      setCmp(eng.compareSalaryExpectations({ ...report, contextUsed: { ...report.contextUsed, level: lvl } }, { currentSalary: curN ?? undefined, expectedSalary: expN ?? undefined }))
    })
    return () => { alive = false }
  }, [report, curN, expN, lvl, needsCompute])

  // Save a moment after the person stops typing.
  useEffect(() => {
    if (!dirty || !api || !signedIn || curBad || expBad) return
    setStatus('saving')
    const t = setTimeout(() => {
      api.savePay({ currency: cur$, current: curN, expected: expN }).then(() => { setStatus('saved'); setDirty(false) }).catch(() => setStatus('error'))
    }, 700)
    return () => clearTimeout(t)
  }, [dirty, api, signedIn, cur$, curN, expN, curBad, expBad])

  const comp = cmp ?? report.compensation
  const c = comp.comparison?.currentSalary
  const e = comp.comparison?.expectedSalary
  const fit = comp.resumeCalibratedBand
  const band = comp.marketBand
  const cohort = useMemo(() => comp.cohortLabel.split('·').map((x) => x.trim()), [comp.cohortLabel])
  const label = cur$ === 'INR' ? 'CTC' : 'pay'
  const unit = unitName(cur$)
  const lvlName = LEVELS.find((l) => l[0] === lvl)?.[2] ?? ''
  const entry = c && !isPm ? entryVerdict(c.percentileInBand) : null

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

      <div className="sd-seg sd-lvl" role="group" aria-label="Pay for which level">
        {LEVELS.map(([v, short, long]) => (
          <button key={v} type="button" aria-pressed={lvl === v} title={long} onClick={() => setLvl(v)}>{short}</button>
        ))}
      </div>

      {!isPm && (
        <p className="sd-notice" role="note">
          <Icon name="info" size={15} />
          <span>
            {lvl === 'apm'
              ? <>Your resume does not show product experience yet, so this is what <b>entry-level PM</b> roles pay. It is not a benchmark for your current job.</>
              : <>You are looking at <b>{lvlName}</b> pay. With no product experience, most people start at entry level.</>}
          </span>
        </p>
      )}

      <div className="sd-pay-top">
        <div>
          <small>Range your resume supports</small>
          <div className="sd-big">{money(cur$, fit.low)} <span>to</span> {money(cur$, fit.high)}</div>
        </div>
        <div className="sd-pay-med">
          <small>Market median</small>
          <b>{money(cur$, band.median)}</b>
        </div>
      </div>

      <PayChart band={band} fit={fit} currency={cur$} current={curN} expected={expN} />

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
          {c && (() => {
            const tone = entry ? entry.tone : CUR_TONE[c.verdict]
            return (
              <div className={`sd-verdict ${tone}`}>
                <Ring value={c.percentileInBand} size={64} stroke={7} color={TONE_VAR[tone]} label={`${ordinal(c.percentileInBand)} percentile of the band`}>
                  <b>{c.percentileInBand}</b>
                </Ring>
                <div>
                  <small>{isPm ? 'Where you are now' : 'Your current pay'}</small>
                  <strong>{entry ? entry.label : splitLabel(c.verdictLabel)[0]}</strong>
                  <span>{entry?.hint ?? (c.gapVsMedian === 0 ? 'At the median' : `${money(cur$, Math.abs(c.gapVsMedian))} ${c.gapVsMedian > 0 ? 'above' : 'below'} the median`)}</span>
                </div>
              </div>
            )
          })()}
          {e && (
            <div className={`sd-verdict ${EXP_TONE[e.verdict]}`}>
              <Ring value={e.percentileInBand} size={64} stroke={7} color={TONE_VAR[EXP_TONE[e.verdict]]} label={`${ordinal(e.percentileInBand)} percentile of the band`}>
                <b>{e.percentileInBand}</b>
              </Ring>
              <div>
                <small>{isPm ? 'What you are asking' : lvl === 'apm' ? 'Your ask vs entry-level PM' : `Your ask vs ${lvlName}`}</small>
                <strong>{!isPm && lvl === 'apm' ? ENTRY_ASK[e.verdict] : splitLabel(e.verdictLabel)[0]}</strong>
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
          {c && <p>{entry ? `${entry.label}. Your ${money(cur$, c.amount)} sits at the ${ordinal(c.percentileInBand)} percentile of the ${lvlName} band for this kind of company.` : c.summary}</p>}
          {e && <p>{e.summary} <b>{e.actionNote}</b></p>}
        </div>
      )}

      {!c && !e && <p className="sd-empty">Add your current and expected {label} and we will show where you stand against the market and whether your ask is realistic.</p>}

      <details className="sd-how">
        <summary>How we estimate this</summary>
        <p>{comp.methodologyNote}</p>
        <p>{comp.baseVsTotalNote}</p>
        <p>{comp.trackPremiumNote}</p>
      </details>
    </section>
  )
}
