import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { skillLabel } from '@ats'
import { TRACKS } from '../lib/g/data'
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

const NEW_MS = 72 * 3600 * 1000
const isNew = (j: Job) => Date.now() - new Date(j.postedAt ?? j.postedOn).getTime() < NEW_MS
const money = (j: Job) => (j.salary ? (j.salary.currency === 'INR' ? `₹${j.salary.min}–${j.salary.max}L` : `$${j.salary.min}–${j.salary.max}k`) : null)

function MatchLine({ job }: { job: Job }) {
  if (!job.match) return null
  const { score, matched, missing } = job.match
  const total = matched.length + missing.length
  return (
    <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
      <span className={`chip ${score >= 70 ? 'good' : score >= 45 ? 'accent' : ''}`} title="Skills, focus, pay and freshness compared with your latest resume">{score}% match</span>
      {total > 0 && (
        <span className="faint" style={{ fontSize: '0.85rem' }}>
          {missing.length === 0 ? 'Your resume covers every skill listed.' : `You cover ${matched.length} of ${total} skills. Missing: ${missing.slice(0, 3).map(skillLabel).join(', ')}${missing.length > 3 ? '…' : ''}`}
        </span>
      )}
    </div>
  )
}

function JobCard({ job, saved, onSave, onUnsave, idx = 0 }: { idx?: number; job: Job; saved?: SavedJob; onSave: () => void; onUnsave: () => void }) {
  return (
    <article className="job" style={{ ['--i' as string]: Math.min(idx, 12) }}>
      <div className="logo-tile" style={{ background: tone(job.company) }} aria-hidden="true">{job.company[0]}</div>
      <div>
        <div className="t">{job.title}</div>
        <div className="muted">{job.company}</div>
        <div className="row" style={{ gap: 6, marginTop: 6 }}>
          <span className="chip"><Icon name="pin" size={12} /> {job.location || job.country}</span>
          {job.workMode && <span className="chip">{MODES[job.workMode]}</span>}
          {job.level && <span className="chip">{LEVELS[job.level]}</span>}
          <span className={`chip ${isNew(job) ? 'good' : ''}`}><Icon name="clock" size={12} /> {postedLabel(job.postedOn)}{isNew(job) ? ' · new' : ''}</span>
          {money(job) && <span className="chip">{money(job)}</span>}
          {job.sample && <span className="chip warn">sample</span>}
        </div>
        <MatchLine job={job} />
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
  const [country, setCountry] = useState<'all' | 'US' | 'IN' | 'REMOTE'>(prefs.region)
  const [track, setTrack] = useState<string>('all')
  const [sort, setSort] = useState<'match' | 'new'>('match')
  const [peek, setPeek] = useState<Job[]>([])
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
    if (!api || !user || ent.active) return
    api.peekMatches().then(setPeek).catch(() => {})
  }, [api, user, ent.active])
  useEffect(() => {
    if (!api || !user || !ent.active) return
    api.listJobs().then(setJobs).catch((e) => e instanceof ApiError || toast('Could not load jobs', 'err'))
    api.listSavedJobs().then(setSaved).catch(() => {})
  }, [api, user, ent.active, toast])

  const savedMap = useMemo(() => new Map(saved.map((s) => [s.job.id, s])), [saved])
  const hasMatch = (jobs ?? []).some((j) => j.match)
  const shown = useMemo(() => {
    const list = (jobs ?? []).filter((j) => (country === 'all' || (country === 'REMOTE' ? j.market === 'remote_global' : j.country === country)) && (level === 'all' || j.level === level) && (mode === 'all' || j.workMode === mode) && (track === 'all' || j.track === track) && (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q.toLowerCase())))
    const by = sort === 'match' && hasMatch ? (x: Job, y: Job) => (y.match?.score ?? -1) - (x.match?.score ?? -1) : (x: Job, y: Job) => new Date(y.postedAt ?? y.postedOn).getTime() - new Date(x.postedAt ?? x.postedOn).getTime()
    return [...list].sort(by)
  }, [jobs, country, level, mode, track, q, sort, hasMatch])
  const fresh = (jobs ?? []).filter(isNew).length

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
        <span className="chip accent"><Icon name="zap" size={12} /> Straight from company job boards</span>
        <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', marginTop: 10 }}>Fresh PM jobs</h1>
        <p>Product roles from companies' own career pages, collected twice a day and ranked by how well they match your resume. Anything older than two weeks is removed, so the list stays current.</p>
      </div>
    </div>
  )

  if (!user) return <div className="page">{header}<AuthPrompt title="Sign in to see this morning’s jobs" body="Sign in, score your resume, and we rank every role by how well it fits you." onSignIn={() => openAuth('Sign in to see fresh PM jobs.')} /></div>
  if (!ent.active)
    return (
      <div className="page">
        {header}
        <div className="stack">
          {counts && counts.total > 0 && (
            <div className="row">
              <span className="chip good">{counts.total} PM roles live right now</span>
              <span className="chip">{counts.US} United States</span>
              <span className="chip">{counts.IN} India</span>
            </div>
          )}
          {peek.length > 0 ? (
            <div className="stack" style={{ gap: 10 }}>
              <h3 style={{ fontSize: '1.2rem' }}>Your top matches right now</h3>
              <div className="rows">
                {peek.map((j) => (
                  <article className="job" key={j.id}>
                    <div className="logo-tile" style={{ background: tone(j.company) }} aria-hidden="true">{j.company[0]}</div>
                    <div>
                      <div className="t">{j.title}</div>
                      <div className="muted">{j.company}</div>
                      <MatchLine job={j} />
                    </div>
                    <div className="acts"><span className="chip"><Icon name="lock" size={12} /> Unlock to apply</span></div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="blur" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div className="job" key={i}><div className="logo-tile" style={{ background: TONES[i] }}>★</div><div><div className="t">Senior Product Manager</div><div className="muted">Company name</div></div></div>
              ))}
            </div>
          )}
          <LockCard title="Unlock your matched jobs" body="See every fresh PM role from company job boards across the US, India and remote, ranked by how well it matches your resume, with apply links and a pipeline to track applications." />
        </div>
      </div>
    )

  return (
    <div className="page">
      {header}
      <div className="drop-banner">
        <Icon name="clock" />
        <span><b>Next update in {drop.h}h {drop.m}m.</b> {fresh > 0 ? `${fresh} role${fresh > 1 ? 's' : ''} posted in the last 3 days. ` : ''}Roles older than 2 weeks are removed automatically.</span>
      </div>
      {jobs && !hasMatch && (
        <div className="callout" style={{ marginBottom: 14 }}>
          <Icon name="score" size={18} /> <span>Score your resume to see how well each role matches you and what you are missing.</span>
          <Link className="btn sm" to="/score">Score my resume</Link>
        </div>
      )}
      <div className="seg" style={{ marginBottom: 14 }} role="group" aria-label="View">
        <button aria-pressed={view === 'feed'} onClick={() => setView('feed')}>Feed ({shown.length})</button>
        <button aria-pressed={view === 'pipeline'} onClick={() => setView('pipeline')}>My pipeline ({saved.length})</button>
      </div>
      {view === 'feed' ? (
        <>
          <div className="filters">
            <div className="seg" role="group" aria-label="Country">
              {([['all', 'All'], ['IN', 'India'], ['US', 'United States'], ['REMOTE', 'Remote']] as const).map(([v, l]) => <button key={v} aria-pressed={country === v} onClick={() => setCountry(v)}>{l}</button>)}
            </div>
            <select className="select" style={{ width: 'auto' }} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level">
              <option value="all">Any level</option>
              {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={track} onChange={(e) => setTrack(e.target.value)} aria-label="PM focus">
              <option value="all">Any focus</option>
              {TRACKS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
            {hasMatch && (
              <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as 'match' | 'new')} aria-label="Sort">
                <option value="match">Best match</option>
                <option value="new">Newest</option>
              </select>
            )}
            <select className="select" style={{ width: 'auto' }} value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Work mode">
              <option value="all">Any work mode</option>
              {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search title, company, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
          </div>
          {!jobs ? <div className="skeleton" style={{ height: 260 }} /> : shown.length === 0 ? (
            jobs.length === 0 ? (
              <div className="card stack" style={{ textAlign: 'center', justifyItems: 'center', padding: '2.2rem 1.2rem' }}>
                <Icon name="clock" size={28} />
                <h3>The first batch is on its way</h3>
                <p className="muted" style={{ maxWidth: '34em' }}>New PM roles are collected from company job boards twice a day for the US, India and remote. Anything older than two weeks is removed automatically.</p>
                <p className="faint" style={{ fontSize: '0.9rem' }}>Meanwhile, tighten your resume in the Writer or pick a path in Learn.</p>
              </div>
            ) : <div className="card soft">No jobs match these filters. Try clearing a filter or the search box.</div>
          ) : <div className="rows">{shown.map((j, i) => <JobCard key={j.id} idx={i} job={j} saved={savedMap.get(j.id)} onSave={() => save(j)} onUnsave={() => unsave(j.id)} />)}</div>}
        </>
      ) : (
        <div className="pipeline-board">
          {STATUS.map((st) => (
            <div className="col" key={st.id}>
              <h4><span>{st.label}</span><span>{saved.filter((s) => s.status === st.id).length}</span></h4>
              {saved.filter((s) => s.status === st.id).length === 0 && <p className="faint" style={{ fontSize: '0.85rem', padding: '0.4rem 0.2rem' }}>{st.id === 'saved' ? 'Save roles from the feed to track them here.' : 'Move a job here from its status menu.'}</p>}
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
