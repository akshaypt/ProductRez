import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { reviewBullet } from '@scoring'
import { TEMPLATES } from '@latex'
import { useApp } from '../state/app'
import { Icon, type IconName } from '../components/Icon'
import { Logo } from '../components/Logo'
import { ResumePreview } from '../components/ResumePreview'
import { PriceCards } from './Pricing'
import { AuthModal } from '../components/AuthModal'
import { sampleResume } from '../lib/resume'
import { PLANS, rupees } from '../data/plans'

const EXAMPLES = [
  'Responsible for managing the product backlog and working with engineers',
  'Led the redesign of onboarding, improving activation',
  'Launched usage-based pricing for 12,000 SMB accounts, cutting churn from 5.1% to 3.8% in two quarters',
]
const VERDICT = ['Activity, not impact. A hiring manager learns nothing about what changed.', 'You hint at an outcome but give no number. Add the metric and the size of the change.', 'Quantified. Now add a before → after or a timeframe to make it airtight.', 'Hiring-manager ready: outcome, number and change are all there.']
const FLAG: Record<string, string> = { 'no-metric': 'No metric', 'weak-verb': 'Weak opener', 'no-verb': 'No action verb', 'too-long': 'Too long', 'too-short': 'Too short', 'first-person': 'First person', passive: 'Passive voice', buzzword: 'Buzzword' }

function Xray() {
  const [text, setText] = useState(EXAMPLES[0])
  const r = useMemo(() => reviewBullet(text.trim() || ' ', 'experience', '', true), [text])
  const level = text.trim().length < 4 ? -1 : r.impact
  return (
    <div className="card xray" data-testid="xray">
      <span className="sticker">Try it live</span>
      <h3 style={{ marginBottom: 4 }}>Bullet X-ray</h3>
      <p className="muted" style={{ fontSize: '0.92rem', marginBottom: 10 }}>Paste any resume bullet. We’ll rate it like a PM hiring manager would, free and with no sign-up.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Resume bullet to analyse" />
      <div className="xray-meter" aria-hidden="true">
        {[0, 1, 2].map((i) => <i key={i} className={level > i ? `on${level - 1}` : ''} />)}
      </div>
      <p style={{ fontWeight: 700 }} aria-live="polite">{level < 0 ? 'Type a bullet to see its impact rating.' : `Impact ${r.impact}/3: ${VERDICT[r.impact]}`}</p>
      <div className="row" style={{ gap: 6, margin: '8px 0 12px' }}>{level >= 0 && r.flags.map((f) => <span key={f} className="chip bad">{FLAG[f]}</span>)}{level >= 0 && r.flags.length === 0 && <span className="chip good">No issues found</span>}</div>
      <div className="row" style={{ gap: 6 }}>
        {EXAMPLES.map((e, i) => <button key={i} className="chip btnish" onClick={() => setText(e)}>Example {i + 1}</button>)}
      </div>
    </div>
  )
}

const FEATURES: { icon: IconName; bg: string; t: string; d: string }[] = [
  { icon: 'score', bg: 'var(--accent-soft)', t: 'A scorer that speaks PM', d: 'Impact, ownership, 8 PM competencies, clarity and ATS safety. Findings arrive as a prioritised P0/P1/P2 backlog.' },
  { icon: 'pen', bg: 'var(--blue-soft)', t: 'LaTeX resume writer', d: 'Six crafted templates, a bullet coach and one-click LaTeX that parses cleanly in applicant tracking systems.' },
  { icon: 'briefcase', bg: 'var(--green-soft)', t: 'Jobs, fresh every morning', d: 'PM roles posted in the last 2 days, US + India. Never wade through month-old listings again.' },
  { icon: 'book', bg: 'var(--yellow-soft)', t: 'Learn from the best', d: 'Verified videos, newsletters, books and tools, organised into guided paths with progress tracking.' },
]

const FAQ = [
  ['Does a high score guarantee I’ll pass the ATS?', 'No, and be wary of anyone who says so. No real applicant tracking system publishes a 0–100 score. We measure what’s measurable: whether your text parses cleanly, whether the structure is standard, and whether your bullets show the impact, ownership and PM competencies hiring managers look for. Think of the score as a diagnostic, not a guarantee.'],
  ['Why LaTeX?', 'LaTeX produces a clean, single-column PDF with a real text layer and standard fonts, which is exactly what parsers want. You also get pixel-stable output no matter which device you open it on. Compile the .tex in Overleaf in one click, or use the quick print-to-PDF option.'],
  ['What do I get for free?', 'One full resume score per account, with the complete fix backlog. The Writer, daily jobs and the learning library are in Pro.'],
  ['Where do the jobs come from?', 'Public LinkedIn job listings for product roles in the US and India, collected once a day in the morning. Anything older than two days is dropped. You apply on LinkedIn.'],
  ['Is my resume private?', 'PDFs are read in your browser. To compute your score we send the extracted text to our scoring service and keep your latest report (including the parsed resume) so you can revisit it. We don’t share it.'],
  ['Do plans renew automatically?', 'No. Every plan is a one-time payment. If you buy again while active, the time is added.'],
] as const

