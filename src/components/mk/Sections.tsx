import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TEMPLATES } from '@latex'
import { Icon, type IconName } from '../Icon'
import { Logo } from '../Logo'
import { ResumePreview } from '../ResumePreview'
import { SemiGauge } from '../SemiGauge'
import { useApp } from '../../state/app'
import { sampleResume } from '../../lib/resume'
import { reducedMotion, useInView, useScrollDirection, useScrollVar } from '../../lib/motion'
import { PLANS, rupees } from '../../data/plans'
import counts from '../../data/topicCounts.json'
import { Headline, LabelRow } from './primitives'
import { JobsList, PathList, Tickets, useDemoReport } from './parts'

/* ------------------------------------------------------------------ nav */
const MENU: { to: string; icon: IconName; t: string; d: string }[] = [
  { to: '/score', icon: 'score', t: 'Resume Score', d: 'Free review of your resume' },
  { to: '/writer', icon: 'pen', t: 'Resume Writer', d: 'ATS-safe LaTeX templates' },
  { to: '/jobs', icon: 'briefcase', t: 'Fresh Jobs', d: 'Posted in the last 2 days' },
  { to: '/learn', icon: 'book', t: 'Learn', d: 'Guided paths and resources' },
]
const RES: { to: string; icon: IconName; t: string; d: string }[] = [
  { to: '/methodology', icon: 'info', t: 'How scoring works', d: 'The full rubric, no black box' },
  { to: '/privacy', icon: 'lock', t: 'Privacy', d: 'How your resume is handled' },
  { to: '/terms', icon: 'file', t: 'Terms', d: 'Plans and usage' },
]

function Dropdown({ label, items }: { label: string; items: typeof MENU }) {
  const [open, setOpen] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  const enter = () => { clearTimeout(t.current); setOpen(true) }
  const leave = () => { t.current = setTimeout(() => setOpen(false), 140) }
  return (
    <div className={`rz-dd ${open ? 'open' : ''}`} onMouseEnter={enter} onMouseLeave={leave} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button className="rz-link" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>{label}<Icon name="chevd" size={14} /></button>
      <div className="rz-menu" role="menu">
        {items.map((m) => <Link key={m.to} to={m.to} role="menuitem" onClick={() => setOpen(false)}><span className="ic"><Icon name={m.icon} size={18} /></span><span><b>{m.t}</b><small>{m.d}</small></span></Link>)}
      </div>
    </div>
  )
}

