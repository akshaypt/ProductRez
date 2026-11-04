import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/app'
import { ApiError, type Job, type JobStatus, type SavedJob } from '../lib/types'
import { Icon } from '../components/Icon'
import { AuthPrompt, LockCard } from '../components/Paywall'
import { nextDrop, postedLabel } from '../lib/util'

const TONES = ['#ffd6c9', '#d4c8ff', '#c9f0dd', '#ffe9a8', '#cfe0ff', '#ffd1e8']
const tone = (s: string) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]
const LEVELS = { apm: 'APM / Entry', pm: 'PM', senior: 'Senior', lead: 'Lead / Group+' } as const
const MODES = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' } as const
const STATUS: { id: JobStatus; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
]

function JobCard({ job, saved, onSave, onUnsave }: { job: Job; saved?: SavedJob; onSave: () => void; onUnsave: () => void }) {
  return (
    <article className="job">
      <div className="logo-tile" style={{ background: tone(job.company) }} aria-hidden="true">{job.company[0]}</div>
      <div>
        <div className="t">{job.title}</div>
        <div className="muted">{job.company}</div>
        <div className="row" style={{ gap: 6, marginTop: 6 }}>
          <span className="chip"><Icon name="pin" size={12} /> {job.location || job.country}</span>
          {job.workMode && <span className="chip">{MODES[job.workMode]}</span>}
          {job.level && <span className="chip">{LEVELS[job.level]}</span>}
          <span className={`chip ${job.postedOn >= new Date().toISOString().slice(0, 10) ? 'accent' : ''}`}><Icon name="clock" size={12} /> {postedLabel(job.postedOn)}</span>
          {job.sample && <span className="chip warn">sample</span>}
        </div>
      </div>
      <div className="acts">
        <button className={`btn sm ${saved ? '' : 'ghost'}`} onClick={saved ? onUnsave : onSave} aria-pressed={!!saved}>
          <Icon name="bookmark" size={14} /> {saved ? 'Saved' : 'Save'}
        </button>
        <a className="btn sm dark" href={job.url} target="_blank" rel="noopener noreferrer">
          Apply <Icon name="external" size={14} />
        </a>
      </div>
    </article>
  )
}

