import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { reviewBullet, scoreResume } from '@scoring'
import { TEMPLATES } from '@latex'
import { useApp } from '../state/app'
import { Icon } from '../components/Icon'
import { ResumePreview } from '../components/ResumePreview'
import { Reveal } from '../components/Reveal'
import { MkFooter, MkNav } from '../components/MarketingChrome'
import { AuthModal } from '../components/AuthModal'
import { PriceCards } from './Pricing'
import { sampleResume } from '../lib/resume'
import { useTween } from '../lib/useTween'
import { PLANS, rupees } from '../data/plans'

/* ------------------------------------------------------------------ hero: live review */
const DEMO: { weak: string; strong: string }[] = [
  { weak: 'Responsible for managing the product backlog and working with engineers', strong: 'Prioritised a 140-item backlog across 3 squads, cutting average cycle time from 21 to 13 days' },
  { weak: 'Helped improve onboarding for new users', strong: 'Redesigned onboarding after 30 user interviews, lifting 7-day activation from 38% to 52%' },
  { weak: 'Worked on pricing page changes', strong: 'Ran 6 pricing-page A/B tests, raising trial-to-paid conversion 14% (from 4.1% to 4.7%)' },
  { weak: 'Participated in launch planning with marketing and sales', strong: 'Led go-to-market for the Teams plan with Sales and Marketing, reaching $1.2M ARR in two quarters' },
]
const demoText = (bullets: string[]) => `Jordan Lee
Product Manager
jordan.lee@example.com | +1 415 555 0100 | San Francisco, CA | linkedin.com/in/jordanlee

Summary
Product manager with four years in B2B SaaS, focused on onboarding, pricing and growth. Comfortable working across engineering, design, sales and marketing.

Experience
Product Manager, Acme Cloud    San Francisco, CA    Jan 2022 - Present
${bullets.map((b) => `• ${b}`).join('\n')}

Associate Product Manager, Beta Systems    Austin, TX    Jul 2020 - Dec 2021
• Wrote requirements and acceptance criteria for the reporting module, shipped to 2,400 customers
• Analysed funnel data in SQL and Amplitude to find the three largest drop-offs in signup, reducing abandonment 9%
• Interviewed 18 customers to validate the roadmap and cut two low-value features

Education
B.S. Business Administration, State University    2016 - 2020

Skills
Product: Roadmapping, Discovery, Experimentation, Pricing · Tools: SQL, Amplitude, Jira, Figma`

const scoreColor = (n: number) => (n >= 80 ? 'var(--green)' : n >= 60 ? 'var(--accent)' : n >= 45 ? 'var(--amber)' : 'var(--red)')