export function RzNav({ onHome = false }: { onHome?: boolean }) {
  const { user, ready, openAuth } = useApp()
  const { hidden, scrolled } = useScrollDirection()
  const h = (id: string) => (onHome ? `#${id}` : `/#${id}`)
  return (
    <header className={`rz-nav ${hidden ? 'hidden' : ''} ${scrolled ? 'scrolled' : ''}`}>
      <div className="rz-frame">
        <div className="rz-nav-in">
          <div className="rz-links">
            <Link to="/" aria-label="ProductRez home" style={{ marginRight: '1.2rem' }}><Logo /></Link>
            <Dropdown label="Product" items={MENU} />
            <a className="rz-link" href={h('templates')}>Templates</a>
            <Dropdown label="Resources" items={RES} />
            <a className="rz-link" href={h('pricing')}>Pricing</a>
          </div>
          <div className="row" style={{ gap: '0.4rem' }}>
            {ready && user ? <Link className="btn" to="/score">Open app</Link> : (
              <>
                <button className="rz-link" onClick={() => openAuth()}>Login</button>
                <button className="btn" onClick={() => openAuth('Create a free account. Your first resume score is on us.')}>Try for free</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ templates carousel */
export function Templates({ onStart }: { onStart: () => void }) {
  const data = useRef(sampleResume()).current
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false })
  const [dragging, setDragging] = useState(false)
  const scrollBy = (d: number) => track.current?.scrollBy({ left: d * 580, behavior: 'smooth' })
  const tilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 7}deg`)
    el.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 5}deg`)
  }
  const untilt = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.setProperty('--ry', '0deg'); e.currentTarget.style.setProperty('--rx', '0deg') }
  return (
    <section className="rz-sec" id="templates">
      <div className="rz-frame">
        <LabelRow>Resume formats</LabelRow>
        <div className="rz-pad" style={{ paddingTop: '2.5rem', overflow: 'hidden' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
            <Headline parts={[{ t: 'ATS-friendly formats' }, { t: 'that land interviews', mute: true }]} />
            <div className="arrows"><button className="arrow-b" aria-label="Previous" onClick={() => scrollBy(-1)}><Icon name="chev" size={20} style={{ transform: 'rotate(180deg)' }} /></button><button className="arrow-b" aria-label="Next" onClick={() => scrollBy(1)}><Icon name="chev" size={20} /></button></div>
          </div>
          <div
            ref={track}
            className={`car ${dragging ? 'drag' : ''}`}
            onPointerDown={(e) => { if (e.pointerType !== 'mouse') return; drag.current = { down: true, x: e.clientX, left: track.current!.scrollLeft, moved: false } }}
            onPointerMove={(e) => { const d = drag.current; if (!d.down) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) { d.moved = true; setDragging(true) } track.current!.scrollLeft = d.left - dx }}
            onPointerUp={() => { drag.current.down = false; setDragging(false) }}
            onPointerLeave={() => { drag.current.down = false; setDragging(false) }}
          >
            {TEMPLATES.map((t) => (
              <article className="car-card" key={t.id}>
                <div className="car-doc" onMouseMove={tilt} onMouseLeave={untilt}>
                  <ResumePreview data={data} template={t.id} accent="111111" paper="letter" fontSize={t.fontSize} showBreaks={false} />
                  <div className="acts"><button className="btn sm" onClick={onStart}>Use template</button><Link className="btn sm ghost" to="/methodology">Why it’s ATS-safe</Link></div>
                </div>
                <div className="car-meta"><b>{t.name}</b><p>{t.tagline}. Best for: {t.bestFor}.</p></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ topics */
const TOPICS: { k: keyof typeof counts.topics; t: string; icon: IconName }[] = [
  { k: 'start', t: 'Break into PM', icon: 'rocket' }, { k: 'interview', t: 'Interviews', icon: 'mic' }, { k: 'ai', t: 'AI product', icon: 'zap' }, { k: 'data', t: 'Data & experiments', icon: 'list' },
  { k: 'strategy', t: 'Strategy', icon: 'target' }, { k: 'discovery', t: 'Discovery', icon: 'user' }, { k: 'sense', t: 'Product sense', icon: 'eye' }, { k: 'career', t: 'Career & leadership', icon: 'briefcase' },
]
export function Topics() {
  return (
    <section className="rz-sec">
      <div className="rz-frame">
        <LabelRow>Learn</LabelRow>
        <div className="rz-pad" style={{ paddingTop: '2.5rem' }}>
          <Headline parts={[{ t: 'Learn from the best' }, { t: 'material, in order', mute: true }]} />
          <div className="topics" style={{ marginTop: '3rem' }}>
            {TOPICS.map((x, i) => (
              <Link to="/learn" className="topic reveal-card" key={x.k} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="ti"><Icon name={x.icon} size={20} /></span>
                <div><b>{x.t}</b><span>{counts.topics[x.k]} resources</span></div>
              </Link>
            ))}
            <Link to="/learn" className="topic all"><span style={{ display: 'flex', justifyContent: 'space-between' }}><b>View all</b><Icon name="chev" size={18} /></span><span>{counts.total}+ resources and {counts.paths} guided paths</span></Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ stacked bands */
const TEX = ['\\documentclass[11pt]{article}', '\\usepackage[T1]{fontenc}', '\\usepackage{lmodern}', '\\usepackage[letterpaper]{geometry}', '\\input{glyphtounicode}', '\\pdfgentounicode=1', '\\begin{document}', '\\rzname{Alex Morgan}', '\\rzcontact{alex.morgan@example.com | +1 415 555 0142}', '\\rzsection{Experience}', '\\rzrole{Northwind Pay}{Jan 2021 -- Present}', '  {Senior Product Manager}{San Francisco, CA}', '\\begin{itemize}', '  \\item Owned the onboarding roadmap across 3 squads;', '        lifting activation from 38\\% to 61\\%', '\\end{itemize}']

function Typewriter() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.3 })
  const [n, setN] = useState(reducedMotion() ? TEX.length : 0)
  useEffect(() => {
    if (!seen || reducedMotion()) return
    const t = setInterval(() => setN((x) => (x >= TEX.length ? (clearInterval(t), x) : x + 1)), 170)
    return () => clearInterval(t)
  }, [seen])
  return (
    <div ref={ref} style={{ background: '#050505', color: '#d4d4d4', padding: '1.2rem 1.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.7, minHeight: 400, overflow: 'hidden' }}>
      {TEX.slice(0, n).map((l, i) => <div key={i} style={{ whiteSpace: 'pre', animation: 'tabIn .4s var(--ease) both' }}><span style={{ color: '#8a8a8a', marginRight: 14 }}>{String(i + 1).padStart(2, '0')}</span>{l.split(/(\\[a-zA-Z]+)/).map((p, k) => (p.startsWith('\\') ? <span key={k} style={{ color: '#fff' }}>{p}</span> : p))}</div>)}
      {n < TEX.length && <span style={{ display: 'inline-block', width: 8, height: 14, background: '#fff', animation: 'blink 1s steps(2) infinite', verticalAlign: 'middle' }} />}
    </div>
  )
}

function Band({ cls, children }: { cls: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollVar(ref, 'cover')
  return <div ref={ref} className={`band ${cls}`}>{children}</div>
}

export function Bands() {
  const nav = useNavigate()
  const [c, setC] = useState<'all' | 'US' | 'IN'>('all')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [done, setDone] = useState([true, true, true, false, false, false])
  const data = useRef(sampleResume()).current
  const toggle = (id: string) => setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <div className="bands">
      <Band cls="b1">
        <div className="rz-frame">
          <div className="band-head">
            <Headline parts={[{ t: 'Find roles from the last two days' }, { t: 'and apply first', mute: true }]} />
            <div><p className="lead">New product roles land every morning at 7:00 AM IST for the US and India. Anything older than 48 hours is dropped, so you are never wading through stale listings.</p><button className="btn" style={{ marginTop: '1.6rem' }} onClick={() => nav('/jobs')}>Browse jobs</button></div>
          </div>
          <div className="band-vis"><div>
            <div className="aw-bar" style={{ padding: '14px 16px 0' }}>
              <div className="seg" role="group" aria-label="Country">{([['all', 'All'], ['IN', 'India'], ['US', 'United States']] as const).map(([v, l]) => <button key={v} aria-pressed={c === v} onClick={() => setC(v)}>{l}</button>)}</div>
              <span className="tag soft">Posted in the last 2 days</span><span style={{ flex: 1 }} /><span className="tag on">Pipeline · {saved.size}</span>
            </div>
            <div style={{ padding: '0 16px 0' }}><div className="aw-card" style={{ padding: 0, overflow: 'hidden', borderBottom: 0, borderRadius: '14px 14px 0 0' }}><JobsList country={c} saved={saved} onSave={toggle} limit={6} /></div></div>
          </div></div>
        </div>
      </Band>
      <Band cls="b2">
        <div className="rz-frame">
          <div className="band-head">
            <Headline parts={[{ t: 'Write once.' }, { t: 'Export clean LaTeX', mute: true }]} />
            <div><p className="lead">Every template compiles with pdfLaTeX to a single column with a real text layer and standard fonts. Download the .tex, open it in Overleaf, or print a quick PDF.</p><button className="btn" style={{ marginTop: '1.6rem' }} onClick={() => nav('/writer')}>Open the writer</button></div>
          </div>
          <div className="band-vis"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 430 }} className="band-split">
            <Typewriter />
            <div style={{ padding: 16, background: '#111', overflow: 'hidden' }}><div style={{ boxShadow: '0 20px 50px -20px rgba(255,255,255,.14)', background: '#fff' }}><ResumePreview data={data} template="ledger" accent="14171c" paper="letter" fontSize={11} showBreaks={false} /></div></div>
          </div></div>
        </div>
      </Band>
      <Band cls="b3">
        <div className="rz-frame">
          <div className="band-head">
            <Headline parts={[{ t: 'Learn from the best,' }, { t: 'in the right order', mute: true }]} />
            <div><p className="lead">Hand-picked videos, newsletters, books and tools, sequenced into guided paths for breaking in, interviewing, AI product work and growing to senior roles.</p><button className="btn" style={{ marginTop: '1.6rem' }} onClick={() => nav('/learn')}>Explore the library</button></div>
          </div>
          <div className="band-vis"><div style={{ padding: 16 }}>
            <div className="aw-card" style={{ padding: 0, overflow: 'hidden', maxWidth: 640, margin: '0 auto' }}>
              <div style={{ padding: '16px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ fontSize: '1.15rem', fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>Break into product management</b><span style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text)' }}>{Math.round((done.filter(Boolean).length / 6) * 100)}%</span></div>
              <PathList done={done} onToggle={(i) => setDone((d) => d.map((x, j) => (j === i ? !x : x)))} />
            </div>
          </div></div>
        </div>
      </Band>
    </div>
  )
}

/* ------------------------------------------------------------------ pricing */
const CHECK = <i><Icon name="check" size={12} strokeWidth={3} /></i>
export function Pricing() {
  const nav = useNavigate()
  const go = () => nav('/pricing')
  const [life, six, one] = [PLANS[2], PLANS[1], PLANS[0]]
  const paid = ['PM Resume Writer, 6 LaTeX templates', 'Unlimited resume scores + JD match', 'Fresh PM jobs, last 2 days', 'Learning paths and library']
  return (
    <section className="rz-sec" id="pricing">
      <div className="rz-frame">
        <LabelRow tone="teal">One-time payments, no subscriptions</LabelRow>
        <div className="rz-pad rz-price" style={{ paddingTop: '2.5rem' }}>
          <div>
            <Headline parts={[{ t: 'Choose from our' }, { t: 'simple plans' }]} />
            <p className="lead" style={{ margin: '1.4rem 0 1.8rem', maxWidth: '26em' }}>Pays for itself the first time it saves you a rejected application. Scoring is free. Everything else is a one-time payment that never auto-renews.</p>
            <Link className="btn ghost" to="/pricing">View all features</Link>
            <p style={{ marginTop: '2.5rem', fontSize: '0.9rem', color: 'var(--text-3)', maxWidth: '26em' }}>Secure checkout by Razorpay: UPI, cards, netbanking and wallets. We never see your card details.</p>
          </div>
          <div className="plans">
            <div className="plan pro"><h4>{life.name}</h4><div className="amt">{rupees(life.price)}<small>once</small></div><p className="d">{life.blurb}</p><button className="btn white block" onClick={go}>Get {life.name}</button><ul>{paid.map((f) => <li key={f}>{CHECK}{f}</li>)}</ul></div>
            <div className="plan"><h4>Free</h4><div className="amt">₹0</div><p className="d">See how it works. No payment required.</p><button className="btn block" onClick={go}>Get started</button><ul>{['1 resume score', 'Full fix backlog', 'Bullet X-ray'].map((f) => <li key={f}>{CHECK}{f}</li>)}</ul></div>
            <div className="plan"><h4>{six.name}</h4><div className="amt">{rupees(six.price)}<small>≈ ₹100/mo</small></div><p className="d">{six.blurb}</p><button className="btn block" onClick={go}>Get {six.name}</button><ul>{paid.slice(0, 2).map((f) => <li key={f}>{CHECK}{f}</li>)}<li>{CHECK}Everything in Lifetime</li></ul></div>
            <div className="plan"><h4>{one.name}</h4><div className="amt">{rupees(one.price)}<small>once</small></div><p className="d">{one.blurb}</p><button className="btn block" onClick={go}>Get {one.name}</button><ul>{paid.slice(0, 2).map((f) => <li key={f}>{CHECK}{f}</li>)}<li>{CHECK}Everything in Lifetime</li></ul></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ faq */
const FAQ: Record<string, [string, string][]> = {
  General: [
    ['Does a high score guarantee I’ll pass the ATS?', 'No, and be wary of anyone who says so. No real applicant tracking system publishes a 0–100 score. We measure what is measurable: whether your text parses cleanly, whether the structure is standard, and whether your bullets show the impact, ownership and PM competencies hiring managers screen for. Treat the score as a diagnostic, not a guarantee.'],
    ['Why LaTeX?', 'LaTeX produces a clean, single-column PDF with a real text layer and standard fonts, exactly what parsers want, with layout that stays stable on every device. Compile the .tex in Overleaf in one click, or use the quick print-to-PDF option.'],
    ['What do I get for free?', 'One full resume score per account with the complete fix backlog. The Writer, daily jobs and the learning library are in Pro.'],
  ],
  Pricing: [
    ['Do plans renew automatically?', 'No. Every plan is a one-time payment. If you buy again while active, the time is added.'],
    ['How long does each plan last?', '1 month is 30 days and 6 months is 182 days. Lifetime lasts for as long as ProductRez operates the service.'],
    ['Which payment methods work?', 'UPI, cards, netbanking and wallets through Razorpay. Prices are in Indian rupees.'],
  ],
  Privacy: [
    ['Is my resume private?', 'PDFs are read in your browser. To compute your score we send the extracted text to our scoring service and keep your latest report (including the parsed resume) so you can revisit it. It is visible only to your account, and we never sell or share it. See the privacy page for details.'],
    ['Do you use my resume to train AI?', 'No. AI rewrites, when enabled, send only the single bullet you ask about, with your role and level, to generate suggestions.'],
  ],
  Jobs: [
    ['Where do the jobs come from?', 'Public LinkedIn job listings for product roles in the US and India, collected once each morning. Anything older than two days is dropped. You apply on LinkedIn.'],
    ['Why only the last two days?', 'Recently posted roles get the most attention from recruiters. Showing only fresh listings keeps your effort where it counts.'],
  ],
}
export function Faq() {
  const cats = Object.keys(FAQ)
  const [cat, setCat] = useState(cats[0])
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="rz-sec">
      <div className="rz-frame">
        <LabelRow>Frequently asked questions</LabelRow>
        <div className="rz-pad" style={{ paddingTop: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}><Headline parts={[{ t: 'Your questions,' }, { t: 'answered.' }]} /></div>
          <div className="faq2">
            <div className="faq-cats" role="tablist" aria-label="Question categories">
              <i className="ind" style={{ transform: `translateY(${cats.indexOf(cat) * 40}px)` }} />
              {cats.map((c) => <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => { setCat(c); setOpen(0) }}>{c}</button>)}
            </div>
            <div key={cat} style={{ animation: 'tabIn .5s var(--ease) both' }}>
              {FAQ[cat].map(([q, a], i) => (
                <div key={q} className={`fq ${open === i ? 'open' : ''}`}>
                  <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{q}<Icon name="plus" size={20} /></button>
                  <div className="fb"><div><p>{a}</p></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ cta + footer */
export function CtaBand({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollVar(ref, 'through')
  const { report } = useDemoReport([true, true, false, false])
  return (
    <section className="rz-sec dark cta-blue">
      <div className="rz-frame">
        <div className="rz-pad cta-grid" ref={ref}>
          <div>
            <Headline parts={[{ t: 'Start with a free resume score and apply with confidence' }]} />
            <div className="row" style={{ marginTop: '2rem', gap: '1rem' }}>
              <button className="btn lg" onClick={onStart}>Get your free score <Icon name="arrow" size={16} /></button>
              <span style={{ color: '#8a8a8a', fontSize: '0.92rem' }}>Installs as an app on your phone.</span>
            </div>
          </div>
          <div className="phones" aria-hidden="true">
            <div className="phone b"><div className="scr"><div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>Fresh jobs</div><JobsList country="all" saved={new Set()} onSave={() => {}} limit={4} /></div></div>
            <div className="phone a"><div className="scr"><div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Resume score</div><SemiGauge value={report.overall} size={220} /><div style={{ marginTop: 10 }}><Tickets report={report} max={2} /></div></div></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function RzFooter() {
  return (
    <footer className="rz-sec dark">
      <div className="rz-frame">
        <div className="rz-foot">
          <div><Logo /><p style={{ marginTop: 14, color: '#a0a0a0', maxWidth: '22em', fontSize: '0.92rem' }}>The career workspace for product managers and aspiring PMs in the US and India.</p></div>
          <div><h5>Product</h5><Link to="/score">Resume Score</Link><Link to="/writer">Resume Writer</Link><Link to="/jobs">Fresh Jobs</Link><Link to="/learn">Learn</Link></div>
          <div><h5>Resources</h5><Link to="/methodology">How scoring works</Link><a href="/#templates">Templates</a><a href="/#pricing">Pricing</a></div>
          <div><h5>Legal</h5><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
          <div><h5>Account</h5><Link to="/account">Account</Link><Link to="/pricing">Plans</Link></div>
        </div>
        <div className="rz-legal"><span>© 2026 ProductRez. Not affiliated with LinkedIn; job listings link to their original postings.</span><span>Made for product managers.</span></div>
      </div>
    </footer>
  )
}
