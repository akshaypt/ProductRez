import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { buildPlainText, TEMPLATES, templateById } from '@latex'
import { reviewBullet, scoreResume, type ResumeData } from '@scoring'
import { useApp } from '../state/app'
import { ApiError, type BuildOpts, type StoredResume } from '../lib/types'
import { Icon } from '../components/Icon'
import { ResumePreview } from '../components/ResumePreview'
import { AuthPrompt, LockCard } from '../components/Paywall'
import { download, guessPaper, slug, store, uid } from '../lib/util'
import { emptyResume, placeholderCount, sampleResume, withIds } from '../lib/resume'

const FLAGS: Record<string, string> = { 'no-metric': 'add a metric', 'weak-verb': 'weak opener', 'no-verb': 'start with a verb', 'too-long': 'too long', 'too-short': 'too short', 'first-person': 'drop I/we', passive: 'passive', buzzword: 'buzzword' }
const METRIC_CHIPS = ['[X%] lift', 'from [A] to [B]', 'for [N] users', 'in [N] weeks', 'saving $[X]']

const newResume = (data: ResumeData, title = 'My PM resume'): StoredResume => ({
  id: uid(),
  title,
  template: 'ledger',
  options: { paper: guessPaper(), fontSize: 11, accent: templateById('ledger').accentDefault, boldMetrics: false },
  data,
  updatedAt: new Date().toISOString(),
})

function Placeholders({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/g).map((p, i) => (/^\[.*\]$/.test(p) ? <span key={i} className="ph">{p}</span> : p))}</>
}

