import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import { ResumePreview } from '../ResumePreview'
import { SemiGauge } from '../SemiGauge'
import { sampleResume } from '../../lib/resume'
import { reducedMotion, useInView } from '../../lib/motion'
import { COMP_LABELS } from './labels'
import { JobsList, PathList, Tickets, useDemoReport } from './parts'
import { Headline, LabelRow } from './primitives'

const ITEMS = [
  { k: 'Score', n: '01', body: <><b>A review that reads like a hiring manager.</b> Every issue is a ticket with the exact bullets behind it, so you know what to fix first.</>, cta: 'How scoring works', to: '/methodology' },
  { k: 'Write', n: '02', body: <><b>Resumes that parse.</b> Six single-column templates exported as clean LaTeX, with a coach that never invents numbers.</>, cta: 'See templates', to: '#templates' },
  { k: 'Apply', n: '03', body: <><b>Only roles from the last two days.</b> Refreshed every morning for the US and India, with a pipeline to track every application.</>, cta: 'Browse jobs', to: '/jobs' },
  { k: 'Learn', n: '04', body: <><b>The best material, in order.</b> Guided paths through hand-picked videos, books and tools, with progress you can see.</>, cta: 'Explore the library', to: '/learn' },
]

function ScoreCard() {
  const { report } = useDemoReport([false, false, false, false])
  return (
    <div style={{ padding: 22 }}>
      <div className="aw-bar"><span className="tag soft">Overall review</span><span className="tag">Level: PM</span><span style={{ flex: 1 }} /><span className="tag on">Fix in Writer</span></div>
      <div className="aw-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 250px' }}>
        <div className="aw-card">
          <div className="tag" style={{ border: 0, padding: 0, height: 'auto', marginBottom: 10 }}>PM competencies evidenced</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {report.competencies.map((c, i) => (
              <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '10px 10px 8px', background: c.hits > 0 ? 'var(--surface-3)' : 'var(--surface)', animation: `tabIn .6s var(--ease) ${150 + i * 90}ms both` }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 500, letterSpacing: '-0.04em', color: c.hits > 0 ? 'var(--text)' : 'var(--text-3)', lineHeight: 1 }}>{c.hits}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 4, lineHeight: 1.25 }}>{COMP_LABELS[c.id] ?? c.label}</div>
              </div>
            ))}
          </div>
          <div className="tag" style={{ border: 0, padding: 0, height: 'auto', margin: '16px 0 8px' }}>Fix backlog</div>
          <Tickets report={report} max={3} />
        </div>
        <div className="aw-card" style={{ textAlign: 'center', alignSelf: 'start' }}><SemiGauge value={report.overall} size={210} /><button className="aw-cta" style={{ marginTop: 10 }}>Explore your score</button></div>
      </div>
    </div>
  )
}

function WriteCard() {
  const data = useRef(sampleResume()).current
  const COLORS = ['111111', '3F3F46', '71717A', 'A1A1AA']
  const [ci, setCi] = useState(0)
  const [bold, setBold] = useState(true)
  const user = useRef(false)
  useEffect(() => {
    if (reducedMotion()) return
    const t = setInterval(() => { if (!user.current) setCi((c) => (c + 1) % COLORS.length) }, 1700)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ padding: 22, position: 'relative', height: '100%' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', boxShadow: '0 20px 60px -20px rgba(255,255,255,.12)', background: '#fff', maxHeight: 470, overflow: 'hidden' }}>
        <ResumePreview data={data} template="roadmap" accent={COLORS[ci]} paper="letter" fontSize={10} boldMetrics={bold} showBreaks={false} />
      </div>
      <div className="float" style={{ right: 34, top: 36, width: 250 }}>
        <h5>Customize</h5>
        <div className="rowk"><span>Accent</span><span style={{ display: 'flex', gap: 8 }}>{COLORS.map((c, i) => <button key={c} aria-label={`Accent ${c}`} className={`sw-dot ${ci === i ? 'on' : ''}`} style={{ background: `#${c}` }} onClick={() => { user.current = true; setCi(i) }} />)}</span></div>
        <div className="rowk"><span>Bold metrics</span><button aria-pressed={bold} className={`tog ${bold ? 'on' : ''}`} onClick={() => { user.current = true; setBold((b) => !b) }} aria-label="Bold metrics" /></div>
        <div className="rowk"><span>Paper</span><span style={{ color: '#fff' }}>US Letter / A4</span></div>
        <div className="rowk"><span>Export</span><span style={{ color: '#fff' }}>.tex · PDF</span></div>
      </div>
    </div>
  )
}

function ApplyCard() {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (reducedMotion()) return
    const t = setTimeout(() => setSaved(new Set([JOBS_FIRST])), 1600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ padding: 22 }}>
      <div className="aw-bar"><span className="tag on">All</span><span className="tag">India</span><span className="tag">United States</span><span className="tag soft">Posted in the last 2 days</span><span style={{ flex: 1 }} /><span className="tag">Pipeline · {saved.size}</span></div>
      <div className="aw-card" style={{ padding: 0, overflow: 'hidden' }}><JobsList country="all" limit={6} saved={saved} onSave={(id) => setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })} /></div>
    </div>
  )
}
const JOBS_FIRST = 'Senior Product Manager, PaymentsLumen Pay'

