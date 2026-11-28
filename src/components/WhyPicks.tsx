import type { Picks, Why } from '../lib/g/analyze'

/**
 * Says what each pre-filled pick was read from, so the person can trust it or change it. A pick they have changed since is left out,
 * because the explanation would no longer be about what is on screen.
 */
export function WhyPicks({ why, auto, picks }: { why: Why | null; auto: Picks | null; picks: Picks }) {
  if (!why || !auto) return null
  const rows = ([['level', 'Level', why.level], ['track', 'Focus', why.track], ['company', 'Company type', why.company]] as const).filter(([id]) => picks[id] !== null && picks[id] === auto[id])
  if (rows.length === 0) return null
  return (
    <details className="why-picks">
      <summary>Why these picks?</summary>
      <dl>
        {rows.map(([id, label, text]) => (
          <div key={id}><dt>{label}</dt><dd>{text}</dd></div>
        ))}
      </dl>
    </details>
  )
}
