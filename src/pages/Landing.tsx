import { useMemo, useState, useEffect, type ReactElement } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { reviewBullet, scoreResume } from '@scoring'
import { TEMPLATES } from '@latex'
import { useApp } from '../state/app'
import { Icon, type IconName } from '../components/Icon'
import { ResumePreview } from '../components/ResumePreview'
import { Radar } from '../components/Radar'
import { Reveal } from '../components/Reveal'
import { MkNav, MkFooter } from '../components/MarketingChrome'
import { AuthModal } from '../components/AuthModal'
import { PriceCards } from './Pricing'
import { sampleResume } from '../lib/resume'
import { useTween } from '../lib/useTween'
import { PLANS, rupees } from '../data/plans'

/* ------------------------------------------------------------------ hero demo */
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

const scoreColor = (n: number) => (n >= 80 ? 'var(--green)' : n >= 60 ? 'var(--amber)' : 'var(--red)')

function HeroDemo() {
  const [fixed, setFixed] = useState<boolean[]>([false, false, false, false])
  const bullets = DEMO.map((d, i) => (fixed[i] ? d.strong : d.weak))
  const report = useMemo(() => scoreResume({ text: demoText(bullets), targetLevel: 'pm' }, new Date('2026-11-04')), [fixed]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useTween(report.overall)
  const c = 2 * Math.PI * 46
  const allFixed = fixed.every(Boolean)
  const toggle = (i: number) => setFixed((f) => f.map((x, j) => (j === i ? !x : x)))
  return (
    <div className="card demo" data-testid="hero-demo">
      <div className="demo-bar"><i /><i /><i /><span style={{ marginLeft: 8 }}>Example resume · live review</span></div>
      <div className="demo-body">
        <div className="demo-doc">
          <div><div className="who">Jordan Lee</div><div className="role">Product Manager · Acme Cloud · Jan 2022 – Present</div></div>
          {DEMO.map((d, i) => {
            const r = reviewBullet(bullets[i], 'experience', '', true)
            return (
              <div key={i} className={`demo-b ${fixed[i] ? 'better' : ''}`}>
                <div>
                  {bullets[i]}
                  <div className="dots" aria-label={`impact ${r.impact} of 3`}>
                    {[0, 1, 2].map((k) => <i key={k} style={{ background: r.impact > k ? (r.impact === 3 ? 'var(--green)' : r.impact === 2 ? '#6cc99a' : 'var(--amber)') : undefined }} />)}
                  </div>
                </div>
                <button onClick={() => toggle(i)} aria-pressed={fixed[i]}>{fixed[i] ? 'Undo' : 'Rewrite'}</button>
              </div>
            )
          })}
          <button className="btn sm ghost" style={{ justifySelf: 'start', marginTop: 4 }} onClick={() => setFixed(allFixed ? [false, false, false, false] : [true, true, true, true])}>
            <Icon name="sparkle" size={14} /> {allFixed ? 'Reset example' : 'Improve all four'}
          </button>
        </div>
        <div className="demo-score">
          <div className="mini-gauge" role="img" aria-label={`Example score ${report.overall} out of 100`}>
            <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="var(--surface-3)" strokeWidth="7" /><circle className="val" cx="50" cy="50" r="46" fill="none" stroke={scoreColor(report.overall)} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - report.overall / 100)} /></svg>
            <b>{shown}</b>
          </div>
          <span className="chip" style={{ color: scoreColor(report.overall) }}>{report.gradeLabel.split('·')[0].trim()}</span>
          <div className="demo-tickets">
            {report.findings.slice(0, 3).map((f) => (
              <div key={f.id}><span className={`chip ${f.priority.toLowerCase()}`}>{f.priority}</span><span>{f.title.length > 44 ? f.title.slice(0, 42) + '…' : f.title}</span></div>
            ))}
            {report.findings.length === 0 && <div><span className="chip good">✓</span>No blockers left</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ bullet x-ray */
const EXAMPLES = ['Responsible for managing the product backlog and working with engineers', 'Led the redesign of onboarding, improving activation', 'Launched usage-based pricing for 12,000 SMB accounts, cutting churn from 5.1% to 3.8% in two quarters']
const VERDICT = ['Activity, not impact. A hiring manager learns nothing about what changed.', 'You hint at an outcome but give no number. Add the metric and the size of the change.', 'Quantified. Now add a before → after or a timeframe to make it airtight.', 'Hiring-manager ready: outcome, number and change are all there.']
const FLAG: Record<string, string> = { 'no-metric': 'No metric', 'weak-verb': 'Weak opener', 'no-verb': 'No action verb', 'too-long': 'Too long', 'too-short': 'Too short', 'first-person': 'First person', passive: 'Passive voice', buzzword: 'Buzzword' }

function Xray() {
  const [text, setText] = useState(EXAMPLES[0])
  const r = useMemo(() => reviewBullet(text.trim() || ' ', 'experience', '', true), [text])
  const level = text.trim().length < 4 ? -1 : r.impact
  return (
    <div className="card xray" data-testid="xray" style={{ padding: '1.4rem' }}>
      <h3 style={{ marginBottom: 4 }}>Bullet X-ray</h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 12 }}>Paste any resume bullet. Rated instantly, in your browser.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Resume bullet to analyse" />
      <div className="xray-meter" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={level > i ? `on${level - 1}` : ''} />)}</div>
      <p style={{ fontWeight: 600 }} aria-live="polite">{level < 0 ? 'Type a bullet to see its impact rating.' : `Impact ${r.impact}/3: ${VERDICT[r.impact]}`}</p>
      <div className="row" style={{ gap: 6, margin: '10px 0 14px' }}>{level >= 0 && r.flags.map((f) => <span key={f} className="chip bad">{FLAG[f]}</span>)}{level >= 0 && r.flags.length === 0 && <span className="chip good">No issues found</span>}</div>
      <div className="row" style={{ gap: 6 }}><span className="faint" style={{ fontSize: '0.8rem' }}>Try:</span>{EXAMPLES.map((e, i) => <button key={i} className="chip btnish" onClick={() => setText(e)}>Example {i + 1}</button>)}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ showcase */
