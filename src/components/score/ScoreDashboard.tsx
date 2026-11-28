import { useMemo, useState, type ReactNode } from 'react'
import type { ScoreReport } from '@ats'
import type { Api, LatestScan } from '../../lib/types'
import { Icon } from '../Icon'
import { Radar, Ring, tone, useCount } from './charts'
import { PayCard } from './PayCard'
import { BulletsPanel, FixList, SkillsPanel, StandingPanel } from './Panels'
import { ordinal, splitLabel } from '../../lib/pay'
import { isWeakBullet } from '../../lib/bullets'
import { renderScoreCard } from '../../lib/shareCard'
import { toLegacy } from '../../lib/v2'
import { useApp } from '../../state/app'

type Tab = 'fix' | 'bullets' | 'skills' | 'standing' | 'match'

const GRADE: Record<ScoreReport['grade'], { l: string; c: string }> = {
  ship: { l: 'Ready to ship', c: 'good' },
  beta: { l: 'Nearly there', c: 'info' },
  alpha: { l: 'Needs iteration', c: 'warn' },
  prototype: { l: 'Rebuild the core', c: 'bad' },
}

function Tile({ value, display, label, hint, children }: { value: number; display: ReactNode; label: string; hint: string; children?: ReactNode }) {
  return (
    <div className="sd-tile-stat">
      <Ring value={value} size={58} stroke={6} label={`${label}: ${value}%`}>{children}</Ring>
      <div><b>{display}</b><span>{label}</span><small>{hint}</small></div>
    </div>
  )
}

/** The signed-in score page: the score, what the market pays, the numbers behind them, then the detail in tabs. */
export function ScoreDashboard({ report, scan, api, signedIn, onFix, fixLabel, onUpload }: { report: ScoreReport; scan: LatestScan; api: Api | null; signedIn: boolean; onFix: () => void; fixLabel: string; onUpload: () => void }) {
  const [tab, setTab] = useState<Tab>('fix')
  const { toast } = useApp()
  // A picture of the scores only: no name, no resume text.
  const share = async () => {
    try {
      const blob = await renderScoreCard(toLegacy(report))
      const file = new File([blob], 'productrez-score.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My PM resume score: ${report.overall}/100` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'productrez-score.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        toast('Score card saved. It shows scores only: no name, no resume text.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Could not create the card', 'err')
    }
  }
  const n = useCount(report.overall)
  // Reports saved before the PM-fit flag existed: a background other than a practising PM means a resume from outside product.
  const isPm = report.contextUsed.isPmResume ?? report.contextUsed.background === 'practicing_pm'
  const g = isPm ? GRADE[report.grade] : { l: 'Not a PM resume yet', c: 'warn' }
  const potential = Math.min(100 - report.overall, report.findings.reduce((s, f) => s + f.gain, 0))
  const lift = potential >= 1 ? Math.min(100, Math.round(report.overall + potential)) : null
  const st = report.stats
  const proven = report.competencies.filter((c) => c.proven).length
  const ats = report.dimensions.find((d) => d.id === 'ats_hygiene')?.score ?? 0
  const toFix = useMemo(() => report.bullets.filter(isWeakBullet).length, [report.bullets])
  const when = new Date(scan.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const meta = [scan.picks.level, scan.picks.track, scan.picks.company].filter(Boolean) as string[]
  const km = report.keywordMatch

  const tabs: [Tab, string, number | null][] = [
    ['fix', 'Fix list', report.findings.length],
    ['bullets', 'Bullets', toFix || null],
    ['skills', 'Skills', null],
    ['standing', 'Standing & career', null],
    ...(km ? [['match', `Job match ${km.percent}%`, null] as [Tab, string, number | null]] : []),
  ]

  return (
    <div className="sd" data-testid="report">
      <header className="sd-head">
        <div>
          <h1>PM Resume Score</h1>
          <div className="sd-meta">
            <span className="sd-chip file" title={scan.fileName}><Icon name="file" size={14} /> <span>{scan.fileName}</span></span>
            {meta.map((m) => <span key={m} className="sd-chip">{m}</span>)}
            <span className="sd-when">Saved {when}</span>
          </div>
        </div>
        <div className="sd-actions">
          <button type="button" className="btn ghost" onClick={share} aria-label="Share your score card" title="Share a card with your scores only"><Icon name="share" size={17} /> Share</button>
          <button type="button" className="btn ghost" onClick={onUpload}><Icon name="upload" size={17} /> New resume</button>
          <button type="button" className="btn" onClick={onFix}><Icon name="pen" size={17} /> {fixLabel}</button>
        </div>
      </header>

      <div className="sd-hero">
        <section className="sd-card sd-scorecard" aria-label="Your score">
          <div className="sd-score-top">
            <Ring value={report.overall} ghost={potential} size={176} stroke={14} label={`Overall score ${report.overall} out of 100`}>
              <div className="sd-score-n"><b>{n}</b><small>/ 100</small></div>
            </Ring>
            <div className="sd-score-txt">
              <span className={`sd-pill ${g.c} big`}>{g.l}</span>
              <p>{report.headline}</p>
              {lift ? <span className="sd-lift"><Icon name="up" size={14} strokeWidth={3} style={{ marginTop: 2, flex: 'none' }} /> <span>The fixes below could take this to about <b>{lift}</b></span></span> : <span className="sd-lift ok"><Icon name="check" size={14} strokeWidth={3} /> Nothing big left to fix</span>}
            </div>
          </div>
          <Radar dims={report.dimensions} />
        </section>

        <PayCard report={report} api={api} signedIn={signedIn} />
      </div>

      <div className="sd-stats">
        <Tile value={st.bullets ? (st.bulletsWithMetrics / st.bullets) * 100 : 0} display={`${st.bulletsWithMetrics}/${st.bullets}`} label="Bullets with a number" hint="Aim for about half"><Icon name="target" size={16} /></Tile>
        <Tile value={(proven / Math.max(1, report.competencies.length)) * 100} display={`${proven}/${report.competencies.length}`} label="PM skills proven" hint="Shown by results"><Icon name="score" size={16} /></Tile>
        <Tile value={report.marketStanding.percentile} display={ordinal(report.marketStanding.percentile)} label="Percentile" hint={isPm ? splitLabel(report.marketStanding.tierLabel)[0] : 'Against PM applicants'}><Icon name="up" size={16} strokeWidth={3} /></Tile>
        <Tile value={ats} display={ats >= 85 ? 'Clean' : ats >= 65 ? 'Mostly clean' : 'Check layout'} label="ATS read" hint={`${ats} of 100`}><Icon name="scan" size={16} /></Tile>
      </div>

      <div className="sd-tabs" role="tablist" aria-label="Report sections">
        {tabs.map(([k, l, c]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}{c ? <span className="sd-count">{c}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="sd-panel">
        {tab === 'fix' && <FixList findings={report.findings} />}
        {tab === 'bullets' && <BulletsPanel bullets={report.bullets} />}
        {tab === 'skills' && <SkillsPanel report={report} />}
        {tab === 'standing' && <StandingPanel report={report} />}
        {tab === 'match' && km && (
          <div className="sd-match">
            <div className="sd-sec-h"><h3>Keywords from the job description</h3><span>Only add what is true, inside real bullets.</span></div>
            <div className="sd-kw">
              {[...km.matchedInBullets, ...km.matchedSkillsOnly].map((w) => <span key={w} className="sd-pill good">{w}</span>)}
              {km.missing.map((w) => <span key={w} className="sd-pill bad">{w}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { tone }
