import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TEMPLATES } from '@latex'
import { Icon, type IconName } from '../Icon'
import { ResumePreview } from '../ResumePreview'
import { SemiGauge } from '../SemiGauge'
import { sampleResume } from '../../lib/resume'
import { reducedMotion, useInView, useScrollVar } from '../../lib/motion'
import { CursorEl, DEMO, JOBS, JobsList, PathList, Tickets, bulletImpact, impactColor, useCursor, useDemoReport, useScript, type CursorApi } from './parts'

const TABS: { id: string; label: string; icon: IconName; dur: number }[] = [
  { id: 'score', label: 'Resume Score', icon: 'score', dur: 9500 },
  { id: 'write', label: 'Resume Writer', icon: 'pen', dur: 8000 },
  { id: 'jobs', label: 'Fresh Jobs', icon: 'briefcase', dur: 7000 },
  { id: 'learn', label: 'Learn', icon: 'book', dur: 6500 },
]

interface PaneProps { cursor: CursorApi; stop: React.RefObject<boolean>; root: React.RefObject<HTMLElement | null> }

function ScorePane({ cursor, stop, root }: PaneProps) {
  const [fixed, setFixed] = useState([false, false, false, false])
  const [flash, setFlash] = useState(-1)
  const { bullets, report } = useDemoReport(fixed)
  const set = (i: number, v?: boolean) => {
    setFixed((f) => f.map((x, j) => (j === i ? (v ?? !x) : x)))
    setFlash(i)
    setTimeout(() => setFlash(-1), 900)
  }
  useScript(root, cursor, [1300, 2800, 4300, 5800].map((t, i) => ({ t, sel: `b${i}`, run: () => set(i, true) })), true, stop)
  return (
    <div className="aw-pane">
      <div className="aw-bar">
        <span className="tag soft">Overall review</span><span className="tag">Level: PM</span><span className="tag">Job description</span>
        <span style={{ flex: 1 }} /><span className="tag on">Fix in Writer</span>
      </div>
      <div className="aw-grid">
        <div className="aw-doc">
          <div className="who">Jordan Lee</div>
          <div className="meta">San Francisco, CA · jordan.lee@example.com</div>
          <h6>Experience</h6>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Product Manager · Acme Cloud <span style={{ float: 'right', fontWeight: 400, color: 'var(--text-3)' }}>Jan 2022 – Present</span></div>
          {bullets.map((b, i) => (
            <div key={i} className={`aw-b ${flash === i ? 'flash' : ''}`}>
              <div>
                {b}
                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>{[0, 1, 2].map((k) => <i key={k} style={{ width: 14, height: 3, borderRadius: 2, background: bulletImpact(b) > k ? impactColor(bulletImpact(b)) : 'var(--surface-3)', transition: 'background .5s' }} />)}</div>
              </div>
              <button data-aw={`b${i}`} className={fixed[i] ? 'done' : ''} onClick={() => set(i)}>{fixed[i] ? 'Rewritten' : 'Rewrite'}</button>
            </div>
          ))}
          <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 8 }}>+ 3 more bullets · Associate Product Manager · Beta Systems</div>
        </div>
        <div className="aw-side">
          <div className="aw-card" style={{ textAlign: 'center' }}>
            <SemiGauge value={report.overall} size={210} />
            <button className="aw-cta" style={{ marginTop: 10 }}>Explore your score</button>
          </div>
          <div className="aw-card"><div className="tag" style={{ border: 0, padding: 0, height: 'auto', marginBottom: 6 }}>Fix backlog</div><Tickets report={report} /></div>
        </div>
      </div>
    </div>
  )
}

