import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScoreReport, TargetLevel } from '@scoring'
import { useApp } from '../state/app'
import { ApiError } from '../lib/types'
import { Icon } from '../components/Icon'
import { ReportView } from '../components/ReportView'
import { AuthPrompt, LockCard } from '../components/Paywall'
import { store } from '../lib/util'

const STEPS = ['Reading your file', 'Splitting roles and bullets', 'Rating every bullet for impact', 'Checking 8 PM competencies', 'Testing how an ATS would parse it', 'Building your fix backlog']

export default function Score() {
  const { user, ent, api, openAuth, prefs, toast, ready } = useApp()
  const nav = useNavigate()
  const [report, setReport] = useState<ScoreReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [jd, setJd] = useState('')
  const [showJd, setShowJd] = useState(false)
  const [level, setLevel] = useState<TargetLevel>(prefs.stage === 'aspiring' ? 'apm' : prefs.stage === 'senior' ? 'senior' : 'auto')
  const [phase, setPhase] = useState<'idle' | 'running'>('idle')
  const [step, setStep] = useState(0)
  const [over, setOver] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!api || !user) {
      setLoaded(true)
      return
    }
    api.getSavedScore().then((r) => {
      setReport(r)
      setLoaded(true)
    })
  }, [api, user])

  const pick = (f: File | undefined | null) => {
    if (!f) return
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return toast('Please upload a PDF, or switch to “Paste text”.', 'err')
    if (f.size > 8 * 1024 * 1024) return toast('That file is over 8 MB.', 'err')
    setFile(f)
  }

  const run = useCallback(async () => {
    if (!api) return
    if (!user) return openAuth('Create a free account to get your resume score. Your first score is on us.')
    setPhase('running')
    setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 520)
    const started = Date.now()
    try {
      let body = text
      let pageCount: number | undefined
      let source: 'pdf' | 'paste' = 'paste'
      if (mode === 'upload') {
        if (!file) throw new ApiError('unknown', 'Choose a PDF first.')
        const { extractPdfText } = await import('../lib/pdf')
        const ex = await extractPdfText(file)
        body = ex.text
        pageCount = ex.pageCount
        source = 'pdf'
      }
      if (body.trim().length < 40) throw new ApiError('unknown', mode === 'upload' ? 'We couldn’t read any text in that PDF. If it’s a scan or image, paste the text instead.' : 'Paste your resume text first.')
      const r = await api.scoreResume({ text: body, jobDescription: jd || undefined, targetLevel: level, source, pageCount })
      const wait = 3000 - (Date.now() - started)
      if (wait > 0) await new Promise((res) => setTimeout(res, wait))
      setStep(STEPS.length)
      setReport(r)
      store.set('pr.writer.import', r.parsed)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'free_score_used') setBlocked(true)
      else toast(e instanceof Error ? e.message : 'Something went wrong', 'err')
    } finally {
      clearInterval(t)
      setPhase('idle')
    }
  }, [api, user, text, mode, file, jd, level, openAuth, toast])

  const goWriter = () => {
    if (report) store.set('pr.writer.import', report.parsed)
    nav('/writer?import=1')
  }

  if (!ready || !loaded) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>

  const freeUsed = !!report && !ent.active
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="chip good">Free · your first score is on us</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', marginTop: 10 }}>PM Resume Score</h1>
          <p>Rated the way a PM hiring manager reads: impact, ownership, product craft, clarity and ATS safety. Your file is read in your browser.</p>
        </div>
        {report && ent.active && (
          <button className="btn ghost" onClick={() => { setReport(null); setFile(null); setText('') }}>
            <Icon name="upload" size={18} /> Score another resume
          </button>
        )}
      </div>

      {!user ? (
        <AuthPrompt title="Sign in to score your resume" body="It takes 10 seconds, needs no password, and your first score is free." onSignIn={() => openAuth('Create a free account to get your resume score.')} />
      ) : phase === 'running' ? (
        <div className="card" aria-live="polite" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.7rem' }}>Reviewing like a hiring manager…</h2>
          <div className="scan">
            <div className="scan-doc" aria-hidden="true">
              {Array.from({ length: 19 }, (_, i) => (
                <i key={i} className={`${i === 0 ? 'h' : i === 3 || i === 10 ? 's' : ''} ${i / 19 <= (step + 0.6) / STEPS.length ? 'on' : ''}`} style={{ width: i === 0 || i === 3 || i === 10 ? undefined : `${70 + ((i * 37) % 30)}%` }} />
              ))}
              <span className="scan-beam" />
            </div>
            <div className="pipeline">
              {STEPS.map((s, i) => (
                <div key={s} className={`pipe-step ${i < step ? 'done' : i === step ? 'run' : ''}`}>
                  <span className="dot">{i < step && <Icon name="check" size={13} strokeWidth={3} />}</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : report ? (
        <>
          {freeUsed && (
            <div className="card flat soft row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
              <span>
                <b>That was your free score.</b> It’s saved here. Unlock unlimited scoring plus the Writer to fix what we found.
              </span>
              <button className="btn sm" onClick={() => nav('/pricing')}>See plans</button>
            </div>
          )}
          <ReportView report={report} onFix={goWriter} fixLabel={ent.active ? 'Fix this in the Writer' : 'Unlock the Writer to fix this'} />
        </>
      ) : blocked ? (
        <LockCard title="You’ve used your free score" body="Every account gets one free resume score. Unlock unlimited scoring, the PM Resume Writer, fresh jobs and the learning library." />
      ) : (
        <div className="stack">
          <div className="seg" role="group" aria-label="Input method">
            <button aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}>Upload PDF</button>
            <button aria-pressed={mode === 'paste'} onClick={() => setMode('paste')}>Paste text</button>
          </div>
          {mode === 'upload' ? (
            <div
              className={`drop ${over ? 'over' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }}
            >
              <input ref={input} type="file" accept="application/pdf,.pdf" hidden data-testid="file-input" onChange={(e) => pick(e.target.files?.[0])} />
              <Icon name={file ? 'file' : 'upload'} size={44} />
              <div className="big">{file ? file.name : 'Drop your resume PDF here'}</div>
              <span className="muted">{file ? `${Math.round(file.size / 1024)} KB · click to change` : 'or click to browse · text-based PDF, up to 8 MB'}</span>
            </div>
          ) : (
            <textarea className="textarea" style={{ minHeight: 280 }} placeholder="Paste your full resume text here…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Resume text" />
          )}
          <div className="grid2">
            <div className="field">
              <span className="label">Scoring for which level?</span>
              <div className="seg" role="group" aria-label="Target level">
                {([['auto', 'Auto'], ['apm', 'APM'], ['pm', 'PM'], ['senior', 'Senior'], ['lead', 'GPM+']] as [TargetLevel, string][]).map(([v, l]) => (
                  <button key={v} aria-pressed={level === v} onClick={() => setLevel(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Targeting a specific job? (optional)</span>
              <button className="btn ghost" onClick={() => setShowJd((s) => !s)}>
                <Icon name="target" size={18} /> {showJd ? 'Hide job description' : 'Add job description for keyword match'}
              </button>
            </div>
          </div>
          {showJd && <textarea className="textarea" placeholder="Paste the job description here…" value={jd} onChange={(e) => setJd(e.target.value)} aria-label="Job description" />}
          <button className="btn lg" onClick={run} disabled={mode === 'upload' ? !file : text.trim().length < 20}>
            <Icon name="zap" size={20} /> Review my resume
          </button>
          <p className="faint" style={{ fontSize: '0.85rem' }}>
            Heads up: scores here measure PM-resume quality and parse-ability. No real ATS publishes a 0–100 number, so treat any “ATS score” (ours included) as a diagnostic, not a guarantee.
          </p>
        </div>
      )}
    </div>
  )
}
