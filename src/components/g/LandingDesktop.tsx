import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Ico } from './icons'
import { GAuth, GScan, GToast } from './shared'
import { COMPANIES, CURR, CURRENCIES, currencyLabel, LEVELS, REWRITE_STEPS, SAMPLE_JOBS, TRACKS } from '../../lib/g/data'
import { useLanding, type Theme } from '../../lib/g/useLanding'
import { analysisStore } from '../../lib/g/store'
import { saveHandoffFromAnalysis } from '../../lib/g/handoff'
import { ReportView } from './ReportView'

const ARC = 314

export function LandingDesktop({ theme, toggleTheme, view }: { theme: Theme; toggleTheme: () => void; view: 'landing' | 'report' }) {
  const analysis = useSyncExternalStore(analysisStore.subscribe, analysisStore.get)
  const L = useLanding()
  const [authOpen, setAuthOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [fixes, setFixes] = useState<number[]>([])
  const [cur, setCur] = useState<'INR' | 'USD'>('INR')
  const dz = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  useEffect(() => { const c = () => setMenu(null); document.addEventListener('click', c); return () => document.removeEventListener('click', c) }, [])
  useEffect(() => {
    if (!L.nudge || !dz.current) return
    dz.current.classList.remove('nudge'); void dz.current.offsetWidth; dz.current.classList.add('nudge')
  }, [L.nudge])

  const score = Math.min(100, 85 + fixes.reduce((a, b) => a + b, 0))
  const C = CURR[cur]
  const toDrop = (e: React.MouseEvent) => { e.preventDefault(); document.getElementById('drop')?.scrollIntoView({ behavior: 'smooth' }); setTimeout(L.nudgeOnly, 250) }
  const openAuthFromNav = () => { if (L.user) return L.go('/score'); saveHandoffFromAnalysis(); setAuthOpen(true) }

  const pill = (id: 'level' | 'track' | 'company' | 'currency', placeholder: string, opts: { label: string }[]) => {
    const val = id === 'currency' ? currencyLabel(L.picks.currency) : L.picks[id]
    return (
      <span className="inline-pick">
        <button type="button" className={'pick-btn' + (val ? '' : ' empty')} aria-haspopup="listbox" aria-expanded={menu === id} onClick={(e) => { e.stopPropagation(); setMenu(menu === id ? null : id) }}>
          <span className="pick-label">{val ?? placeholder}</span><Ico n="down" sm />
        </button>
        <div className={'pick-menu' + (menu === id ? ' g-open' : '')} role="listbox">
          {opts.map((o) => (
            <button type="button" role="option" aria-selected={val === o.label} className="pick-opt" key={o.label} onClick={(e) => { e.stopPropagation(); id === 'currency' ? L.setCurrency(CURRENCIES.find((c) => c.label === o.label)!.v) : L.setPicks({ ...L.picks, [id]: o.label }); setMenu(null) }}>{o.label}</button>
          ))}
        </div>
      </span>
    )
  }

  const stageTitle = L.reading ? 'Reading your resume…' : L.loaded ? `${L.loaded.name} loaded` : 'Drop your resume onto the scanner'
  const stageSub = L.reading ? 'This stays in your browser.' : L.loaded ? `${L.loaded.pageCount ? L.loaded.pageCount + ' page' + (L.loaded.pageCount > 1 ? 's' : '') + ' detected. ' : ''}Hit “Review My Resume” below.` : 'Click to upload or drag a file here. We spot weak bullets and pay gaps in 30s.'

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand"><div className="brand-mark">PR</div>ProductRez</Link>
          <div className="nav-links">
            <a href="#preview">How It Works</a>
            <a href="#jobs">Early Access Jobs</a>
            <a href="#rewriter">Resume Rewrite</a>
          </div>
          <div className="nav-cta">
            <button className="g-btn btn-ghost" onClick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'} style={{ padding: '8px 10px' }}><Ico n={theme === 'dark' ? 'sun' : 'moon'} /></button>
            <button type="button" className="g-btn btn-ghost" onClick={openAuthFromNav}>{L.user ? 'Open app' : 'Sign In'}</button>
            <a href="#drop" className="g-btn btn-primary" onClick={toDrop}>Check My Resume</a>
          </div>
        </div>
      </nav>

      {view === 'report' && analysis ? (
        <ReportView v="d" a={analysis} signedIn={!!L.user} onSignIn={() => { saveHandoffFromAnalysis(); setAuthOpen(true) }} onBack={() => L.go('/')} go={L.go} />
      ) : (
      <>
      <section className="g-hero" id="drop">
        <div className="container hero-grid">
          <div>
            <div className="g-eyebrow"><span className="g-dot" /> Made Exclusively for Product Managers</div>
            <h1>Stop Getting Ghosted.<br /><span>Know What Hiring Managers Actually See.</span></h1>
            <p className="hero-sub">Get an honest 30-second teardown of your resume, market standing, and salary fit.</p>
            <div className="hero-proof">
              <span><Ico n="check" sm /> Free instant check · No signup</span>
              <span><Ico n="check" sm /> Calibrated to your level &amp; target companies</span>
              <span><Ico n="check" sm /> Actionable fixes, not generic fluff</span>
            </div>
          </div>

          <div className="drop-card">
            <div
              ref={dz}
              className={'drop-stage' + (over ? ' dragover' : '') + (L.reading ? ' reading' : '')}
              role="button" tabIndex={0} aria-label="Upload your resume"
              onClick={() => file.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), file.current?.click())}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); L.onFile(e.dataTransfer.files[0]) }}
            >
              <input ref={file} type="file" style={{ display: "none" }} accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { L.onFile(e.target.files?.[0]); e.target.value = '' }} />
              <div className="stage-grid">
                <div className="doc-float">
                  <div className="doc-name" /><div className="doc-role" /><div className="doc-b" /><div className="doc-b g-warn" /><div className="doc-b w80" /><div className="doc-b g-ok" /><div className="doc-b w65" /><div className="doc-b" />
                  <span className="pin-tag pin-1">No metric</span><span className="pin-tag pin-2">+14% delta</span>
                </div>
                <div className="stage-copy">
                  <div className="mini-kicker"><Ico n="sparkle" sm /> Instant PM Teardown</div>
                  <h3>{stageTitle}</h3>
                  <p>{stageSub}</p>
                  <div className="file-formats"><span>PDF</span><span>DOCX</span></div>
                </div>
              </div>
            </div>
            {L.fileError && <p className="drop-err" role="alert">{L.fileError}</p>}

            <div className="madlibs">
              <div style={{ fontSize: 11.5, color: L.autofilled ? 'var(--emerald)' : 'var(--muted)', marginBottom: 4, lineHeight: 1.4 }}>
                {L.autofilled ? 'Pre-filled from your resume. Click any pill to adjust:' : 'Auto-fills from your resume after upload, or pick manually:'}
              </div>
              I'm targeting {pill('level', 'Select level', LEVELS)} roles in {pill('track', 'PM focus', TRACKS)} at {pill('company', 'company type', COMPANIES)}, paid in {pill('currency', 'pick currency', CURRENCIES)}.
            </div>

            <div className={'jd-box' + (L.jdOpen ? ' g-open' : '')}>
              <textarea aria-label="Target job description" placeholder="Paste the job description here to see which exact skills you're missing..." value={L.jd} onChange={(e) => L.setJd(e.target.value)} />
            </div>

            <div className="cta-row">
              <button type="button" className="g-btn btn-primary" onClick={L.review}>Review My Resume <Ico n="arrow" /></button>
              <button type="button" className="jd-pill" onClick={() => L.setJdOpen(!L.jdOpen)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ico n={L.jdOpen ? 'minus' : 'plus'} sm /> {L.jdOpen ? 'Hide JD' : 'Target JD'}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="g-band" id="preview">
        <div className="container">
          <div className="section-head">
            <div className="kicker">What You Get in 30 Seconds</div>
            <h2>Your Entire PM Profile, Decoded in One View</h2>
            <p>Try the interactive score fixes and salary slider below to see how your report works. This is a sample, your report uses your own resume.</p>
          </div>
          <div className="bento-shell">
            <div className={'bento-collapse' + (expanded ? ' expanded' : '')}>
              <div className="bento-grid">
                <div className="bento-card bento-score">
                  <div className="b-head"><div className="b-title"><span className="b-icon"><Ico n="bars" sm /></span>PM Resume Score</div><span className="b-badge">Interactive</span></div>
                  <div className="gauge-wrap">
                    <div className="gauge-svg">
                      <svg viewBox="0 0 120 120"><circle className="gauge-bg" cx="60" cy="60" r="50" /><circle className="gauge-fg" cx="60" cy="60" r="50" style={{ strokeDashoffset: ARC - (ARC * score) / 100, stroke: score >= 90 ? 'var(--emerald)' : 'var(--accent)' }} /></svg>
                      <div className="gauge-center"><span className="gauge-val">{score}</span><span className="gauge-sub">{score >= 90 ? 'Interview Ready' : 'Strong'}</span></div>
                    </div>
                    <div className="mini-dims">
                      {[['Impact', 92], ['PM Craft', 96], ['Ownership', 91], ['Readability', 96], ['Experience', 85], ['Clarity', 88]].map(([n, v]) => (
                        <div className="mini-dim" key={n}><div className="mini-dim-top"><span>{n}</span><strong>{v}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${v}%` }} /></div></div>
                      ))}
                    </div>
                  </div>
                  <div className="fix-sim">
                    <span className="fix-sim-label">Click to simulate fixes:</span>
                    {[[5, 'Trim 6-bullet role (+5)'], [2, 'Vary "designed" opener (+2)']].map(([pts, t]) => (
                      <button type="button" key={t as string} aria-pressed={fixes.includes(pts as number)} className={'fix-chip' + (fixes.includes(pts as number) ? ' applied' : '')} onClick={() => setFixes((f) => (f.includes(pts as number) ? f.filter((x) => x !== pts) : [...f, pts as number]))}><Ico n="check" sm />{t}</button>
                    ))}
                  </div>
                </div>

                <div className="bento-card bento-xray">
                  <div className="b-head"><div className="b-title"><span className="b-icon"><Ico n="search" sm /></span>Line-by-Line Bullet X-Ray</div><span className="b-badge">Spots Missing Guardrails</span></div>
                  <div className="diff-stack">
                    <div className="diff-box before">
                      <div className="diff-label"><span style={{ color: 'var(--rose)' }}>Before: Sounds Like a Task List</span><span className="g-tag t-bad">Impact 0/3</span></div>
                      <p>"Automated customer support workflows using LLMs and collaborated with engineering to ship new dashboard features."</p>
                      <div className="pill-row"><span className="g-tag t-bad">No Metric</span><span className="g-tag t-warn">Missing CSAT Guardrail</span></div>
                    </div>
                    <div className="diff-box after">
                      <div className="diff-label"><span style={{ color: 'var(--emerald)' }}>After: Outcome + Quality Guardrail</span><span className="g-tag t-ok">Impact 3/3</span></div>
                      <p>"Shipped RAG support copilot across 3 regions, deflecting 31% of tier-1 tickets while holding CSAT flat at 4.6/5 via a 300-case eval set."</p>
                      <div className="pill-row"><span className="g-tag t-ok">Before/After Delta</span><span className="g-tag t-ok">Guardrail Proven</span><span className="g-tag t-ok">AI Evals</span></div>
                    </div>
                  </div>
                </div>

                <div className="bento-card bento-market">
                  <div className="b-head"><div className="b-title"><span className="b-icon"><Ico n="globe" sm /></span>Market Standing &amp; Career Story</div><span className="b-badge">Top 12%</span></div>
                  <div className="pct-bar-wrap">
                    <div className="pct-top"><div><span className="pct-big">88th</span> <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>percentile among Senior PMs</span></div><span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--emerald)' }}>Interview Ready</span></div>
                    <div className="pct-track"><div className="pct-marker" /></div>
                  </div>
                  <div className="track-grid">
                    {[['94%', 'Core PM'], ['80%', 'Growth'], ['71%', 'B2B SaaS'], ['61%', 'AI / ML']].map(([v, n]) => <div className="track-pill" key={n}><strong>{v}</strong><span>{n}</span></div>)}
                  </div>
                  <div className="story-split">
                    <div className="story-box"><h4 style={{ color: 'var(--emerald)' }}>+ Career Strength</h4>Founder to Product Leader arc signals high ownership &amp; 78% metric density.</div>
                    <div className="story-box"><h4 style={{ color: 'var(--amber)' }}>! Narrative Risk</h4>Older roles show 90% metrics vs. 63% in your latest role. Lead with recent wins.</div>
                  </div>
                </div>

                <div className="bento-card bento-comp">
                  <div className="b-head">
                    <div className="b-title"><span className="b-icon"><Ico n="dollar" sm /></span>Salary &amp; Expectation Check</div>
                    <div className="curr-switch">
                      {(['INR', 'USD'] as const).map((k) => <button type="button" key={k} className={'curr-btn' + (cur === k ? ' g-active' : '')} aria-pressed={cur === k} onClick={() => setCur(k)}>{k === 'INR' ? 'INR (L)' : 'USD ($k)'}</button>)}
                    </div>
                  </div>
                  <div className="g-band-vis">
                    <div className="band-labels"><span>{C.min}</span><span style={{ color: 'var(--ink)' }}>{C.mid}</span><span>{C.max}</span></div>
                    <div className="band-rail"><div className="band-sweet" /><div className="sal-pin cur" style={{ left: C.pinC }} title="Sample Current" /><div className="sal-pin g-exp" style={{ left: C.pinE }} title="Sample Expected" /></div>
                    <div className="pill-row" style={{ marginTop: 12 }}><span className="g-tag t-warn">{C.cur}</span><span className="g-tag t-ok">{C.exp}</span></div>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 10 }}>{C.note}</p>
                  </div>
                  <div className="fix-sim">
                    <span className="fix-sim-label">Unlocked after your free resume check.</span>
                    <a href="#drop" onClick={toDrop} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Check your own numbers <Ico n="arrow" sm /></a>
                  </div>
                </div>
              </div>
            </div>
            <div className="bento-fade">
              <button type="button" className="bento-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span>{expanded ? 'Collapse Preview' : 'Expand Full 30s Preview'}</span><Ico n={expanded ? 'up' : 'down'} sm /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="jobs-band" id="jobs">
        <div className="container">
          <div className="jobs-top">
            <div><h2>Early Access PM Jobs. Gone in 72h.</h2><p>Matched to your resume and pay band. No stale listings.</p></div>
            <button type="button" className="jobs-cta" onClick={openAuthFromNav} style={{ border: 'none', cursor: 'pointer' }}>Unlock Your Matches <Ico n="arrow" sm /></button>
          </div>
          <div className="ticket-grid">
            {SAMPLE_JOBS.map((j) => (
              <a key={j.role} href="/jobs" className="g-ticket" onClick={(e) => { e.preventDefault(); openAuthFromNav() }}>
                <div className="ticket-top"><span>{j.co}</span><span className="ticket-time">{j.ago}</span></div>
                <div><h3>{j.role}</h3><div className="ticket-loc">{j.loc}</div></div>
                <div className="ticket-foot"><span className="ticket-match">{j.match}% Match</span><Ico n="arrow" sm /></div>
              </a>
            ))}
          </div>
          <p className="sample-note" style={{ color: 'rgba(9,9,11,.7)' }}>Sample listings shown. Your real matches appear after you sign in.</p>
        </div>
      </section>

      <section className="g-band" id="rewriter">
        <div className="container">
          <div className="section-head">
            <div className="kicker">Score-Guaranteed Rewrite</div>
            <h2>We Only Deliver Your New Resume If It Beats Your Original Score</h2>
            <p>Rewritten to PM standards and sent to your inbox in up to 24 hours.</p>
          </div>
          <div className="rw-shell">
            <div className="rw-steps">
              {REWRITE_STEPS.map((s, i) => (
                <div className="rw-step" key={s.t}>
                  <div className="rw-step-top"><span className="rw-ico"><Ico n={s.ico} /></span><span className="rw-num">STEP 0{i + 1}</span></div>
                  <h3>{s.t}</h3><p>{s.d}</p>
                </div>
              ))}
            </div>
            <div className="rw-gate">
              <div className="gate-meter">
                <div className="gate-kicker"><Ico n="shield" sm /> Our Quality Promise (Up to 24h)</div>
                <div className="score-jump">
                  <div className="sj-box"><span>Your Upload</span><strong>Baseline</strong></div>
                  <div className="sj-arrow"><Ico n="arrow" /><span>Must Beat</span></div>
                  <div className="sj-box win"><span>Delivered</span><strong>Higher</strong></div>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>We only deliver your rewritten resume if we can get a better score than your original.</p>
              </div>
              <div className="gate-outcomes">
                <div className="outcome-row"><span className="out-ico g-ok"><Ico n="check" sm /></span><div><h4>Beats Original Score: Sent Within 24 Hours</h4><p>You receive your upgraded, ready-to-apply resume in your chosen template along with your new score breakdown.</p></div></div>
                <div className="outcome-row"><span className="out-ico ask"><Ico n="chat" sm /></span><div><h4>Needs More Details? We Ask You First</h4><p>If your draft needs stronger project details or we have follow-up questions to lift your score, we reach out, gather your inputs, and deliver a higher-scoring final resume.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <span>ProductRez · Built exclusively for Product Managers</span>
          <div className="footer-links">
            <a href="mailto:hello@productrez.com">Contact</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
      </>
      )}

      <GToast msg={L.toast} />
      <GScan open={L.scan.open} step={L.scan.step} sub={`Calibrating to ${L.picks.level ?? 'your'} ${L.picks.track ?? 'PM'} roles...`} />
      <GAuth open={authOpen} title={view === 'report' ? 'Sign in to unlock your full report' : 'Sign in to ProductRez'} onClose={() => setAuthOpen(false)} onDone={() => { setAuthOpen(false); if (view !== 'report') L.go('/score') }} />
    </>
  )
}