function HeroDemo() {
  const [fixed, setFixed] = useState<boolean[]>([false, false, false, false])
  const bullets = DEMO.map((d, i) => (fixed[i] ? d.strong : d.weak))
  const report = useMemo(() => scoreResume({ text: demoText(bullets), targetLevel: 'pm' }, new Date('2026-11-04')), [fixed]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useTween(report.overall)
  const allFixed = fixed.every(Boolean)
  const toggle = (i: number) => setFixed((f) => f.map((x, j) => (j === i ? !x : x)))
  return (
    <div className="frame demo" data-testid="hero-demo">
      <div className="frame-bar"><i /><i /><i /><span className="tt">Resume review · example</span></div>
      <div className="demo-body">
        <div className="demo-doc">
          <div className="who">Jordan Lee</div>
          <div className="role">Product Manager, Acme Cloud · Jan 2022 – Present</div>
          {DEMO.map((_, i) => {
            const r = reviewBullet(bullets[i], 'experience', '', true)
            return (
              <div key={i} className={`demo-b ${fixed[i] ? 'better' : ''}`}>
                <div>
                  {bullets[i]}
                  <div className="dots" aria-label={`impact ${r.impact} of 3`}>
                    {[0, 1, 2].map((k) => <i key={k} style={{ background: r.impact > k ? (r.impact === 3 ? 'var(--green)' : r.impact === 2 ? '#7fb89a' : 'var(--amber)') : undefined }} />)}
                  </div>
                </div>
                <button onClick={() => toggle(i)} aria-pressed={fixed[i]}>{fixed[i] ? 'Undo' : 'Rewrite'}</button>
              </div>
            )
          })}
          <div className="demo-foot">
            <button className="btn sm ghost" onClick={() => setFixed(allFixed ? [false, false, false, false] : [true, true, true, true])}>
              {allFixed ? 'Reset example' : 'Improve all four'}
            </button>
          </div>
        </div>
        <div className="demo-score" role="img" aria-label={`Example score ${report.overall} out of 100`}>
          <div>
            <div className="lbl">Score</div>
            <div className="big" style={{ margin: '0.5rem 0 0.7rem' }}>{shown}<small>/ 100</small></div>
            <div className="mini-bar"><i style={{ width: `${report.overall}%`, background: scoreColor(report.overall) }} /></div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', fontWeight: 600, color: scoreColor(report.overall) }}>{report.gradeLabel.split('·')[0].trim()}</div>
          </div>
          <div className="demo-tickets">
            {report.findings.slice(0, 3).map((f) => (
              <div key={f.id}><span className={`chip ${f.priority.toLowerCase()}`}>{f.priority}</span><span>{f.title}</span></div>
            ))}
            {report.findings.length === 0 && <div><span className="chip good">OK</span><span>No blockers remaining</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ bullet x-ray */
const EXAMPLES = ['Responsible for managing the product backlog and working with engineers', 'Led the redesign of onboarding, improving activation', 'Launched usage-based pricing for 12,000 SMB accounts, cutting churn from 5.1% to 3.8% in two quarters']
const VERDICT = ['Activity, not impact. A hiring manager learns nothing about what changed.', 'You hint at an outcome but give no number. Add the metric and the size of the change.', 'Quantified. Add a before → after or a timeframe to make it airtight.', 'Hiring-manager ready: outcome, number and change are all there.']
const FLAG: Record<string, string> = { 'no-metric': 'No metric', 'weak-verb': 'Weak opener', 'no-verb': 'No action verb', 'too-long': 'Too long', 'too-short': 'Too short', 'first-person': 'First person', passive: 'Passive voice', buzzword: 'Buzzword' }

function Xray() {
  const [text, setText] = useState(EXAMPLES[0])
  const r = useMemo(() => reviewBullet(text.trim() || ' ', 'experience', '', true), [text])
  const level = text.trim().length < 4 ? -1 : r.impact
  return (
    <div className="card xray" data-testid="xray">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h3>Test a bullet</h3>
        <span className="faint" style={{ fontSize: '0.78rem' }}>Runs in your browser</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Resume bullet to analyse" />
      <div className="xray-meter" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={level > i ? `on${level - 1}` : ''} />)}</div>
      <p style={{ fontWeight: 550, fontSize: '0.93rem' }} aria-live="polite">{level < 0 ? 'Type a bullet to see its impact rating.' : `Impact ${r.impact}/3: ${VERDICT[r.impact]}`}</p>
      <div className="row" style={{ gap: 6, margin: '10px 0 14px', minHeight: 22 }}>{level >= 0 && r.flags.map((f) => <span key={f} className="chip bad">{FLAG[f]}</span>)}{level >= 0 && r.flags.length === 0 && <span className="chip good">No issues found</span>}</div>
      <div className="row" style={{ gap: 6 }}><span className="faint" style={{ fontSize: '0.78rem' }}>Examples</span>{EXAMPLES.map((e, i) => <button key={i} className="chip btnish" onClick={() => setText(e)}>{i + 1}</button>)}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ sections */
const RUBRIC: [string, number, string][] = [
  ['Impact & metrics', 30, 'Quantified outcomes, before → after changes, and whether the first bullets under each role lead with results.'],
  ['Product craft', 20, 'Evidence for discovery, strategy, prioritization, execution, data, go-to-market, technical fluency and influence.'],
  ['Ownership & scope', 18, 'Ownership verbs instead of “helped”, and scope that matches the level you are targeting.'],
  ['ATS & structure', 18, 'Clean text extraction, standard headings, parsable dates and contact details, sensible length.'],
  ['Writing clarity', 14, 'Bullet length, repeated openers, buzzwords, first-person and passive voice.'],
]

function TemplateStage() {
  const [i, setI] = useState(1)
  const data = useMemo(() => sampleResume(), [])
  const t = TEMPLATES[i]
  return (
    <div className="tpl-stage">
      <div className="tpl-list" role="tablist" aria-label="Templates">
        {TEMPLATES.map((x, k) => (
          <button key={x.id} className="tpl-li" role="tab" aria-selected={i === k} onClick={() => setI(k)}>
            <b>{x.name}</b>
            <span>{x.bestFor}</span>
          </button>
        ))}
      </div>
      <div className="tpl-big">
        <div className="doc" key={t.id} style={{ animation: 'pageIn .3s var(--ease)' }}>
          <ResumePreview data={data} template={t.id} accent={t.accentDefault} paper="letter" fontSize={t.fontSize} showBreaks={false} />
        </div>
      </div>
    </div>
  )
}

const SAMPLE_JOBS = [
  ['Senior Product Manager, Payments', 'Lumen Pay', 'San Francisco, CA', 'US', 'Today'],
  ['Product Manager, AI Assistants', 'Tandem AI', 'Remote, United States', 'US', 'Today'],
  ['Associate Product Manager', 'Chaiwala Commerce', 'Gurugram, India', 'IN', 'Today'],
  ['Product Manager, Fintech Lending', 'Kiln Finance', 'Bengaluru, India', 'IN', 'Yesterday'],
  ['Group Product Manager, Platform', 'Halcyon Cloud', 'New York, NY', 'US', 'Yesterday'],
  ['Senior Product Manager, Payments', 'Rupee Rail', 'Mumbai, India', 'IN', 'Yesterday'],
] as const

function JobsTable() {
  const [c, setC] = useState<'all' | 'US' | 'IN'>('all')
  const rows = SAMPLE_JOBS.filter((j) => c === 'all' || j[3] === c)
  return (
    <div>
      <div className="rows">
        <div className="rows-head">
          <div className="seg" role="group" aria-label="Country">{([['all', 'All'], ['IN', 'India'], ['US', 'United States']] as const).map(([v, l]) => <button key={v} aria-pressed={c === v} onClick={() => setC(v)}>{l}</button>)}</div>
          <span className="chip accent">Posted in the last 2 days</span>
        </div>
        {rows.map((j) => (
          <div className="row-line" key={j[0] + j[1]}>
            <div className="mono-tile">{j[1][0]}</div>
            <div><div className="t">{j[0]}</div><div className="s">{j[1]} · {j[2]}</div></div>
            <span className={`chip ${j[4] === 'Today' ? 'accent' : ''}`}>{j[4]}</span>
          </div>
        ))}
      </div>
      <p className="faint" style={{ fontSize: '0.78rem', marginTop: 8 }}>Sample listings for illustration. Live listings link to the original posting.</p>
    </div>
  )
}

const STEPS = ['Understand the PM job', 'Learn to talk to customers', 'Craft your transition story', 'Get data-literate (SQL)', 'Run a mini product project', 'Practise interviews']
function PathCard() {
  const [done, setDone] = useState<boolean[]>([true, true, false, false, false, false])
  const pct = Math.round((done.filter(Boolean).length / STEPS.length) * 100)
  const shown = useTween(pct, 500)
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="faint" style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Guided path · 8 weeks</div><h3 className="serif" style={{ fontSize: '1.5rem', marginTop: 4, fontWeight: 500 }}>Break into product management</h3></div>
          <div style={{ textAlign: 'right' }}><div className="serif" style={{ fontSize: '2.2rem', lineHeight: 1, letterSpacing: '-0.03em' }}>{shown}%</div><div className="faint" style={{ fontSize: '0.74rem' }}>complete</div></div>
        </div>
        <div className="mini-bar" style={{ marginTop: 14 }}><i style={{ width: `${pct}%`, background: 'var(--ink)' }} /></div>
      </div>
      {STEPS.map((s, i) => (
        <button key={s} aria-pressed={done[i]} onClick={() => setDone((d) => d.map((x, j) => (j === i ? !x : x)))} style={{ all: 'unset', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 12, alignItems: 'center', width: '100%', padding: '0.8rem 1.25rem', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--border-strong)', display: 'grid', placeItems: 'center', background: done[i] ? 'var(--ink)' : 'transparent', color: 'var(--ink-fg)' }}>{done[i] && <Icon name="check" size={12} strokeWidth={3} />}</span>
          <span style={{ opacity: done[i] ? 0.55 : 1, textDecoration: done[i] ? 'line-through' : 'none' }}>{s}</span>
          <span className="faint mono">W{i + 1}</span>
        </button>
      ))}
    </div>
  )
}

const FAQ = [
  ['Does a high score guarantee I’ll pass the ATS?', 'No, and be wary of anyone who says so. No real applicant tracking system publishes a 0–100 score. We measure what is measurable: whether your text parses cleanly, whether the structure is standard, and whether your bullets show the impact, ownership and PM competencies hiring managers screen for. Treat the score as a diagnostic, not a guarantee.'],
  ['Why LaTeX?', 'LaTeX produces a clean, single-column PDF with a real text layer and standard fonts, exactly what parsers want, with layout that stays stable on every device. Compile the .tex in Overleaf in one click, or use the quick print-to-PDF option.'],
  ['What do I get for free?', 'One full resume score per account with the complete fix backlog. The Writer, daily jobs and the learning library are in Pro.'],
  ['Where do the jobs come from?', 'Public LinkedIn job listings for product roles in the US and India, collected once each morning. Anything older than two days is dropped. You apply on LinkedIn.'],
  ['Is my resume private?', 'PDFs are read in your browser. To compute your score we send the extracted text to our scoring service and keep your latest report (including the parsed resume) so you can revisit it. It is visible only to your account, and we never sell or share it. See the privacy page for details.'],
  ['Do plans renew automatically?', 'No. Every plan is a one-time payment. If you buy again while active, the time is added.'],
] as const

export default function Landing() {
  const { user, openAuth, api } = useApp()
  const nav = useNavigate()
  const [counts, setCounts] = useState<{ US: number; IN: number; total: number } | null>(null)
  useEffect(() => {
    api?.jobCounts().then(setCounts).catch(() => {})
  }, [api])
  const start = () => (user ? nav('/score') : openAuth('Create a free account. Your first resume score is on us.'))

  return (
    <div className="mk-wrap">
      <MkNav onHome />

      <section className="section hero">
        <div>
          <div className="eyebrow">For product managers · United States and India</div>
          <h1>The resume workspace for product managers.</h1>
          <p className="lead">Score your resume against how PM hiring managers actually screen. Rebuild it in ATS-safe LaTeX. Apply to roles posted in the last two days.</p>
          <div className="cta">
            <button className="btn lg" onClick={start} data-testid="hero-cta">Get your free score <Icon name="arrow" size={16} /></button>
            <Link className="arrow-link" to="/methodology">How scoring works <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="facts">
            <div><b>1 free score</b>No card required</div>
            <div><b>Read in-browser</b>PDFs are never uploaded</div>
            <div><b>Pay once</b>No auto-renew</div>
          </div>
        </div>
        <div className="hero-in"><HeroDemo /></div>
      </section>

      <section className="section tight" aria-label="At a glance">
        <Reveal>
          <div className="specs">
            <div><b>8</b><span>PM competencies assessed in every resume</span></div>
            <div><b>6</b><span>ATS-safe LaTeX templates, compile-tested</span></div>
            <div><b>65</b><span>curated learning resources, links verified</span></div>
            <div><b>48h</b><span>maximum age of any job listing shown</span></div>
          </div>
        </Reveal>
      </section>

      <section className="section ruled" id="product">
        <div className="split">
          <Reveal className="lhs">
            <div className="eyebrow">01 · Resume review</div>
            <h2>A score you can audit.</h2>
            <p>Every point traces back to the exact bullets behind it. Issues arrive as a prioritised backlog, P0 to P2, each with why it matters to a hiring manager and how to fix it.</p>
            <ul className="ticks">
              <li><Icon name="check" size={16} /><span><b>Built for PM resumes.</b> Rated on outcomes, ownership and the eight competencies PM loops test.</span></li>
              <li><Icon name="check" size={16} /><span><b>Honest about limits.</b> No fake “ATS pass rate”. We show what we measure and what we don’t.</span></li>
            </ul>
            <p style={{ marginTop: 20 }}><Link className="arrow-link" to="/methodology">Read the full methodology <Icon name="arrow" size={14} /></Link></p>
          </Reveal>
          <div className="stack" style={{ gap: '1.25rem' }}>
            <Reveal>
              <div className="tbl">
                {RUBRIC.map(([n, w, d]) => (
                  <div className="tbl-row" key={n}>
                    <b>{n}</b><span className="w">{w}%</span>
                    <p>{d}</p>
                    <div className="bar"><i style={{ width: `${w * 3.3}%`, background: 'var(--ink)' }} /></div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={80}><Xray /></Reveal>
          </div>
        </div>
      </section>

      <section className="section ruled" id="templates">
        <div className="split" style={{ gridTemplateColumns: 'minmax(0,0.6fr) minmax(0,1.4fr)' }}>
          <Reveal className="lhs">
            <div className="eyebrow">02 · Resume writer</div>
            <h2>Resumes that parse, and read well.</h2>
            <p>Six single-column templates, each compiled with pdfLaTeX and verified by extracting the text a parser would see.</p>
            <ul className="ticks">
              <li><Icon name="check" size={16} /><span>Standard fonts and a real text layer</span></li>
              <li><Icon name="check" size={16} /><span>Export .tex, open in Overleaf, or print to PDF</span></li>
              <li><Icon name="check" size={16} /><span>A bullet coach that never invents numbers</span></li>
            </ul>
          </Reveal>
          <Reveal><TemplateStage /></Reveal>
        </div>
      </section>

      <section className="section ruled">
        <div className="split">
          <Reveal className="lhs">
            <div className="eyebrow">03 · Fresh jobs</div>
            <h2>Roles from the last two days. Nothing older.</h2>
            <p>{counts && counts.total > 0 ? `${counts.total} product roles are live right now (${counts.IN} in India, ${counts.US} in the US). ` : ''}New listings land every morning at 7:00 AM IST, filtered by level and work mode, with a pipeline to track where you’ve applied.</p>
            <p style={{ marginTop: 20 }}><button className="arrow-link" style={{ background: 'none', borderTop: 0, borderLeft: 0, borderRight: 0, cursor: 'pointer' }} onClick={() => nav('/jobs')}>Browse jobs <Icon name="arrow" size={14} /></button></p>
          </Reveal>
          <Reveal><JobsTable /></Reveal>
        </div>
      </section>

      <section className="section ruled">
        <div className="split">
          <Reveal className="lhs">
            <div className="eyebrow">04 · Learn</div>
            <h2>The best material, in the right order.</h2>
            <p>Hand-picked videos, newsletters, books and tools, organised into guided paths for breaking in, interviewing, AI product work and growing to senior roles.</p>
          </Reveal>
          <Reveal><PathCard /></Reveal>
        </div>
      </section>

      <section className="section ruled">
        <Reveal>
          <div className="sec-head"><div className="eyebrow">Transparency</div><h2>What we measure, and what we won’t claim.</h2></div>
          <div className="trio">
            <div><span className="chip good">Measured</span><h3>What is measurable</h3><ul><li>Whether your text parses cleanly</li><li>Whether structure and dates are standard</li><li>Impact, ownership and PM competencies in your bullets</li><li>Keyword overlap with a job description</li></ul></div>
            <div><span className="chip warn">Not claimed</span><h3>What nobody can promise</h3><ul><li>An “ATS pass rate”: no ATS publishes one</li><li>Interview or callback predictions: we have not run outcome studies</li><li>Company-specific verdicts</li></ul></div>
          </div>
        </Reveal>
      </section>

      <section className="section ruled" id="pricing">
        <Reveal><div className="sec-head center"><div className="eyebrow">Pricing</div><h2>Pay once. Own your job hunt.</h2><p>Scoring is free. Everything else starts at {rupees(PLANS[0].price)}, with no subscription and no auto-renew.</p></div></Reveal>
        <Reveal><PriceCards busy={null} onChoose={() => nav('/pricing')} /></Reveal>
        <p className="faint" style={{ textAlign: 'center', marginTop: 16, fontSize: '0.84rem' }}>Secure checkout by Razorpay: UPI, cards, netbanking and wallets. We never see your card details.</p>
      </section>

      <section className="section ruled faq" style={{ maxWidth: 900 }}>
        <Reveal><h2 style={{ marginBottom: 24 }}>Questions</h2></Reveal>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={18} /></summary><p>{a}</p></details>)}
      </section>

      <section className="section tight">
        <Reveal>
          <div className="cta-band">
            <div><h2>Start with a free resume score.</h2><p>Under a minute. No card, no password.</p></div>
            <button className="btn lg" onClick={start}>Get your free score <Icon name="arrow" size={16} /></button>
          </div>
        </Reveal>
      </section>

      <MkFooter />
      <AuthModal />
    </div>
  )
}
