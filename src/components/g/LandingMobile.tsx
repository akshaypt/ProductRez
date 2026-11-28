import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Ico } from './icons'
import { GAuth, GScan, GToast } from './shared'
import { COMPANIES, CURR, CURRENCIES, currencyLabel, LEVELS, SAMPLE_JOBS, TRACKS } from '../../lib/g/data'
import { useLanding, type Theme } from '../../lib/g/useLanding'
import { analysisStore } from '../../lib/g/store'
import { saveHandoffFromAnalysis } from '../../lib/g/handoff'
import { ReportView } from './ReportView'

const ARC = 220
type Sheet = 'level' | 'track' | 'company' | 'currency' | null
const OPTS = { level: LEVELS, track: TRACKS, company: COMPANIES, currency: CURRENCIES }
const TITLE = { level: 'Target level', track: 'PM focus', company: 'Company type', currency: 'Currency for pay' }

export function LandingMobile({ theme, toggleTheme, view }: { theme: Theme; toggleTheme: () => void; view: 'landing' | 'report' }) {
  const L = useLanding()
  const analysis = useSyncExternalStore(analysisStore.subscribe, analysisStore.get)
  const [authOpen, setAuthOpen] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [expanded, setExpanded] = useState(false)
  const [fixes, setFixes] = useState<number[]>([])
  const [cur, setCur] = useState<'INR' | 'USD'>('INR')
  const dz = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!L.nudge || !dz.current) return
    dz.current.classList.remove('nudge'); void dz.current.offsetWidth; dz.current.classList.add('nudge')
  }, [L.nudge])

  const score = Math.min(100, 85 + fixes.reduce((a, b) => a + b, 0))
  const C = CURR[cur]
  const openAuthFromNav = () => { if (L.user) return L.go('/score'); saveHandoffFromAnalysis(); setAuthOpen(true) }
  const toTop = (e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(L.nudgeOnly, 300) }

  const pill = (id: 'level' | 'track' | 'company' | 'currency', placeholder: string) => {
    const val = id === 'currency' ? currencyLabel(L.picks.currency) : L.picks[id]
    return <button type="button" className={'pick-btn' + (val ? '' : ' empty')} onClick={() => setSheet(id)} aria-haspopup="dialog"><span>{val ?? placeholder}</span><Ico n="down" sm /></button>
  }

  const title = L.reading ? 'Reading your resume…' : L.loaded ? `${L.loaded.name} loaded` : 'Tap to upload your resume'
  const sub = L.reading ? 'This stays on your phone.' : L.loaded ? `${L.loaded.pageCount ? L.loaded.pageCount + ' page' + (L.loaded.pageCount > 1 ? 's' : '') + ' detected. ' : ''}Tap Review My Resume.` : 'PDF or DOCX · Teardown in 30s'

  return (
    <>
      <header className="m-nav">
        <Link to="/" className="brand"><div className="brand-mark">PR</div>ProductRez</Link>
        <div className="nav-right">
          <button className="g-icon-btn" onClick={toggleTheme} aria-label="Toggle theme"><Ico n={theme === 'dark' ? 'sun' : 'moon'} /></button>
          {view === 'landing' && <button type="button" className="signin-link" onClick={openAuthFromNav} style={{ cursor: 'pointer' }}>{L.user ? 'Open app' : 'Sign In'}</button>}
        </div>
      </header>

      {view === 'report' && analysis ? (
        <ReportView v="m" a={analysis} signedIn={!!L.user} onSignIn={() => { saveHandoffFromAnalysis(); setAuthOpen(true) }} onBack={() => L.go('/')} go={L.go} />
      ) : (
        <>
          <section className="m-hero" id="top">
            <div className="g-eyebrow"><span className="g-dot" /> Made Exclusively for Product Managers</div>
            <h1>Stop Getting Ghosted.<br /><span>Know What Hiring Managers Actually See.</span></h1>
            <p className="m-hero-sub">Get an honest 30-second teardown of your resume, market standing, and salary fit.</p>
            <div className="m-hero-proof">
              <span><Ico n="check" sm /> Free instant check · No signup</span>
              <span><Ico n="check" sm /> Calibrated to your level &amp; target companies</span>
              <span><Ico n="check" sm /> Actionable fixes, not generic fluff</span>
            </div>

            <div className="drop-card">
              <div ref={dz} className={'drop-stage' + (L.reading ? ' reading' : '')} role="button" tabIndex={0} aria-label="Upload your resume" onClick={() => file.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), file.current?.click())}>
                <input ref={file} type="file" style={{ display: "none" }} accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { L.onFile(e.target.files?.[0]); e.target.value = '' }} />
                <div className="mini-sheet"><div className="ms-n" /><div className="ms-r" /><div className="ms-l" /><div className="ms-l g-w" /><div className="ms-l g-ok" /><div className="ms-l" /></div>
                <div className="drop-copy"><h3>{title}</h3><p>{sub}</p></div>
              </div>
              {L.fileError && <p className="drop-err" role="alert">{L.fileError}</p>}

              <div className="madlibs">
                <div style={{ fontSize: 11, color: L.autofilled ? 'var(--emerald)' : 'var(--muted)', lineHeight: 1.3, marginBottom: 4 }}>{L.autofilled ? 'Pre-filled from your resume. Tap to adjust:' : 'Auto-fills after upload, or tap to pick:'}</div>
                I'm targeting {pill('level', 'Select level')} roles in {pill('track', 'PM focus')} at {pill('company', 'company type')}, paid in {pill('currency', 'pick currency')}.
              </div>

              <div className={'jd-box' + (L.jdOpen ? ' g-open' : '')}>
                <textarea aria-label="Target job description" placeholder="Paste target JD here..." value={L.jd} onChange={(e) => L.setJd(e.target.value)} />
              </div>

              <div className="card-actions">
                <button type="button" className="btn-main" onClick={L.review}>Review My Resume <Ico n="arrow" sm /></button>
                <button type="button" className="btn-jd" onClick={() => L.setJdOpen(!L.jdOpen)}><Ico n={L.jdOpen ? 'minus' : 'plus'} sm /> JD</button>
              </div>
            </div>
          </section>

          <section className="m-band" id="preview">
            <div className="kicker">What You Get in 30 Seconds</div>
            <h2>Your Entire PM Profile, Decoded in One View</h2>
            <p className="sample-note" style={{ marginTop: -6, marginBottom: 12 }}>Sample data. Your report uses your own resume.</p>
            <div className="bento-shell">
              <div className={'bento-collapse' + (expanded ? ' expanded' : '')}>
                <div className="m-card">
                  <div className="m-card-head"><span>PM Resume Score</span><span className="g-tag t-ok">{score >= 90 ? 'Interview Ready' : 'Strong'}</span></div>
                  <div className="score-row">
                    <div className="gauge-mini">
                      <svg viewBox="0 0 84 84"><circle className="gauge-bg" cx="42" cy="42" r="35" /><circle className="gauge-fg" cx="42" cy="42" r="35" style={{ strokeDashoffset: ARC - (ARC * score) / 100, stroke: score >= 90 ? 'var(--emerald)' : 'var(--accent)' }} /></svg>
                      <div className="gauge-num">{score}</div>
                    </div>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[['Impact', 92], ['PM Craft', 96], ['Ownership', 91], ['Readability', 96], ['Experience', 85], ['Clarity', 88]].map(([n, v]) => (
                        <div key={n} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 11 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{n}</span><strong>{v}</strong></div></div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 10 }}>Tap to simulate fixes:</div>
                  {[[5, 'Trim 6-bullet role', '+5'], [2, 'Vary "designed" opener', '+2']].map(([pts, t, g]) => (
                    <button type="button" key={t as string} aria-pressed={fixes.includes(pts as number)} className={'fix-chip' + (fixes.includes(pts as number) ? ' applied' : '')} onClick={() => setFixes((f) => (f.includes(pts as number) ? f.filter((x) => x !== pts) : [...f, pts as number]))}><span>{t}</span><span>{g}</span></button>
                  ))}
                </div>

                <div className="m-card">
                  <div className="m-card-head"><span>Line-by-Line Bullet X-Ray</span><span className="g-tag t-warn">Spots Missing Guardrails</span></div>
                  <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--rose)', marginBottom: 4 }}><span>BEFORE: TASK LIST</span><span>IMPACT 0/3</span></div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>"Automated customer support workflows using LLMs and collaborated with engineering to ship new dashboard features."</p>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}><span className="g-tag t-bad">No Metric</span><span className="g-tag t-warn">Missing CSAT Guardrail</span></div>
                  </div>
                  <div style={{ background: 'var(--emerald-soft)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 10, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--emerald)', marginBottom: 4 }}><span>AFTER: OUTCOME + GUARDRAIL</span><span>IMPACT 3/3</span></div>
                    <p style={{ fontSize: 12, color: 'var(--ink)' }}>"Shipped RAG support copilot across 3 regions, deflecting 31% of tier-1 tickets while holding CSAT flat at 4.6/5 via a 300-case eval set."</p>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}><span className="g-tag t-ok">Before/After Delta</span><span className="g-tag t-ok">Guardrail Proven</span><span className="g-tag t-ok">AI Evals</span></div>
                  </div>
                </div>

                <div className="m-card">
                  <div className="m-card-head"><span>Market Standing &amp; Career Story</span><span className="g-tag t-ok">Top 12%</span></div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}><span><strong style={{ fontSize: 20, color: 'var(--accent)' }}>88th</strong> <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>percentile among Senior PMs</span></span><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)' }}>Interview Ready</span></div>
                    <div style={{ height: 6, borderRadius: 999, background: 'linear-gradient(90deg,var(--border),rgba(252,128,25,0.45),var(--emerald))', position: 'relative' }}><div style={{ position: 'absolute', top: '50%', left: '88%', transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface)' }} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
                    {[['94%', 'Core'], ['80%', 'Growth'], ['71%', 'B2B'], ['61%', 'AI/ML']].map(([v, n]) => <div key={n} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, textAlign: 'center' }}><strong style={{ display: 'block', fontSize: 13 }}>{v}</strong><span style={{ fontSize: 10, color: 'var(--muted)' }}>{n}</span></div>)}
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 11.5, color: 'var(--ink-2)' }}>
                    <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}><strong style={{ color: 'var(--emerald)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>+ Career Strength</strong>Founder to Product Leader arc signals high ownership &amp; 78% metric density.</div>
                    <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}><strong style={{ color: 'var(--amber)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>! Narrative Risk</strong>Older roles show 90% metrics vs. 63% in your latest role.</div>
                  </div>
                </div>

                <div className="m-card">
                  <div className="m-card-head">
                    <span>Salary &amp; Expectation Check</span>
                    <div style={{ display: 'inline-flex', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 7, padding: 2 }}>
                      {(['INR', 'USD'] as const).map((k) => <button type="button" key={k} aria-pressed={cur === k} onClick={() => setCur(k)} style={{ border: 'none', background: cur === k ? 'var(--accent)' : 'transparent', color: cur === k ? '#fff' : 'var(--muted)', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5, cursor: 'pointer' }}>{k === 'INR' ? 'INR (L)' : 'USD ($k)'}</button>)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}><span>{C.min}</span><span style={{ color: 'var(--ink)', textAlign: 'center' }}>{C.mid}</span><span>{C.max}</span></div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', position: 'relative', marginBottom: 10 }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '43%', width: '39%', borderRadius: 999, background: 'rgba(16,185,129,0.45)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: C.pinC, transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: 'var(--amber)', border: '2px solid var(--surface)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: C.pinE, transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}><span className="g-tag t-warn">{C.cur}</span><span className="g-tag t-ok">{C.exp}</span></div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{C.note}</p>
                </div>
              </div>
              <div className="bento-fade"><button type="button" className="bento-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span>{expanded ? 'Collapse Preview' : 'Expand Full 30s Preview'}</span><Ico n={expanded ? 'up' : 'down'} sm /></button></div>
            </div>
          </section>

          <section className="jobs-band" id="jobs">
            <div className="jobs-head"><h2>Early Access PM Jobs. Gone in 72h.</h2><p>Swipe to explore roles matched to your resume. Sample listings shown.</p></div>
            <div className="ticket-carousel">
              {SAMPLE_JOBS.map((j) => (
                <a key={j.role} href="/jobs" className="m-ticket" onClick={(e) => { e.preventDefault(); openAuthFromNav() }}>
                  <div className="mt-top"><span>{j.co}</span><span className="mt-time">{j.ago}</span></div>
                  <div><h3>{j.role}</h3><div className="mt-loc">{j.loc}</div></div>
                  <div className="mt-foot"><span>{j.match}% Match</span><Ico n="arrow" sm /></div>
                </a>
              ))}
            </div>
          </section>

          <section className="m-band" id="rewriter">
            <div className="kicker">Score-Guaranteed Rewrite</div>
            <h2>We Only Deliver If It Beats Your Original Score</h2>
            <div className="timeline">
              {[['1. Upload Existing Resume', 'Drop your current PDF or DOCX.'], ['2. Pick a Template', 'Choose a clean, single-column PM layout.'], ['3. Quick Questionnaire', 'Add any missing project metrics in 60s.'], ['4. Submit & Get It in 24h', 'If we need more project details to lift your score, we ask first.']].map(([t, d]) => (
                <div className="tl-item" key={t}><span className="tl-dot" /><h3>{t}</h3><p>{d}</p></div>
              ))}
            </div>
            <div className="gate-card">
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Our Quality Promise</div>
              <div className="gate-pair">
                <div className="gp-box"><span>Your Upload</span><strong>Baseline</strong></div>
                <Ico n="arrow" style={{ color: 'var(--accent)' }} />
                <div className="gp-box win"><span>Delivered</span><strong>Higher</strong></div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>We only deliver your rewritten resume if we can get a better score than your original.</p>
            </div>
          </section>

          <footer className="m-footer">
            <div className="mf-links"><a href="mailto:hello@productrez.com">Contact</a><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
            <span>ProductRez · Built exclusively for Product Managers</span>
          </footer>
        </>
      )}

      {view === 'landing' && (
        <div className="sticky-cta"><a href="#top" className="btn-main" onClick={toTop}>Check My Resume <Ico n="arrow" sm /></a></div>
      )}

      <GToast msg={L.toast} />
      <GScan open={L.scan.open} plan={L.scan.plan} sub={`Calibrating to ${L.picks.level ?? 'your'} ${L.picks.track ?? 'PM'} roles...`} />
      <div className={'sheet-backdrop' + (sheet ? ' g-open' : '')} onClick={() => setSheet(null)} role="presentation">
        {sheet && (
          <div className="sheet" role="dialog" aria-modal="true" aria-label={TITLE[sheet]} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{TITLE[sheet]}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {OPTS[sheet].map((o) => <button type="button" className="sheet-opt" key={o.label} onClick={() => { sheet === 'currency' ? L.setCurrency(CURRENCIES.find((c) => c.label === o.label)!.v) : L.setPicks({ ...L.picks, [sheet]: o.label }); setSheet(null) }}>{o.label}</button>)}
            </div>
          </div>
        )}
      </div>
      <GAuth open={authOpen} title={view === 'report' ? 'Sign in to unlock your full report' : 'Sign in to ProductRez'} onClose={() => setAuthOpen(false)} onDone={() => { setAuthOpen(false); if (view !== 'report') L.go('/score') }} />
    </>
  )
}