export default function Jobs() {
  const { user, ent, api, openAuth, prefs, toast, ready } = useApp()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [counts, setCounts] = useState<{ US: number; IN: number; total: number } | null>(null)
  const [saved, setSaved] = useState<SavedJob[]>([])
  const [country, setCountry] = useState<'all' | 'US' | 'IN'>(prefs.region)
  const [level, setLevel] = useState<string>('all')
  const [mode, setMode] = useState<string>('all')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'feed' | 'pipeline'>('feed')
  const [drop, setDrop] = useState(nextDrop())

  useEffect(() => {
    const t = setInterval(() => setDrop(nextDrop()), 30000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!api) return
    api.jobCounts().then(setCounts).catch(() => {})
  }, [api])
  useEffect(() => {
    if (!api || !user || !ent.active) return
    api.listJobs().then(setJobs).catch((e) => e instanceof ApiError || toast('Could not load jobs', 'err'))
    api.listSavedJobs().then(setSaved).catch(() => {})
  }, [api, user, ent.active, toast])

  const savedMap = useMemo(() => new Map(saved.map((s) => [s.job.id, s])), [saved])
  const shown = useMemo(() => (jobs ?? []).filter((j) => (country === 'all' || j.country === country) && (level === 'all' || j.level === level) && (mode === 'all' || j.workMode === mode) && (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q.toLowerCase()))), [jobs, country, level, mode, q])

  const save = async (job: Job, status: JobStatus = 'saved') => {
    await api!.saveJob(job, status)
    setSaved((s) => [{ job, status, updatedAt: new Date().toISOString() }, ...s.filter((x) => x.job.id !== job.id)])
  }
  const unsave = async (id: string) => {
    await api!.removeSavedJob(id)
    setSaved((s) => s.filter((x) => x.job.id !== id))
  }

  if (!ready) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>

  const header = (
    <div className="page-head">
      <div>
        <span className="chip accent"><Icon name="zap" size={12} /> Posted in the last 2 days only</span>
        <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', marginTop: 10 }}>Fresh PM jobs</h1>
        <p>New product roles from LinkedIn, refreshed every morning at 7:00 AM IST. Stale listings never make the list, so you apply while you can still be among the first.</p>
      </div>
    </div>
  )

  if (!user) return <div className="page">{header}<AuthPrompt title="Sign in to see this morning’s jobs" body="Create a free account, then unlock the daily drop." onSignIn={() => openAuth('Sign in to see fresh PM jobs.')} /></div>
  if (!ent.active)
    return (
      <div className="page">
        {header}
        <div className="stack">
          {counts && counts.total > 0 && (
            <div className="row">
              <span className="chip good">{counts.total} PM roles live right now</span>
              <span className="chip">🇺🇸 {counts.US} US</span>
              <span className="chip">🇮🇳 {counts.IN} India</span>
            </div>
          )}
          <div className="blur" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className="job" key={i}><div className="logo-tile" style={{ background: TONES[i] }}>★</div><div><div className="t">Senior Product Manager</div><div className="muted">Company name</div></div></div>
            ))}
          </div>
          <LockCard title="Unlock the morning job drop" body="See every PM role posted in the last two days across the US and India, filter by level and work mode, and track your applications." />
        </div>
      </div>
    )

  return (
    <div className="page">
      {header}
      <div className="drop-banner">
        <Icon name="clock" />
        <span><b>Next drop in {drop.h}h {drop.m}m.</b> Jobs older than 2 days are removed automatically.</span>
      </div>
      <div className="seg" style={{ marginBottom: 14 }} role="group" aria-label="View">
        <button aria-pressed={view === 'feed'} onClick={() => setView('feed')}>Feed ({shown.length})</button>
        <button aria-pressed={view === 'pipeline'} onClick={() => setView('pipeline')}>My pipeline ({saved.length})</button>
      </div>
      {view === 'feed' ? (
        <>
          <div className="filters">
            <div className="seg" role="group" aria-label="Country">
              {([['all', 'All'], ['IN', '🇮🇳 India'], ['US', '🇺🇸 US']] as const).map(([v, l]) => <button key={v} aria-pressed={country === v} onClick={() => setCountry(v)}>{l}</button>)}
            </div>
            <select className="select" style={{ width: 'auto' }} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level">
              <option value="all">Any level</option>
              {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Work mode">
              <option value="all">Any work mode</option>
              {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search title, company, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
          </div>
          {!jobs ? <div className="skeleton" style={{ height: 260 }} /> : shown.length === 0 ? (
            <div className="card soft">No jobs match these filters{jobs.length === 0 ? ' yet. The next drop lands at 7:00 AM IST.' : '.'}</div>
          ) : shown.map((j) => <JobCard key={j.id} job={j} saved={savedMap.get(j.id)} onSave={() => save(j)} onUnsave={() => unsave(j.id)} />)}
        </>
      ) : (
        <div className="pipeline-board">
          {STATUS.map((st) => (
            <div className="col" key={st.id}>
              <h4><span>{st.label}</span><span>{saved.filter((s) => s.status === st.id).length}</span></h4>
              {saved.filter((s) => s.status === st.id).map((s) => (
                <div className="mini-job" key={s.job.id}>
                  <b>{s.job.title}</b>
                  <span className="muted">{s.job.company}</span>
                  <select className="select" style={{ minHeight: 34, padding: '2px 6px' }} value={s.status} onChange={(e) => save(s.job, e.target.value as JobStatus)} aria-label={`Status for ${s.job.title}`}>
                    {[...STATUS, { id: 'rejected', label: 'Rejected' }].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <div className="row"><a className="link-btn" href={s.job.url} target="_blank" rel="noopener noreferrer">Open</a><button className="link-btn" onClick={() => unsave(s.job.id)}>Remove</button></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