function WritePane({ cursor, stop, root }: PaneProps) {
  const [i, setI] = useState(0)
  const [accent, setAccent] = useState<string | null>(null)
  const data = useRef(sampleResume()).current
  const t = TEMPLATES[i]
  useScript(root, cursor, [
    { t: 1500, sel: 't1', run: () => setI(1) },
    { t: 3300, sel: 't4', run: () => setI(4) },
    { t: 5100, sel: 't3', run: () => setI(3) },
  ], true, stop)
  return (
    <div className="aw-pane">
      <div className="aw-bar">
        <span className="tag">My PM resume ▾</span>
        {['Contact', 'Summary', 'Experience', 'Projects', 'Education', 'Skills'].map((x) => <span key={x} className="tag">{x}</span>)}
        <span style={{ flex: 1 }} /><span className="tag on">Finish up &amp; preview</span>
      </div>
      <div className="aw-grid">
        <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 14, height: 420, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div key={t.id + (accent ?? '')} style={{ animation: 'tabIn .5s var(--ease) both', boxShadow: '0 12px 30px -14px rgba(0,0,0,.35)' }}>
            <ResumePreview data={data} template={t.id} accent={accent ?? '111111'} paper="letter" fontSize={t.fontSize} showBreaks={false} />
          </div>
        </div>
        <div className="aw-side">
          <div className="aw-card">
            <div className="tag" style={{ border: 0, padding: 0, height: 'auto', marginBottom: 8 }}>Template</div>
            <div className="aw-tpl">
              {TEMPLATES.map((x, k) => (
                <button key={x.id} data-aw={`t${k}`} className={i === k ? 'on' : ''} onClick={() => { setI(k); setAccent(null) }}><b>{x.name}</b><span>{x.bestFor}</span></button>
              ))}
            </div>
          </div>
          <div className="aw-card"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{['111111', '3F3F46', '71717A', 'A1A1AA'].map((c) => <button key={c} aria-label={`Accent ${c}`} onClick={() => setAccent(c)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-strong)', background: `#${c}`, cursor: 'pointer', boxShadow: (accent ?? '111111') === c ? '0 0 0 2px var(--surface), 0 0 0 3.5px var(--text)' : 'none' }} />)}<span style={{ flex: 1 }} /><span className="tag soft">Export .tex</span></div></div>
        </div>
      </div>
    </div>
  )
}

function JobsPane({ cursor, stop, root }: PaneProps) {
  const [c, setC] = useState<'all' | 'US' | 'IN'>('all')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  useScript(root, cursor, [
    { t: 1500, sel: 'cIN', run: () => setC('IN') },
    { t: 3100, sel: 'save0', run: () => toggle(JOBS.filter((j) => j[3] === 'IN')[0][0] + JOBS.filter((j) => j[3] === 'IN')[0][1]) },
    { t: 4700, sel: 'cUS', run: () => setC('US') },
  ], true, stop)
  return (
    <div className="aw-pane">
      <div className="aw-bar">
        <div className="seg" role="group" aria-label="Country">{([['all', 'All'], ['IN', 'India'], ['US', 'United States']] as const).map(([v, l]) => <button key={v} data-aw={v === 'all' ? undefined : `c${v}`} aria-pressed={c === v} onClick={() => setC(v)}>{l}</button>)}</div>
        <span className="tag soft">Posted in the last 2 days</span><span className="tag">Any level</span><span className="tag">Any work mode</span>
        <span style={{ flex: 1 }} /><span className="tag on">Pipeline · {saved.size}</span>
      </div>
      <div className="aw-card" style={{ padding: 0, overflow: 'hidden' }}><JobsList country={c} saved={saved} onSave={toggle} /></div>
    </div>
  )
}

function LearnPane({ cursor, stop, root }: PaneProps) {
  const [done, setDone] = useState([true, true, false, false, false, false])
  const tog = (i: number, v?: boolean) => setDone((d) => d.map((x, j) => (j === i ? (v ?? !x) : x)))
  const pct = Math.round((done.filter(Boolean).length / done.length) * 100)
  useScript(root, cursor, [{ t: 1400, sel: 's2', run: () => tog(2, true) }, { t: 2700, sel: 's3', run: () => tog(3, true) }, { t: 4000, sel: 's4', run: () => tog(4, true) }], true, stop)
  return (
    <div className="aw-pane">
      <div className="aw-bar"><span className="tag soft">Guided path · 8 weeks</span><span className="tag">Break into PM</span><span className="tag">Interview sprint</span><span className="tag">AI PM</span><span style={{ flex: 1 }} /><span className="tag on">{pct}% complete</span></div>
      <div className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ fontSize: '1.2rem', fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>Break into product management</b><span style={{ fontSize: '1.6rem', fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text)' }}>{pct}%</span></div>
          <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--ink)', transition: 'width .8s var(--ease)' }} /></div>
        </div>
        <PathList done={done} onToggle={(i) => tog(i)} />
      </div>
    </div>
  )
}

const PANES = [ScorePane, WritePane, JobsPane, LearnPane]

export function AppWindow() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.25 })
  const win = useRef<HTMLDivElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const prog = useRef<HTMLElement | null>(null)
  const anim = useRef<Animation | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState({ x: 0, w: 120 })
  const stop = useRef(false)
  const reduced = reducedMotion()
  const { state, api } = useCursor(screen)
  useScrollVar(win, 'enter')

  useLayoutEffect(() => {
    const el = tabsRef.current?.children[active + 1] as HTMLElement | undefined // child 0 is the indicator
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth })
  }, [active])

  // autoplay with a progress bar under the active tab
  useEffect(() => {
    stop.current = false
    if (reduced || !prog.current) return
    const a = prog.current.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: TABS[active].dur, easing: 'linear', fill: 'forwards' })
    anim.current = a
    a.onfinish = () => setActive((x) => (x + 1) % TABS.length)
    return () => a.cancel()
  }, [active, reduced])
  useEffect(() => {
    const a = anim.current
    if (!a) return
    if (paused || !inView) a.pause()
    else a.play()
  }, [paused, inView, active])

  const Pane = PANES[active]
  const take = () => {
    stop.current = true
    api.hide()
    setPaused(true)
  }
  return (
    <div ref={ref}>
      <div ref={win} className="rz-win" onPointerDown={take} onMouseLeave={() => { if (stop.current) { stop.current = false; setPaused(false) } }}>
        <div className="aw-chrome">
          <div className="aw-dots"><i /><i /><i /></div>
          <div className="aw-tabs" ref={tabsRef} role="tablist" aria-label="Product tour">
            <span className="aw-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}>
              <i className="aw-prog" ref={(el) => { prog.current = el }} style={{ display: reduced ? 'none' : undefined }} />
            </span>
            {TABS.map((t, i) => (
              <button key={t.id} role="tab" aria-selected={active === i} className="aw-tab" onClick={() => { setActive(i); setPaused(false) }}>
                <Icon name={t.icon} size={15} />{t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="aw-screen" ref={screen}>
          <div className="aw-rail">
            <div className="logo">P</div>
            {TABS.map((t, i) => <span key={t.id} className={`ic ${active === i ? 'on' : ''}`}><Icon name={t.icon} size={18} /></span>)}
          </div>
          <div className="aw-main" ref={(el) => { (stopRoot.current = el) }}>
            <Pane key={active} cursor={api} stop={stop} root={stopRoot} />
          </div>
          <CursorEl {...state} />
        </div>
      </div>
    </div>
  )
}
const stopRoot: { current: HTMLElement | null } = { current: null }
void DEMO
