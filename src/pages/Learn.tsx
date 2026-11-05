import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/app'
import type { LearningPath, Progress, Resource, ResourceKind } from '../lib/types'
import { Icon, type IconName } from '../components/Icon'
import { AuthPrompt, LockCard } from '../components/Paywall'

const KIND: Record<ResourceKind, { icon: IconName; label: string }> = {
  video: { icon: 'video', label: 'Video' },
  article: { icon: 'file', label: 'Article' },
  newsletter: { icon: 'mail', label: 'Newsletter' },
  podcast: { icon: 'mic', label: 'Podcast' },
  book: { icon: 'book', label: 'Book' },
  course: { icon: 'layout', label: 'Course' },
  tool: { icon: 'tool', label: 'Tool' },
  template: { icon: 'list', label: 'Template' },
}
const TOPICS: Record<string, string> = { start: 'Break into PM', sense: 'Product sense', discovery: 'Discovery', exec: 'Execution', strategy: 'Strategy', data: 'Data & experiments', ai: 'AI PM', tech: 'Technical', interview: 'Interviews', career: 'Career & leadership' }

export default function Learn() {
  const { user, ent, api, openAuth, ready } = useApp()
  const [data, setData] = useState<{ resources: Resource[]; paths: LearningPath[] } | null>(null)
  const [prog, setProg] = useState<Progress>({})
  const [topic, setTopic] = useState('all')
  const [kind, setKind] = useState<'all' | ResourceKind>('all')
  const [level, setLevel] = useState('all')
  const [q, setQ] = useState('')
  const [pathId, setPathId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!api || !user || !ent.active) return
    api.listResources().then(setData)
    api.getProgress().then(setProg)
  }, [api, user, ent.active])

  const byId = useMemo(() => new Map((data?.resources ?? []).map((r) => [r.id, r])), [data])
  const set = async (id: string, patch: { done?: boolean; bookmarked?: boolean }) => {
    setProg((p) => ({ ...p, [id]: { ...p[id], ...patch } }))
    await api!.setProgress(id, patch)
  }
  const pathPct = (p: LearningPath) => {
    const ids = p.steps.flatMap((s) => s.ids)
    return ids.length ? Math.round((ids.filter((i) => prog[i]?.done).length / ids.length) * 100) : 0
  }

  const header = (
    <div className="page-head">
      <div>
        <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>Learn product</h1>
        <p>A hand-picked library of the videos, articles, books and tools that actually move the needle, with guided paths so you never wonder what to study next.</p>
      </div>
    </div>
  )
  if (!ready) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>
  if (!user) return <div className="page">{header}<AuthPrompt title="Sign in to explore the library" body="A free account is the first step." onSignIn={() => openAuth('Sign in to see the PM learning library.')} /></div>
  if (!ent.active) return <div className="page">{header}<LockCard title="Unlock the learning library" body="Guided paths, the best YouTube videos, newsletters, books and tools for aspiring and working PMs, all verified and curated." /></div>
  if (!data) return <div className="page">{header}<div className="skeleton" style={{ height: 320 }} /></div>

  const path = data.paths.find((p) => p.id === pathId)
  const list = data.resources.filter((r) => (topic === 'all' || r.topics.includes(topic)) && (kind === 'all' || r.kind === kind) && (level === 'all' || r.level === level) && (!saved || prog[r.id]?.bookmarked) && (!q || `${r.title} ${r.source} ${r.why}`.toLowerCase().includes(q.toLowerCase())))

  const Card = ({ r, i = 0 }: { r: Resource; i?: number }) => {
    const p = prog[r.id] ?? {}
    return (
      <article className={`res ${p.done ? 'done' : ''}`} style={{ ['--i' as string]: Math.min(i, 12) }}>
        <div className="kind"><Icon name={KIND[r.kind].icon} /></div>
        <div>
          <h3><a href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{r.title}</a></h3>
          <div className="row" style={{ gap: 6, margin: '4px 0' }}>
            <span className="chip">{KIND[r.kind].label}</span>
            <span className="chip">{r.level}</span>
            {r.minutes ? <span className="chip"><Icon name="clock" size={11} /> {r.minutes >= 60 ? `${Math.round(r.minutes / 6) / 10}h` : `${r.minutes}m`}</span> : null}
            <span className="faint" style={{ fontSize: '0.82rem' }}>{r.source}</span>
          </div>
          <p className="muted" style={{ fontSize: '0.92rem' }}>{r.why}</p>
        </div>
        <div className="acts row" style={{ flexWrap: 'nowrap' }}>
          <button className="btn sm ghost" aria-pressed={!!p.bookmarked} onClick={() => set(r.id, { bookmarked: !p.bookmarked })} aria-label="Bookmark"><Icon name="bookmark" size={14} style={{ fill: p.bookmarked ? 'currentColor' : 'none' }} /></button>
          <button className={`btn sm ${p.done ? 'green' : 'ghost'}`} aria-pressed={!!p.done} onClick={() => set(r.id, { done: !p.done })}><Icon name="check" size={14} /> {p.done ? 'Done' : 'Mark done'}</button>
          <a className="btn sm dark" href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${r.title}`}><Icon name="external" size={14} /> <span className="open-l">Open</span></a>
        </div>
      </article>
    )
  }

  if (path) {
    return (
      <div className="page">
        <button className="link-btn" onClick={() => setPathId(null)}>← All paths</button>
        <div className="page-head" style={{ marginTop: 10 }}><div><h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>{path.title}</h1><p>{path.blurb}</p></div><div className="ring" style={{ ['--p' as string]: pathPct(path) }}><span>{pathPct(path)}%</span></div></div>
        {path.steps.map((s) => (
          <div key={s.week}>
            <div className="week">{path.weeks > 2 ? `Week ${s.week}` : `Part ${s.week}`} · {s.title}</div>
            {s.ids.map((id) => byId.get(id)).filter((r): r is Resource => !!r).map((r) => <Card key={r.id} r={r} />)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      {header}
      <h2 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Guided paths</h2>
      <div className="paths">
        {data.paths.map((p) => (
          <button key={p.id} className="card path" onClick={() => setPathId(p.id)}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <span className="chip">{p.weeks} {p.weeks === 1 ? 'week' : 'weeks'}</span>
              <div className="ring" style={{ ['--p' as string]: pathPct(p) }}><span>{pathPct(p)}%</span></div>
            </div>
            <h3>{p.title}</h3>
            <p className="muted" style={{ fontSize: '0.92rem' }}>{p.blurb}</p>
          </button>
        ))}
      </div>
      <h2 style={{ fontSize: '1.4rem', margin: '1.6rem 0 12px' }}>The library ({list.length})</h2>
      <div className="filters">
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Search the library…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search resources" />
        <select className="select" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as 'all' | ResourceKind)} aria-label="Type"><option value="all">All types</option>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select className="select" style={{ width: 'auto' }} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level"><option value="all">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
        <button className={`chip btnish ${saved ? 'on' : ''}`} onClick={() => setSaved((s) => !s)} aria-pressed={saved}><Icon name="bookmark" size={12} /> Bookmarked</button>
      </div>
      <div className="row" style={{ gap: 6, marginBottom: 16 }}>
        {['all', ...Object.keys(TOPICS)].map((t) => <button key={t} className={`chip btnish ${topic === t ? 'on' : ''}`} onClick={() => setTopic(t)} aria-pressed={topic === t}>{t === 'all' ? 'All topics' : TOPICS[t]}</button>)}
      </div>
      {list.length === 0 ? <div className="card soft">Nothing matches. Try clearing a filter.</div> : list.map((r, i) => <Card key={r.id} r={r} i={i} />)}
    </div>
  )
}