function BulletEditor({ value, role, level, onChange, onRemove, onMove, first, last }: { value: string; role: string; level: string; onChange: (v: string) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; first: boolean; last: boolean }) {
  const { api, toast } = useApp()
  const [coach, setCoach] = useState(false)
  const [opts, setOpts] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const rev = useMemo(() => (value.trim().length > 3 ? reviewBullet(value, 'experience', role, true) : null), [value, role])
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight + 2}px`
    }
  }, [value])

  const rewrite = async () => {
    if (!api || value.trim().length < 8) return toast('Write a rough bullet first, then rewrite it.', 'err')
    setBusy(true)
    try {
      setOpts(await api.rewriteBullet(value, role, level))
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ai_not_configured') {
        const { localRewrite } = await import('../lib/rewrite')
        setOpts(localRewrite(value, role, level))
        toast('AI rewrite isn’t enabled yet. Showing fill-in-the-blank scaffolds.')
      } else toast(e instanceof Error ? e.message : 'Rewrite failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bullet-edit">
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <textarea ref={ref} className="textarea" rows={2} style={{ minHeight: 52 }} value={value} placeholder="Led X, which moved Y by Z% in N months" onChange={(e) => onChange(e.target.value)} aria-label="Bullet" />
        <div style={{ display: 'grid', gap: 4 }}>
          <button className="btn sm ghost" style={{ minHeight: 28, padding: '0 8px' }} onClick={() => onMove(-1)} disabled={first} aria-label="Move up"><Icon name="up" size={14} /></button>
          <button className="btn sm ghost" style={{ minHeight: 28, padding: '0 8px' }} onClick={() => onMove(1)} disabled={last} aria-label="Move down"><Icon name="down" size={14} /></button>
        </div>
      </div>
      <div className="meta">
        {rev && <span className={`meter l${rev.impact}`} title={`Impact ${rev.impact}/3`}><i /><i /><i /></span>}
        {rev?.flags.slice(0, 3).map((f) => <span key={f} className="chip warn">{FLAGS[f]}</span>)}
        <span style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={() => setCoach((c) => !c)} aria-expanded={coach}><Icon name="edit" size={14} /> Coach</button>
        <button className="btn sm ghost" onClick={onRemove} aria-label="Remove bullet"><Icon name="trash" size={14} /></button>
      </div>
      {coach && (
        <div className="coach">
          <b>Impact formula: Verb + what you owned + metric change + timeframe</b>
          <div className="row" style={{ gap: 6 }}>
            {METRIC_CHIPS.map((c) => (
              <button key={c} className="chip btnish" onClick={() => onChange(`${value.replace(/\s+$/, '')}${value.trim() ? ', ' : ''}${c}`)}>+ {c}</button>
            ))}
          </div>
          <div>
            <button className="btn sm" onClick={rewrite} disabled={busy}><Icon name="edit" size={14} /> {busy ? 'Working…' : 'Suggest rewrites'}</button>
            <span className="faint" style={{ fontSize: '0.8rem', marginLeft: 8 }}>Never invents numbers. Fill the highlighted [blanks] yourself.</span>
          </div>
          {opts && (
            <div style={{ display: 'grid', gap: 6 }}>
              {opts.map((o, i) => (
                <button key={i} className="opt" onClick={() => { onChange(o); setOpts(null) }}><Placeholders text={o} /></button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Bullets({ items, onChange, role, level }: { items: string[]; onChange: (b: string[]) => void; role: string; level: string }) {
  const move = (i: number, d: -1 | 1) => {
    const n = [...items]
    ;[n[i], n[i + d]] = [n[i + d], n[i]]
    onChange(n)
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((b, i) => (
        <BulletEditor key={i} value={b} role={role} level={level} first={i === 0} last={i === items.length - 1} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} onRemove={() => onChange(items.filter((_, j) => j !== i))} onMove={(d) => move(i, d)} />
      ))}
      <button className="btn sm ghost" onClick={() => onChange([...items, ''])}><Icon name="plus" size={14} /> Add bullet</button>
    </div>
  )
}

const F = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <div className="field"><label>{label}</label><input className="input" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>
)

export default function Writer() {
  const { user, ent, api, openAuth, toast, prefs, ready } = useApp()
  const [params] = useSearchParams()
  const [list, setList] = useState<StoredResume[]>([])
  const [cur, setCur] = useState<StoredResume | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [pages, setPages] = useState(1)
  const [mobileView, setMobileView] = useState(false)
  const [menu, setMenu] = useState(false)
  const [printing, setPrinting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const level = prefs.stage === 'senior' ? 'senior' : prefs.stage === 'aspiring' ? 'apm' : 'pm'

  useEffect(() => {
    if (!api || !user || !ent.active) {
      setLoaded(true)
      return
    }
    api.listResumes().then((rs) => {
      const imported = params.get('import') ? store.get<ResumeData | null>('pr.writer.import', null) : null
      if (imported) {
        const r = newResume(withIds(imported), 'Imported from score')
        store.set('pr.writer.import', null)
        setList([r, ...rs])
        setCur(r)
        toast('Imported your scored resume. Review each section, parsing isn’t perfect.')
      } else {
        setList(rs)
        setCur(rs[0] ?? null)
      }
      setLoaded(true)
    })
  }, [api, user, ent.active, params, toast])

  const patch = useCallback((fn: (r: StoredResume) => StoredResume) => {
    setCur((c) => {
      if (!c) return c
      const n = fn(c)
      return n
    })
  }, [])
  const data = (fn: (d: ResumeData) => void) => patch((r) => { const d = structuredClone(r.data); fn(d); return { ...r, data: d } })

  // Autosave (debounced): local first so offline edits never get lost, then the account.
  useEffect(() => {
    if (!cur || !api) return
    store.set(`pr.writer.draft.${cur.id}`, cur)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.saveResume(cur).then(() => setList((l) => [cur, ...l.filter((x) => x.id !== cur.id)])).catch(() => {})
    }, 900)
    return () => clearTimeout(saveTimer.current)
  }, [cur, api])

  const live = useMemo(() => {
    if (!cur) return null
    try {
      return scoreResume({ text: buildPlainText(cur.data), targetLevel: level === 'apm' ? 'apm' : level === 'senior' ? 'senior' : 'auto' })
    } catch {
      return null
    }
  }, [cur, level])

  if (!ready || !loaded) return <div className="page"><div className="skeleton" style={{ height: 420 }} /></div>
  if (!user) return <div className="page"><AuthPrompt title="Sign in to build your resume" body="The Writer turns your experience into a recruiter-ready, ATS-safe LaTeX resume." onSignIn={() => openAuth('Sign in to open the Resume Writer.')} /></div>
  if (!ent.active) {
    const s = sampleResume()
    return (
      <div className="page">
        <div className="page-head"><div><h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>PM Resume Writer</h1><p>Six ATS-safe templates, a bullet coach and one-click LaTeX export.</p></div></div>
        <div className="stack">
          <LockCard title="The Writer is part of ProductRez Pro" body="Build your resume once, then tailor it to every job. Export clean LaTeX that parses perfectly in applicant tracking systems." compact />
          <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 12 }}>
            {TEMPLATES.map((t) => (
              <div key={t.id} style={{ flex: 'none', width: 190 }}>
                <div className="tpl-thumb"><ResumePreview data={s} template={t.id} accent={t.accentDefault} paper="letter" fontSize={t.fontSize} width={190} showBreaks={false} /></div>
                <b style={{ display: 'block', marginTop: 6 }}>{t.name}</b>
                <span className="faint" style={{ fontSize: '0.8rem' }}>{t.bestFor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!cur) {
    return (
      <div className="page">
        <div className="page-head"><div><h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>PM Resume Writer</h1><p>Start fresh, or import the resume you just scored.</p></div></div>
        <div className="grid2">
          <div className="card stack"><h3>Start from a blank page</h3><p className="muted">We’ll scaffold the sections PM recruiters expect.</p><button className="btn" onClick={() => setCur(newResume(emptyResume()))}><Icon name="plus" size={18} /> New resume</button></div>
          <div className="card stack"><h3>See it with a sample</h3><p className="muted">Load a realistic Senior PM resume to explore templates.</p><button className="btn ghost" onClick={() => setCur(newResume(sampleResume(), 'Sample PM resume'))}><Icon name="eye" size={18} /> Load sample</button></div>
        </div>
      </div>
    )
  }

  const meta = templateById(cur.template)
  const setOpt = (o: Partial<BuildOpts>) => patch((r) => ({ ...r, options: { ...r.options, ...o } }))
  const ph = placeholderCount(cur.data)
  const guard = () => {
    if (ph > 0 && !window.confirm(`${ph} [placeholder] ${ph > 1 ? 'blanks are' : 'blank is'} still in your resume. Export anyway?`)) return false
    return true
  }
  const fname = slug(cur.data.basics.name || cur.title)

  const exportTex = async (mode: 'download' | 'copy' | 'overleaf') => {
    if (!api || !guard()) return
    setMenu(false)
    try {
      const tex = await api.exportLatex(cur.data, cur.template, cur.options)
      if (mode === 'download') {
        download(`${fname}-resume.tex`, tex, 'application/x-tex')
        toast('LaTeX downloaded. Compile with pdfLaTeX (Overleaf works great).')
      } else if (mode === 'copy') {
        await navigator.clipboard.writeText(tex)
        toast('LaTeX copied')
      } else {
        const f = document.createElement('form')
        f.method = 'POST'
        f.action = 'https://www.overleaf.com/docs'
        f.target = '_blank'
        for (const [k, v] of Object.entries({ encoded_snip: encodeURIComponent(tex), snip_name: `${fname}-resume.tex`, engine: 'pdflatex' })) {
          const i = document.createElement('input')
          i.type = 'hidden'
          i.name = k
          i.value = v
          f.appendChild(i)
        }
        document.body.appendChild(f)
        f.submit()
        f.remove()
      }
    } catch (e) {
      toast(e instanceof ApiError && e.code === 'paywall' ? 'Your plan has expired. Renew to export.' : 'Export failed. Try again.', 'err')
    }
  }
  const printPdf = () => {
    if (!guard()) return
    setMenu(false)
    setPrinting(true)
    const done = () => { setPrinting(false); window.removeEventListener('afterprint', done) }
    window.addEventListener('afterprint', done)
    setTimeout(() => window.print(), 350)
  }

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="writer-bar">
        <input className="input" style={{ maxWidth: 260 }} value={cur.title} onChange={(e) => patch((r) => ({ ...r, title: e.target.value }))} aria-label="Resume name" />
        {list.length > 1 && (
          <select className="select" style={{ maxWidth: 200 }} value={cur.id} onChange={(e) => setCur(list.find((x) => x.id === e.target.value) ?? cur)} aria-label="Switch resume">
            {list.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        )}
        <button className="btn sm ghost" onClick={() => { const r = newResume(emptyResume(), 'New resume'); setList((l) => [r, ...l]); setCur(r) }}><Icon name="plus" size={14} /> New</button>
        <button className="btn sm ghost" onClick={() => { const r = { ...structuredClone(cur), id: uid(), title: `${cur.title} (copy)` }; setList((l) => [r, ...l]); setCur(r) }}><Icon name="copy" size={14} /> Duplicate</button>
        <button className="btn sm ghost" onClick={() => { if (!window.confirm('Delete this resume?')) return; api?.deleteResume(cur.id); const rest = list.filter((x) => x.id !== cur.id); setList(rest); setCur(rest[0] ?? null) }} aria-label="Delete resume"><Icon name="trash" size={14} /></button>
        <span style={{ flex: 1 }} />
        {live && <div className="live-score" title="Live PM-resume score of your current draft"><b>{live.overall}</b><span className="mono faint">live score</span></div>}
        <div style={{ position: 'relative' }}>
          <button className="btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} data-testid="export-btn"><Icon name="download" size={18} /> Export</button>
          {menu && (
            <div className="card pop" role="menu">
              <button onClick={() => exportTex('download')} role="menuitem" data-testid="dl-tex"><b>Download .tex (best for ATS)</b><span>Compile with pdfLaTeX for a clean text layer</span></button>
              <button onClick={() => exportTex('overleaf')} role="menuitem"><b>Open in Overleaf</b><span>Compile to PDF in one click</span></button>
              <button onClick={printPdf} role="menuitem"><b>Print / Save as PDF</b><span>Quick PDF from the preview</span></button>
              <button onClick={() => exportTex('copy')} role="menuitem"><b>Copy LaTeX</b></button>
              <button onClick={() => { navigator.clipboard.writeText(buildPlainText(cur.data)); setMenu(false); toast('Plain text copied. Paste it into ATS portals.') }} role="menuitem"><b>Copy plain text</b><span>For “paste your resume” forms</span></button>
              <button onClick={() => { download(`${fname}-resume.txt`, buildPlainText(cur.data)); setMenu(false) }} role="menuitem"><b>Download .txt</b></button>
            </div>
          )}
        </div>
      </div>
      <div className={`writer ${mobileView ? 'show-preview' : ''}`}>
        <div className="edit-col">
          <details className="acc" open>
            <summary>Template & style <span className="chip">{meta.name}</span></summary>
            <div className="in">
              <div className="tpl-pick">
                {TEMPLATES.map((t) => (
                  <button key={t.id} className="tpl-opt" aria-pressed={cur.template === t.id} onClick={() => patch((r) => ({ ...r, template: t.id, options: { ...r.options, accent: t.accentDefault, fontSize: t.fontSize } }))}>
                    <div className="tpl-thumb"><ResumePreview data={cur.data} template={t.id} accent={t.accentDefault} paper="letter" fontSize={t.fontSize} showBreaks={false} /></div>
                    <b style={{ fontSize: '0.85rem' }}>{t.name}</b>
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: '0.9rem' }}><b>{meta.name}:</b> {meta.tagline}. Best for: {meta.bestFor}.</p>
              <div className="row">
                <div className="seg" role="group" aria-label="Paper"><button aria-pressed={cur.options.paper === 'letter'} onClick={() => setOpt({ paper: 'letter' })}>US Letter</button><button aria-pressed={cur.options.paper === 'a4'} onClick={() => setOpt({ paper: 'a4' })}>A4</button></div>
                <div className="seg" role="group" aria-label="Font size"><button aria-pressed={cur.options.fontSize === 10} onClick={() => setOpt({ fontSize: 10 })}>10pt</button><button aria-pressed={cur.options.fontSize === 11} onClick={() => setOpt({ fontSize: 11 })}>11pt</button></div>
                {meta.accentChoices.length > 1 && <div className="row" style={{ gap: 8 }} role="group" aria-label="Accent colour">{meta.accentChoices.map((c) => <button key={c} className="swatch" style={{ background: `#${c}` }} aria-label={`Accent #${c}`} aria-pressed={cur.options.accent === c} onClick={() => setOpt({ accent: c })} />)}</div>}
              </div>
              <label className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" style={{ marginTop: 5, flex: 'none' }} checked={cur.options.boldMetrics} onChange={(e) => setOpt({ boldMetrics: e.target.checked })} /> Auto-bold numbers and metrics so skimmers spot them</label>
            </div>
          </details>

          <details className="acc" open>
            <summary>Header</summary>
            <div className="in">
              <div className="grid2">
                <F label="Full name" value={cur.data.basics.name} onChange={(v) => data((d) => (d.basics.name = v))} />
                <F label="Headline" value={cur.data.basics.headline} placeholder="Senior Product Manager · Payments" onChange={(v) => data((d) => (d.basics.headline = v))} />
                <F label="Email" type="email" value={cur.data.basics.email} onChange={(v) => data((d) => (d.basics.email = v))} />
                <F label="Phone" value={cur.data.basics.phone} onChange={(v) => data((d) => (d.basics.phone = v))} />
                <F label="Location" value={cur.data.basics.location} placeholder="Bengaluru, India" onChange={(v) => data((d) => (d.basics.location = v))} />
                <F label="LinkedIn" value={cur.data.basics.linkedin} placeholder="linkedin.com/in/you" onChange={(v) => data((d) => (d.basics.linkedin = v))} />
                <F label="Portfolio / website" value={cur.data.basics.website} onChange={(v) => data((d) => (d.basics.website = v))} />
              </div>
            </div>
          </details>

          <details className="acc">
            <summary>Summary <span className="faint" style={{ fontWeight: 500, fontSize: '0.8rem' }}>optional, 2 lines</span></summary>
            <div className="in"><textarea className="textarea" rows={3} value={cur.data.summary} placeholder="PM with N years in [domain]. Best proof point. What you want next." onChange={(e) => data((d) => (d.summary = e.target.value))} /></div>
          </details>

          <details className="acc" open>
            <summary>Experience</summary>
            <div className="in">
              {cur.data.experience.map((x, xi) => (
                <div className="entry" key={x.id}>
                  <div className="grid2">
                    <F label="Company" value={x.company} onChange={(v) => data((d) => (d.experience[xi].company = v))} />
                    <F label="Title" value={x.title} onChange={(v) => data((d) => (d.experience[xi].title = v))} />
                    <F label="Start" value={x.start} placeholder="Jan 2021" onChange={(v) => data((d) => (d.experience[xi].start = v))} />
                    <F label="End" value={x.end} placeholder="Present" onChange={(v) => data((d) => (d.experience[xi].end = v))} />
                    <F label="Location" value={x.location} onChange={(v) => data((d) => (d.experience[xi].location = v))} />
                  </div>
                  <Bullets items={x.bullets} role={x.title} level={level} onChange={(b) => data((d) => (d.experience[xi].bullets = b))} />
                  <div className="row"><button className="btn sm ghost" disabled={xi === 0} onClick={() => data((d) => { const e = d.experience; [e[xi - 1], e[xi]] = [e[xi], e[xi - 1]] })}><Icon name="up" size={14} /> Move up</button><button className="btn sm ghost" onClick={() => data((d) => d.experience.splice(xi, 1))}><Icon name="trash" size={14} /> Remove role</button></div>
                </div>
              ))}
              <button className="btn ghost" onClick={() => data((d) => d.experience.push({ id: uid(), company: '', title: '', location: '', start: '', end: '', bullets: ['', '', ''] }))}><Icon name="plus" size={16} /> Add role</button>
            </div>
          </details>

          <details className="acc">
            <summary>Projects <span className="faint" style={{ fontWeight: 500, fontSize: '0.8rem' }}>great for APMs & switchers</span></summary>
            <div className="in">
              {cur.data.projects.map((p, pi) => (
                <div className="entry" key={p.id}>
                  <div className="grid2">
                    <F label="Project" value={p.name} onChange={(v) => data((d) => (d.projects[pi].name = v))} />
                    <F label="Tag" value={p.tag} placeholder="Side project, 2025" onChange={(v) => data((d) => (d.projects[pi].tag = v))} />
                    <F label="Link" value={p.link} onChange={(v) => data((d) => (d.projects[pi].link = v))} />
                  </div>
                  <Bullets items={p.bullets} role={p.name} level={level} onChange={(b) => data((d) => (d.projects[pi].bullets = b))} />
                  <button className="btn sm ghost" onClick={() => data((d) => d.projects.splice(pi, 1))}><Icon name="trash" size={14} /> Remove</button>
                </div>
              ))}
              <button className="btn ghost" onClick={() => data((d) => d.projects.push({ id: uid(), name: '', tag: '', link: '', bullets: ['', ''] }))}><Icon name="plus" size={16} /> Add project</button>
            </div>
          </details>

          <details className="acc">
            <summary>Education</summary>
            <div className="in">
              {cur.data.education.map((e, ei) => (
                <div className="entry" key={e.id}>
                  <div className="grid2">
                    <F label="School" value={e.school} onChange={(v) => data((d) => (d.education[ei].school = v))} />
                    <F label="Degree" value={e.degree} onChange={(v) => data((d) => (d.education[ei].degree = v))} />
                    <F label="Start" value={e.start} onChange={(v) => data((d) => (d.education[ei].start = v))} />
                    <F label="End" value={e.end} onChange={(v) => data((d) => (d.education[ei].end = v))} />
                  </div>
                  <button className="btn sm ghost" onClick={() => data((d) => d.education.splice(ei, 1))}><Icon name="trash" size={14} /> Remove</button>
                </div>
              ))}
              <button className="btn ghost" onClick={() => data((d) => d.education.push({ id: uid(), school: '', degree: '', location: '', start: '', end: '', details: '' }))}><Icon name="plus" size={16} /> Add education</button>
            </div>
          </details>

          <details className="acc">
            <summary>Skills</summary>
            <div className="in">
              {cur.data.skills.map((s, si) => (
                <div className="grid2" key={s.id}>
                  <F label="Group" value={s.label} onChange={(v) => data((d) => (d.skills[si].label = v))} />
                  <F label="Items (comma separated)" value={s.items} onChange={(v) => data((d) => (d.skills[si].items = v))} />
                </div>
              ))}
              <button className="btn ghost" onClick={() => data((d) => d.skills.push({ id: uid(), label: '', items: '' }))}><Icon name="plus" size={16} /> Add group</button>
            </div>
          </details>

          {live && (
            <details className="acc">
              <summary>Live review <span className="chip">{live.overall}/100</span></summary>
              <div className="in">
                {live.findings.slice(0, 5).map((f) => (<div key={f.id} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}><span className={`chip ${f.priority.toLowerCase()}`}>{f.priority}</span><span>{f.title}</span></div>))}
                {live.findings.length === 0 && <span>Looking sharp. Nothing to fix.</span>}
                <Link to="/score" className="link-btn">Run the full review in Resume Score</Link>
              </div>
            </details>
          )}
        </div>

        <div className="preview-col">
          <div className="row" style={{ marginBottom: 8, justifyContent: 'space-between' }}>
            <span className={`chip ${pages > 1 ? 'bad' : 'good'}`}>{pages > 1 ? `${pages} pages, trim to 1` : '1 page'}</span>
            <span className="faint" style={{ fontSize: '0.8rem' }}>Preview approximates the LaTeX output</span>
          </div>
          <div className="paper-wrap"><ResumePreview data={cur.data} template={cur.template} accent={cur.options.accent} paper={cur.options.paper} fontSize={cur.options.fontSize} boldMetrics={cur.options.boldMetrics} onPages={setPages} /></div>
        </div>
      </div>
      <button className="btn lg" style={{ position: 'fixed', right: 16, bottom: 'calc(5.2rem + var(--safe-b))', zIndex: 25 }} id="mobile-toggle" onClick={() => setMobileView((v) => !v)}>
        <Icon name={mobileView ? 'edit' : 'eye'} size={18} /> {mobileView ? 'Edit' : 'Preview'}
      </button>
      <style>{`#mobile-toggle{display:none}@media(max-width:1100px){#mobile-toggle{display:inline-flex}}`}</style>
      {printing && createPortal(
        <div id="print-root">
          <style>{`@page{size:${cur.options.paper === 'a4' ? 'A4' : 'letter'};margin:0}`}</style>
          <ResumePreview data={cur.data} template={cur.template} accent={cur.options.accent} paper={cur.options.paper} fontSize={cur.options.fontSize} boldMetrics={cur.options.boldMetrics} fit={false} showBreaks={false} width={cur.options.paper === 'a4' ? 794 : 816} />
        </div>,
        document.body,
      )}
    </div>
  )
}