export default function Landing() {
  const { user, openAuth, api, ready } = useApp()
  const nav = useNavigate()
  const [counts, setCounts] = useState<{ US: number; IN: number; total: number } | null>(null)
  const sample = useMemo(() => sampleResume(), [])
  useEffect(() => {
    api?.jobCounts().then(setCounts).catch(() => {})
  }, [api])
  const start = () => (user ? nav('/score') : openAuth('Create a free account. Your first resume score is on us.'))

  return (
    <div>
      <header className="mk-nav">
        <Link to="/" aria-label="ProductRez home"><Logo /></Link>
        <nav aria-label="Marketing">
          <a className="t" href="#features">Features</a>
          <a className="t" href="#templates">Templates</a>
          <a className="t" href="#pricing">Pricing</a>
          <a className="t" href="#faq">FAQ</a>
          {ready && user ? <Link className="btn sm" to="/score">Open app</Link> : <button className="btn sm" onClick={() => openAuth()}>Sign in</button>}
        </nav>
      </header>

      <section className="section hero">
        <div>
          <span className="chip accent"><Icon name="rocket" size={12} /> Built only for product managers</span>
          <h1 style={{ marginTop: 14 }}>Ship your <span className="mark">PM career</span>.</h1>
          <p className="lead">The resume scorer, LaTeX resume writer, fresh daily job feed and learning library, all in one place, made only for product managers and the people becoming one.</p>
          <div className="cta">
            <button className="btn lg" onClick={start} data-testid="hero-cta"><Icon name="zap" size={20} /> Score my resume, free</button>
            <a className="btn lg ghost" href="#features">See how it works</a>
          </div>
          <div className="trust">
            <span><Icon name="check" size={16} /> First score free</span>
            <span><Icon name="check" size={16} /> No credit card</span>
            <span><Icon name="check" size={16} /> US + India</span>
          </div>
        </div>
        <Xray />
      </section>

      <section className="section" id="features" style={{ paddingTop: 0 }}>
        <h2>Everything a PM job hunt needs, <span className="hl">nothing it doesn’t</span>.</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="card feature" key={f.t}>
              <div className="ico" style={{ background: f.bg }}><Icon name={f.icon} /></div>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card" style={{ background: 'var(--paper-2)' }}>
          <div className="grid2" style={{ alignItems: 'center', gap: '2rem' }}>
            <div className="stack">
              <span className="chip">Feedback as a backlog</span>
              <h2>Your resume, reviewed like a product.</h2>
              <p className="muted">Every issue is a ticket with a priority, the reason it matters to a hiring manager, the exact bullets it came from and how to fix it. Work the backlog top to bottom and watch the score climb.</p>
              <button className="btn" onClick={start}>Get my backlog <Icon name="arrow" size={18} /></button>
            </div>
            <div>
              {[['P0', 'p0', '7 of 9 bullets have no measurable outcome', '+14'], ['P1', 'p1', 'Only 3 of 8 PM competencies are evidenced', '+9'], ['P2', 'p2', '“Led” opens 4 bullets in a row', '+1']].map(([p, c, t, g]) => (
                <div key={p} className={`ticket ${c}`}><button tabIndex={-1} aria-hidden="true" style={{ cursor: 'default' }}><span className={`chip ${c}`}>{p}</span><span className="t">{t}</span><span className="gain">{g}</span></button></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="templates" style={{ paddingTop: 0 }}>
        <h2>Six templates. <span className="hl">All ATS-safe.</span></h2>
        <p className="muted" style={{ marginTop: 10, maxWidth: '60ch' }}>Single column, standard fonts, real text layer. Pick the one that fits your level, then export LaTeX or PDF.</p>
        <div className="tpl-row" tabIndex={0} aria-label="Template gallery">
          {TEMPLATES.map((t) => (
            <div className="tpl-card" key={t.id}>
              <div className="tpl-thumb"><ResumePreview data={sample} template={t.id} accent={t.accentDefault} paper="letter" fontSize={t.fontSize} width={246} showBreaks={false} /></div>
              <b style={{ display: 'block', marginTop: 10, fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{t.name}</b>
              <span className="muted" style={{ fontSize: '0.88rem' }}>{t.bestFor}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card" style={{ background: 'var(--yellow-soft)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <span className="chip accent"><Icon name="clock" size={12} /> New every morning</span>
              <h2 style={{ marginTop: 10 }}>{counts && counts.total > 0 ? `${counts.total} PM roles posted in the last 2 days` : 'Fresh PM roles, every morning'}</h2>
              <p className="muted" style={{ marginTop: 6 }}>{counts && counts.total > 0 ? `${counts.IN} in India and ${counts.US} in the US. ` : ''}Apply early, while your application still gets read.</p>
            </div>
            <button className="btn" onClick={() => nav('/jobs')}>Browse jobs <Icon name="arrow" size={18} /></button>
          </div>
          <div className="teaser-jobs blur" aria-hidden="true">
            {['Senior Product Manager', 'Product Manager, AI', 'Associate Product Manager'].map((t, i) => (
              <div className="job" key={t} style={{ gridTemplateColumns: '54px 1fr' }}><div className="logo-tile" style={{ background: ['#ffd6c9', '#d4c8ff', '#c9f0dd'][i] }}>{'ABC'[i]}</div><div><div className="t">{t}</div><div className="muted">Company · City</div></div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing" style={{ paddingTop: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Pay once. <span className="hl">Own your job hunt.</span></h2>
          <p className="muted" style={{ marginTop: 10 }}>Scoring is free. Everything else starts at {rupees(PLANS[0].price)}. No subscriptions.</p>
        </div>
        <PriceCards busy={null} onChoose={() => nav('/pricing')} />
      </section>

      <section className="section faq" id="faq" style={{ paddingTop: 0, maxWidth: 900 }}>
        <h2 style={{ marginBottom: 12 }}>Straight answers</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}><summary>{q}<Icon name="plus" size={20} /></summary><p>{a}</p></details>
        ))}
      </section>

      <footer className="footer">
        <Logo size={26} />
        <p style={{ marginTop: 10 }}>Made for product managers in the US and India.</p>
        <p style={{ marginTop: 6 }}>ProductRez isn’t affiliated with LinkedIn. Job listings link to their original postings.</p>
      </footer>
      <AuthModal />
    </div>
  )
}