const WEAK_REPORT = scoreResume({ text: demoText(DEMO.map((d) => d.weak)), targetLevel: 'pm' }, new Date('2026-11-04'))

function ScorePanel() {
  const [hot, setHot] = useState<string | null>(null)
  return (
    <div className="grid2" style={{ alignItems: 'center', gap: '1.4rem' }}>
      <div>
        <Radar dims={WEAK_REPORT.dimensions} hot={hot} onHot={setHot} />
        <p className="faint" style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: 4 }}>Hover a point. Example resume, score {WEAK_REPORT.overall}/100.</p>
      </div>
      <div>
        {WEAK_REPORT.findings.slice(0, 3).map((f) => (
          <div key={f.id} className={`ticket ${f.priority.toLowerCase()}`}>
            <button tabIndex={-1} style={{ cursor: 'default' }}><span className={`chip ${f.priority.toLowerCase()}`}>{f.priority}</span><span className="t" style={{ fontSize: '0.88rem' }}>{f.title}</span><span className="gain">+{f.gain}</span></button>
          </div>
        ))}
        {WEAK_REPORT.dimensions.map((d) => (
          <div className={`dim ${hot === d.id ? 'hot' : ''}`} key={d.id} onMouseEnter={() => setHot(d.id)} onMouseLeave={() => setHot(null)} style={{ marginTop: 8 }}>
            <div className="top" style={{ fontSize: '0.8rem' }}><span>{d.label}</span><span className="mono">{d.score}</span></div>
            <div className="bar" style={{ height: 6 }}><i style={{ width: `${d.score}%`, background: scoreColor(d.score) }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WritePanel() {
  const [t, setT] = useState(0)
  const data = useMemo(() => sampleResume(), [])
  const tpl = TEMPLATES[t]
  return (
    <div>
      <div className="row" style={{ gap: 6, marginBottom: 14 }} role="tablist" aria-label="Templates">
        {TEMPLATES.map((x, i) => <button key={x.id} className={`chip btnish ${i === t ? 'on' : ''}`} onClick={() => setT(i)} aria-pressed={i === t}>{x.name}</button>)}
      </div>
      <div className="grid2" style={{ alignItems: 'start', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)' }}>
        <div style={{ height: 380, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--sh-2)', background: '#fff' }}>
          <ResumePreview data={data} template={tpl.id} accent={tpl.accentDefault} paper="letter" fontSize={tpl.fontSize} showBreaks={false} />
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <b style={{ fontSize: '1.1rem' }}>{tpl.name}</b>
          <p className="muted" style={{ fontSize: '0.9rem' }}>{tpl.tagline}.</p>
          <span className="chip accent" style={{ justifySelf: 'start' }}>Best for: {tpl.bestFor}</span>
          <div className="row" style={{ gap: 6 }}><span className="chip good"><Icon name="check" size={12} /> Single column</span><span className="chip good"><Icon name="check" size={12} /> Real text layer</span><span className="chip good"><Icon name="check" size={12} /> .tex export</span></div>
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
const TONE = ['#dfe0ff', '#d9f2e5', '#ffe7c9', '#fbd9e6', '#d6e8ff', '#e8defc']

function JobsPanel() {
  const [c, setC] = useState<'all' | 'US' | 'IN'>('all')
  const rows = SAMPLE_JOBS.filter((j) => c === 'all' || j[3] === c)
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="seg" role="group" aria-label="Country">{([['all', 'All'], ['IN', '🇮🇳 India'], ['US', '🇺🇸 US']] as const).map(([v, l]) => <button key={v} aria-pressed={c === v} onClick={() => setC(v)}>{l}</button>)}</div>
        <span className="chip accent"><Icon name="clock" size={12} /> Posted in the last 2 days</span>
      </div>
      {rows.map((j, i) => (
        <div className="job" key={j[0] + j[1]} style={{ marginBottom: 8, animation: 'pageIn .35s var(--ease)' }}>
          <div className="logo-tile" style={{ background: TONE[i % TONE.length] }}>{j[1][0]}</div>
          <div><div className="t" style={{ fontSize: '0.95rem' }}>{j[0]}</div><div className="muted" style={{ fontSize: '0.85rem' }}>{j[1]} · {j[2]}</div></div>
          <span className={`chip ${j[4] === 'Today' ? 'accent' : ''}`}>{j[4]}</span>
        </div>
      ))}
      <p className="faint" style={{ fontSize: '0.78rem' }}>Sample listings for illustration.</p>
    </div>
  )
}

const STEPS = ['Understand the PM job', 'Learn to talk to customers', 'Craft your transition story', 'Get data-literate (SQL)', 'Run a mini product project', 'Practise interviews']
function LearnPanel() {
  const [done, setDone] = useState<boolean[]>([true, true, false, false, false, false])
  const pct = Math.round((done.filter(Boolean).length / STEPS.length) * 100)
  const shown = useTween(pct, 500)
  return (
    <div className="grid2" style={{ alignItems: 'center', gap: '1.4rem' }}>
      <div className="card" style={{ textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
        <div className="ring" style={{ ['--p' as string]: pct, width: 120, height: 120 }}><span style={{ width: 96, height: 96, fontSize: '1.4rem', fontWeight: 700 }}>{shown}%</span></div>
        <b>Break into PM in 8 weeks</b>
        <span className="muted" style={{ fontSize: '0.86rem' }}>A guided path of hand-picked videos, books and tools.</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {STEPS.map((s, i) => (
          <button key={s} className="onboard-opt" aria-pressed={done[i]} onClick={() => setDone((d) => d.map((x, j) => (j === i ? !x : x)))} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid var(--border-strong)', display: 'grid', placeItems: 'center', background: done[i] ? 'var(--brand)' : 'transparent', color: '#fff', flex: 'none' }}>{done[i] && <Icon name="check" size={13} strokeWidth={3} />}</span>
            <span style={{ textDecoration: done[i] ? 'line-through' : 'none', opacity: done[i] ? 0.6 : 1 }}>Week {i + 1} · {s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const TABS: { id: string; icon: IconName; t: string; d: string; panel: () => ReactElement }[] = [
  { id: 'score', icon: 'score', t: 'Resume Score', d: 'Rated on impact, ownership, 8 PM competencies, clarity and ATS safety. Every issue is a ticket with the bullets behind it.', panel: ScorePanel },
  { id: 'write', icon: 'pen', t: 'Resume Writer', d: 'Six ATS-safe LaTeX templates, a bullet coach and one-click export to .tex, Overleaf or PDF.', panel: WritePanel },
  { id: 'jobs', icon: 'briefcase', t: 'Fresh Jobs', d: 'PM roles posted in the last two days across the US and India, refreshed every morning.', panel: JobsPanel },
  { id: 'learn', icon: 'book', t: 'Learn', d: 'Verified videos, newsletters, books and tools, organised into guided paths with progress.', panel: LearnPanel },
]

function Showcase() {
  const [i, setI] = useState(0)
  const Panel = TABS[i].panel
  return (
    <div className="show">
      <div className="show-tabs" role="tablist" aria-label="Product tour">
        {TABS.map((t, k) => (
          <button key={t.id} role="tab" className="show-tab" aria-selected={i === k} onClick={() => setI(k)}>
            <b><span className="ico"><Icon name={t.icon} size={16} /></span>{t.t}</b>
            <span>{t.d}</span>
          </button>
        ))}
      </div>
      <div className="show-panel" key={TABS[i].id} role="tabpanel"><Panel /></div>
    </div>
  )
}

/* ------------------------------------------------------------------ rubric */
const RUBRIC: [string, number, string][] = [
  ['Impact & metrics', 30, 'Quantified outcomes, before → after, results-first bullets.'],
  ['Product craft', 20, 'Evidence for discovery, strategy, prioritization, execution, data, GTM, technical fluency and influence.'],
  ['Ownership & scope', 18, 'Ownership verbs and scope that matches the level you’re targeting.'],
  ['ATS & structure', 18, 'Clean text extraction, standard headings, dates, contact details.'],
  ['Writing clarity', 14, 'Length, repeated openers, buzzwords, passive voice.'],
]

const FAQ = [
  ['Does a high score guarantee I’ll pass the ATS?', 'No, and be wary of anyone who says so. No real applicant tracking system publishes a 0–100 score. We measure what’s measurable: whether your text parses cleanly, whether the structure is standard, and whether your bullets show the impact, ownership and PM competencies hiring managers look for. Treat the score as a diagnostic, not a guarantee.'],
  ['Why LaTeX?', 'LaTeX produces a clean, single-column PDF with a real text layer and standard fonts, exactly what parsers want, with layout that stays stable on every device. Compile the .tex in Overleaf in one click, or use the quick print-to-PDF option.'],
  ['What do I get for free?', 'One full resume score per account with the complete fix backlog. The Writer, daily jobs and the learning library are in Pro.'],
  ['Where do the jobs come from?', 'Public LinkedIn job listings for product roles in the US and India, collected once each morning. Anything older than two days is dropped. You apply on LinkedIn.'],
  ['Is my resume private?', 'PDFs are read in your browser. To compute your score we send the extracted text to our scoring service and keep your latest report (including the parsed resume) so you can revisit it. It’s visible only to your account, and we never sell or share it. See the privacy page for details.'],
  ['Do plans renew automatically?', 'No. Every plan is a one-time payment. If you buy again while active, the time is added.'],
] as const

export default function Landing() {
  const { user, openAuth } = useApp()
  const nav = useNavigate()
  const [counts, setCounts] = useState<{ US: number; IN: number; total: number } | null>(null)
  const { api } = useApp()
  const sample = useMemo(() => sampleResume(), [])
  const [rub, setRub] = useState(0)
  useEffect(() => {
    api?.jobCounts().then(setCounts).catch(() => {})
  }, [api])
  const start = () => (user ? nav('/score') : openAuth('Create a free account. Your first resume score is on us.'))

  return (
    <div className="mk-wrap">
      <div className="mk-glow" />
      <div className="mk-grid" />
      <MkNav onHome />

      <section className="section hero">
        <div>
          <span className="chip accent" style={{ marginBottom: 18 }}><Icon name="sparkle" size={12} /> Built only for product managers</span>
          <h1>Land your next <span className="hl">PM role</span>, faster.</h1>
          <p className="lead">Score your resume the way PM hiring managers read it, rebuild it in ATS-safe LaTeX, and apply to fresh roles every morning, all in one place.</p>
          <div className="cta">
            <button className="btn lg" onClick={start} data-testid="hero-cta"><Icon name="zap" size={18} /> Score my resume, free</button>
            <a className="btn lg ghost" href="#product">See how it works <Icon name="arrow" size={16} /></a>
          </div>
          <div className="trust">
            <span><Icon name="check" size={16} /> First score free, no card</span>
            <span><Icon name="check" size={16} /> PDF parsed in your browser</span>
            <span><Icon name="check" size={16} /> US + India</span>
          </div>
        </div>
        <div className="hero-in"><HeroDemo /></div>
      </section>

      <section className="section" id="product" style={{ paddingTop: '1rem' }}>
        <Reveal>
          <div className="sec-head"><span className="eyebrow">The platform</span><h2>One workspace for the whole PM job hunt.</h2><p>Four tools that share one profile: score, write, apply, learn. Click around, this is the real product.</p></div>
        </Reveal>
        <Reveal><Showcase /></Reveal>
      </section>

      <section className="section tight">
        <div className="grid2" style={{ alignItems: 'center', gap: '2.5rem' }}>
          <Reveal>
            <div className="stack">
              <span className="eyebrow">Try it now</span>
              <h2>See what a hiring manager sees in one bullet.</h2>
              <p className="muted" style={{ fontSize: '1.05rem' }}>Resume bullets are won or lost on outcomes. Paste yours and get an instant impact rating, no sign-up, nothing leaves your browser.</p>
              <button className="btn" onClick={start} style={{ justifySelf: 'start' }}>Review my whole resume <Icon name="arrow" size={16} /></button>
            </div>
          </Reveal>
          <Reveal delay={100}><Xray /></Reveal>
        </div>
      </section>

      <section className="section tight">
        <Reveal>
          <div className="sec-head"><span className="eyebrow">Transparent by design</span><h2>A score you can interrogate.</h2><p>No black box. Every point traces back to the exact bullets behind it. <Link to="/methodology" className="accent" style={{ fontWeight: 600 }}>Read the full methodology →</Link></p></div>
        </Reveal>
        <div className="rubric">
          <Reveal>
            <div style={{ display: 'grid', gap: 10 }}>
              {RUBRIC.map(([n, w, d], i) => (
                <div key={n} className={`rub ${rub === i ? 'active' : ''}`} onMouseEnter={() => setRub(i)} onFocus={() => setRub(i)} tabIndex={0}>
                  <b>{n}</b><span className="w">{w}%</span>
                  <p>{d}</p>
                  <div className="bar" style={{ height: 5 }}><i style={{ width: `${w * 3.3}%`, background: 'linear-gradient(90deg,var(--brand),var(--brand-2))' }} /></div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="trio" style={{ gridTemplateColumns: '1fr' }}>
              <div className="card"><span className="chip good">What we measure</span><h3>What’s measurable</h3><ul><li>Whether your text parses cleanly</li><li>Whether structure and dates are standard</li><li>Impact, ownership and PM competencies in your bullets</li><li>Keyword overlap with a job description</li></ul></div>
              <div className="card"><span className="chip warn">What nobody can promise</span><h3>What we won’t claim</h3><ul><li>An “ATS pass rate”: no ATS publishes one</li><li>Interview or callback predictions: we haven’t run outcome studies</li><li>Company-specific verdicts</li></ul></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section tight" id="templates">
        <Reveal><div className="sec-head"><span className="eyebrow">Resume Writer</span><h2>Six templates. All ATS-safe.</h2><p>Single column, standard fonts, a real text layer. Compiled and verified with pdfLaTeX, then checked by extracting the text a parser would see.</p></div></Reveal>
        <div className="tpl-row" tabIndex={0} aria-label="Template gallery">
          {TEMPLATES.map((t) => (
            <div className="tpl-card" key={t.id}>
              <div className="tpl-thumb"><ResumePreview data={sample} template={t.id} accent={t.accentDefault} paper="letter" fontSize={t.fontSize} width={246} showBreaks={false} /></div>
              <b style={{ display: 'block', marginTop: 12, fontSize: '1.02rem' }}>{t.name}</b>
              <span className="muted" style={{ fontSize: '0.86rem' }}>{t.bestFor}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section tight">
        <Reveal>
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--brand-soft), var(--surface) 60%)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <span className="eyebrow"><Icon name="clock" size={14} /> New every morning</span>
                <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.1rem)' }}>{counts && counts.total > 0 ? `${counts.total} PM roles posted in the last 2 days` : 'Fresh PM roles every morning'}</h2>
                <p className="muted" style={{ marginTop: 8 }}>{counts && counts.total > 0 ? `${counts.IN} in India and ${counts.US} in the US. ` : ''}Apply early, while your application still gets read.</p>
              </div>
              <button className="btn" onClick={() => nav('/jobs')}>Browse jobs <Icon name="arrow" size={16} /></button>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section tight" id="pricing">
        <Reveal><div className="sec-head center"><span className="eyebrow">Pricing</span><h2>Pay once. Own your job hunt.</h2><p>Scoring is free. Everything else starts at {rupees(PLANS[0].price)}, with no subscriptions and no auto-renew.</p></div></Reveal>
        <Reveal><PriceCards busy={null} onChoose={() => nav('/pricing')} /></Reveal>
        <p className="faint" style={{ textAlign: 'center', marginTop: 16, fontSize: '0.86rem' }}>Secure checkout by Razorpay: UPI, cards, netbanking and wallets. We never see your card details.</p>
      </section>

      <section className="section tight faq" style={{ maxWidth: 900 }}>
        <Reveal><h2 style={{ marginBottom: 12 }}>Straight answers</h2></Reveal>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={20} /></summary><p>{a}</p></details>)}
      </section>

      <section className="section tight">
        <Reveal>
          <div className="final-cta">
            <h2>Your next PM role starts with a better resume.</h2>
            <p className="muted" style={{ margin: '12px auto 22px', maxWidth: 520 }}>Get your free score in under a minute. No card, no password.</p>
            <button className="btn lg" onClick={start}><Icon name="zap" size={18} /> Score my resume, free</button>
          </div>
        </Reveal>
      </section>

      <MkFooter />
      <AuthModal />
    </div>
  )
}