function LearnCard() {
  const [done, setDone] = useState([true, true, false, false, false, false])
  useEffect(() => {
    if (reducedMotion()) return
    const ts = [2, 3, 4].map((i, k) => setTimeout(() => setDone((d) => d.map((x, j) => (j === i ? true : x))), 1200 + k * 1100))
    return () => ts.forEach(clearTimeout)
  }, [])
  const pct = Math.round((done.filter(Boolean).length / done.length) * 100)
  return (
    <div style={{ padding: 22 }}>
      <div className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 14px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Guided path · 8 weeks</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}><b style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.035em', color: 'var(--text)' }}>Break into product management</b><span style={{ fontSize: '2.1rem', fontWeight: 500, letterSpacing: '-0.05em', color: 'var(--text)' }}>{pct}%</span></div>
          <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--ink)', transition: 'width .9s var(--ease)' }} /></div>
        </div>
        <PathList done={done} onToggle={(i) => setDone((d) => d.map((x, j) => (j === i ? !x : x)))} />
      </div>
    </div>
  )
}

export function InAction() {
  const [open, setOpen] = useState(0)
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.3 })
  const bar = useRef<HTMLElement | null>(null)
  const anim = useRef<Animation | null>(null)
  const reduced = reducedMotion()
  useEffect(() => {
    if (reduced || !bar.current) return
    const a = bar.current.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 8000, easing: 'linear', fill: 'forwards' })
    anim.current = a
    a.onfinish = () => setOpen((o) => (o + 1) % ITEMS.length)
    return () => a.cancel()
  }, [open, reduced])
  useEffect(() => {
    const a = anim.current
    if (!a) return
    if (inView) a.play()
    else a.pause()
  }, [inView, open])
  const cards = [<ScoreCard key="s" />, <WriteCard key="w" />, <ApplyCard key="a" />, <LearnCard key="l" />]
  return (
    <section className="rz-sec dark alt" id="product">
      <div className="rz-frame">
        <LabelRow tone="dk">ProductRez in action</LabelRow>
        <div className="rz-pad" style={{ paddingTop: '2.5rem' }}>
          <Headline parts={[{ t: 'Everything you need to land the role,' }, { t: 'in one workspace', mute: true }]} />
          <div className="story" ref={ref} style={{ marginTop: '3.5rem' }}>
            <div>
              {ITEMS.map((it, i) => (
                <div key={it.k} className={`acc-i ${open === i ? 'open' : ''}`}>
                  <button className="acc-h" onClick={() => setOpen(i)} aria-expanded={open === i}>{it.k}<small>{it.n}</small></button>
                  <div className="acc-b"><div>
                    <p>{it.body}</p>
                    {it.to.startsWith('#') ? <a className="btn" href={it.to}>{it.cta}</a> : <Link className="btn" to={it.to}>{it.cta}</Link>}
                  </div></div>
                  {open === i && <i className="acc-bar" ref={(el) => { bar.current = el }} style={{ display: reduced ? 'none' : undefined }} />}
                </div>
              ))}
            </div>
            <div className="story-vis">
              {cards.map((c, i) => <div key={i} className={`story-card ${open === i ? 'on' : ''}`}>{open === i && c}</div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ ATS scanning story */
const FIELDS = ['Name', 'Email', 'Phone', 'Experience', 'Education', 'Skills']
const DESIGNED = [[true, 'Charles Lee'], [true, 'charles@email.com'], [false, 'icon font garbled'], [false, 'columns merged out of order'], [true, 'B.S. Business'], [false, 'inside a graphic: skipped']] as const
const CLEAN = [[true, 'Jordan Lee'], [true, 'jordan.lee@example.com'], [true, '+1 415 555 0100'], [true, '2 roles · 7 bullets'], [true, 'B.S. Business'], [true, '8 skills']] as const

export function AtsStory() {
  const [variant, setVariant] = useState<'designed' | 'clean'>('designed')
  const [phase, setPhase] = useState<'wait' | 'scan' | 'done'>('wait')
  const [shown, setShown] = useState(0)
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.35 })
  useEffect(() => {
    setPhase('wait')
    setShown(0)
    if (!inView) return
    const ts: ReturnType<typeof setTimeout>[] = []
    ts.push(setTimeout(() => setPhase('scan'), 700))
    FIELDS.forEach((_, i) => ts.push(setTimeout(() => setShown(i + 1), 1500 + i * 520)))
    ts.push(setTimeout(() => setPhase('done'), 1500 + FIELDS.length * 520 + 400))
    return () => ts.forEach(clearTimeout)
  }, [variant, inView])
  const data = variant === 'designed' ? DESIGNED : CLEAN
  const ok = variant === 'clean'
  return (
    <section className="rz-sec dark">
      <div className="rz-frame">
        <LabelRow tone="red">The problem</LabelRow>
        <div className="rz-pad" style={{ paddingTop: '2.5rem' }}>
          <div className="band-head" style={{ padding: 0 }}>
            <Headline parts={[{ t: 'Great PMs get overlooked by' }, { t: 'weak resumes', mute: true }]} />
            <p className="lead">Most companies use applicant tracking software to read and store resumes before a recruiter searches them. A resume that doesn’t parse cleanly can lose its experience, its skills, even its contact details.</p>
          </div>
          <div className="ats" ref={ref}>
            <div style={{ textAlign: 'center' }}><span className="ats-tab">What a parser sees</span></div>
            <div className="ats-logos" style={{ justifyContent: 'center' }}>
              <div className="ats-tog" role="group" aria-label="Resume type">
                <button className={variant === 'designed' ? 'on' : ''} onClick={() => setVariant('designed')}>Designed two-column resume</button>
                <button className={variant === 'clean' ? 'on' : ''} onClick={() => setVariant('clean')}>ProductRez LaTeX resume</button>
              </div>
            </div>
            <div className="ats-body">
              <div className={`ats-doc ${phase === 'scan' ? 'scanning' : ''}`}>
                <div key={variant} className={`ats-paper ${variant === 'designed' ? 'cols' : ''}`} style={{ animation: 'tabIn .5s var(--ease) both' }}>
                  {variant === 'designed' ? (
                    <>
                      <div style={{ background: '#ececec', margin: '-16px 0 -16px -18px', padding: '16px 12px' }}>
                        <div className="nm">Charles Lee</div>
                        <h6>Skills</h6>
                        {[80, 60, 90, 50].map((w, i) => <div key={i} style={{ height: 5, background: '#d4d4d4', borderRadius: 3, margin: '6px 0' }}><i style={{ display: 'block', height: '100%', width: `${w}%`, background: '#111', borderRadius: 3 }} /></div>)}
                        <h6>Contact</h6><div>✆ 415 555 0100</div><div>✉ charles@email.com</div>
                      </div>
                      <div><h6>Experience</h6><div>Product Manager · Acme</div><div>Led the redesign of onboarding, improving activation.</div><h6>Education</h6><div>B.S. Business</div></div>
                    </>
                  ) : (
                    <div>
                      <div className="nm">Jordan Lee</div><div style={{ color: '#777' }}>San Francisco, CA | jordan.lee@example.com | +1 415 555 0100</div>
                      <h6>Experience</h6><div style={{ fontWeight: 600 }}>Product Manager, Acme Cloud</div><div>• Prioritised a 140-item backlog across 3 squads, cutting cycle time 21 to 13 days</div><div>• Redesigned onboarding, lifting 7-day activation from 38% to 52%</div>
                      <h6>Education</h6><div>B.S. Business Administration</div><h6>Skills</h6><div>Roadmapping, Discovery, SQL, Amplitude, Jira, Figma</div>
                    </div>
                  )}
                  <i className="scanline" />
                </div>
              </div>
              <div className="ats-out">
                <div className="ats-top">
                  <div><b>Your resume</b><small>Submitted to applicant tracking system</small></div>
                  <span className={`st ${phase === 'wait' ? 'wait' : phase === 'scan' ? 'scan' : ok ? 'ok' : 'bad'}`}>
                    {phase === 'scan' && <i className="sp" />}
                    {phase === 'wait' ? 'Submitted' : phase === 'scan' ? 'Scanning' : ok ? 'Parsed cleanly' : 'Parsing issues'}
                  </span>
                </div>
                {FIELDS.map((f, i) => (
                  <div key={f} className={`fld ${shown > i ? 'show' : ''}`}><i className={data[i][0] ? 'y' : 'n'}>{data[i][0] ? '✓' : '!'}</i><span>{f}</span><span>{data[i][1]}</span></div>
                ))}
                <p style={{ fontSize: '0.76rem', color: '#666', marginTop: 8 }}>Illustrative simulation of common parsing failures. Real systems vary.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
void Icon
