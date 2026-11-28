import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../state/app'
import type { LatestScan } from '../lib/types'
import { Icon } from '../components/Icon'
import { ReportView } from '../components/ReportView'
import { Insights } from '../components/Insights'
import { store } from '../lib/util'
import { toLegacy } from '../lib/v2'
import { COMPANIES, CURRENCIES, LEVELS, TRACKS } from '../lib/g/data'
import { collectSubmission } from '../lib/g/collect'
import { SCAN_MS, scanPlan, useScanTimeline, type ScanStage } from '../lib/g/scan'
import { ConsentNote } from '../components/ConsentNote'
import { AiLog } from '../components/g/AiLog'
import '../styles/scan.css'
import { readResume, ResumeReadError, runAnalysis, suggest, type LoadedResume, type Picks } from '../lib/g/analyze'


export default function Score() {
  const { user, ent, api, prefs, setPrefs, toast, ready } = useApp()
  const nav = useNavigate()
  const [saved, setSaved] = useState<LatestScan | null | undefined>(undefined) // undefined while loading
  const [uploading, setUploading] = useState(false)
  const [loaded, setLoaded] = useState<LoadedResume | null>(null)
  const [picks, setPicks] = useState<Picks>({ level: null, track: null, company: null, currency: prefs.currency })
  const [jd, setJd] = useState('')
  const [showJd, setShowJd] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'reading' | 'running'>('idle')
  const [plan, setPlan] = useState<ScanStage[] | null>(null)
  const view = useScanTimeline(phase === 'running', plan)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!api || !user) return
    api.getLatestScan().then((s) => setSaved(s)).catch(() => setSaved(null))
  }, [api, user])

  const pick = useCallback(async (f: File | undefined | null) => {
    if (!f) return
    setErr(''); setLoaded(null); setPhase('reading')
    try {
      const r = await readResume(f)
      const s = await suggest(r)
      if (s.message) { setErr(s.message); return }
      const fallback = prefs.stage === 'senior' ? 'Senior PM' : prefs.stage === 'aspiring' ? 'APM (0–2 yrs)' : 'Product Manager'
      setLoaded(r)
      setPicks((p) => ({ currency: s.picks.currency ?? p.currency, level: p.level ?? s.picks.level ?? fallback, track: p.track ?? s.picks.track, company: p.company ?? 'Scale-ups' }))
    } catch (e) {
      setErr(e instanceof ResumeReadError ? e.message : 'We could not read that file. Export your resume as a text-based PDF or DOCX and try again.')
    } finally {
      setPhase('idle')
    }
  }, [prefs.stage])

  const run = useCallback(async () => {
    if (!loaded || !api) return
    if (!picks.currency) { setErr('Choose the currency for pay, then run the check again.'); return }
    setErr(''); setPhase('running'); setPlan(null)
    try {
      // The score is ready at once; the review plays for a full read so each stage can show what it found.
      const a = await runAnalysis(loaded, picks, jd)
      collectSubmission(api, a, 'app')
      setPlan(scanPlan(a.report))
      await new Promise((res) => setTimeout(res, SCAN_MS + 400))
      const scan = { fileName: loaded.name, picks, report: a.report }
      try { await api.saveLatestScan(scan) } catch { toast('Scored, but we could not save it to your account. Try again later.', 'err') }
      setSaved({ ...scan, updatedAt: new Date().toISOString() })
      store.set('pr.writer.import', a.report.parsed)
      setUploading(false); setLoaded(null); setJd(''); setShowJd(false)
    } catch {
      setErr('Something went wrong while scoring. Please try another file.')
    } finally {
      setPhase('idle')
    }
  }, [loaded, api, picks, jd, toast])

  const goWriter = () => {
    if (saved) store.set('pr.writer.import', saved.report.parsed)
    nav('/writer?import=1')
  }

  if (!ready) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>
  // Scoring happens on the home page for anyone, so a signed-out visit has nothing to do here.
  if (!user) return <Navigate to="/" replace />
  if (saved === undefined) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>

  const showUpload = uploading || !saved
  const when = saved ? new Date(saved.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const select = (id: 'level' | 'track' | 'company', label: string, opts: { label: string }[]) => (
    <label className="field">
      <span className="label">{label}</span>
      <select className="select" value={picks[id] ?? ''} onChange={(e) => setPicks({ ...picks, [id]: e.target.value || null })}>
        {id === 'level' && <option value="">Detect from my resume</option>}
        {opts.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
      </select>
    </label>
  )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="chip good">{ent.active ? 'Pro' : 'Free · scoring is always free'}</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', marginTop: 10 }}>PM Resume Score</h1>
          {saved && !showUpload ? (
            <p style={{ overflowWrap: 'anywhere' }}>{saved.fileName} · {[saved.picks.level, saved.picks.track].filter(Boolean).join(' · ')} · saved {when}</p>
          ) : (
            <p>Rated the way a PM hiring manager reads: impact, ownership, product craft, clarity and ATS safety. Your file is read in your browser.</p>
          )}
        </div>
        {saved && !showUpload && (
          <button className="btn ghost" onClick={() => { setUploading(true); setErr('') }}>
            <Icon name="upload" size={18} /> Upload a new resume
          </button>
        )}
      </div>

      {phase === 'running' ? (
        <div className="card" aria-live="polite" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.7rem' }}>{plan && view.stage >= 0 ? plan[view.stage].title + '…' : 'Reviewing like a hiring manager…'}</h2>
          <div className="scan">
            <div className="scan-doc" aria-hidden="true">
              {Array.from({ length: 19 }, (_, i) => (
                <i key={i} className={`${i === 0 ? 'h' : i === 3 || i === 10 ? 's' : ''} ${i / 19 <= view.pct / 100 ? 'on' : ''}`} style={{ width: i === 0 || i === 3 || i === 10 ? undefined : `${70 + ((i * 37) % 30)}%` }} />
              ))}
              <span className="scan-beam" />
            </div>
            <div>
              <div className="ai-meta"><span>Step {Math.max(1, view.stage + 1)} of {plan?.length ?? 6}</span><span>{view.pct}%</span></div>
              <div className="pipeline" style={{ margin: '0.4rem auto 0' }}>
                {(plan ?? []).map((st, i) => (
                  <div key={st.title} className={`pipe-step ${i < view.stage ? 'done' : i === view.stage ? 'run' : ''}`}>
                    <span className="dot">{i < view.stage && <Icon name="check" size={13} strokeWidth={3} />}</span>
                    {st.title}
                  </div>
                ))}
              </div>
              <AiLog view={view} />
            </div>
          </div>
        </div>
      ) : showUpload ? (
        <div className="stack">
          {saved && (
            <div className="callout">
              <Icon name="file" size={18} /> <span>Your account keeps one resume check. A new upload replaces <b>{saved.fileName}</b>.</span>
              <button className="link-btn" onClick={() => { setUploading(false); setErr('') }}>Cancel</button>
            </div>
          )}
          <div
            className={`drop ${over ? 'over' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Upload your resume"
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); void pick(e.dataTransfer.files[0]) }}
          >
            <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden data-testid="file-input" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
            <Icon name={loaded ? 'file' : 'upload'} size={44} />
            <div className="big">{phase === 'reading' ? 'Reading your resume…' : loaded ? loaded.name : 'Drop your resume here'}</div>
            <span className="muted">{loaded ? `${Math.round(loaded.size / 1024)} KB${loaded.pageCount ? ` · ${loaded.pageCount} page${loaded.pageCount > 1 ? 's' : ''}` : ''} · click to change` : 'or click to browse · PDF or DOCX, up to 5 MB'}</span>
          </div>
          {loaded && (
            <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
              {select('level', 'Target level', LEVELS)}
              {select('track', 'PM focus', TRACKS)}
              {select('company', 'Company type', COMPANIES)}
              <label className="field">
                <span className="label">Currency for pay</span>
                <select className="select" value={picks.currency ?? ''} onChange={(e) => { const currency = (e.target.value || null) as 'INR' | 'USD' | null; setPicks({ ...picks, currency }); if (currency) setPrefs({ currency }) }}>
                  {!picks.currency && <option value="">Choose currency</option>}
                  {CURRENCIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                </select>
              </label>
            </div>
          )}
          {loaded && (
            <div className="field">
              <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowJd((s) => !s)} aria-expanded={showJd}>
                <Icon name="target" size={18} /> {showJd ? 'Hide job description' : 'Targeting a specific job? Add its description'}
              </button>
              {showJd && <textarea className="textarea" placeholder="Paste the job description here for a keyword match" value={jd} onChange={(e) => setJd(e.target.value)} aria-label="Job description" />}
            </div>
          )}
          {err && (
            <div className="callout err" role="alert">
              <Icon name="x" size={18} /> <span>{err}</span>
            </div>
          )}
          <button className="btn lg" onClick={run} disabled={!loaded || phase !== 'idle'}>
            <Icon name="zap" size={20} /> Review my resume
          </button>
          <ConsentNote />
          <p className="faint" style={{ fontSize: '0.85rem' }}>
            Scores measure PM-resume quality and parse-ability. No real ATS publishes a 0–100 number, so treat this as a diagnostic, not a guarantee. We save the parsed resume and score to your account, never the file itself.
          </p>
        </div>
      ) : saved ? (
        <>
          <ReportView report={toLegacy(saved.report)} onFix={goWriter} fixLabel={ent.active ? 'Fix this in the Writer' : 'Unlock the Writer to fix this'} />
          <Insights report={saved.report} />
        </>
      ) : null}
    </div>
  )
}
