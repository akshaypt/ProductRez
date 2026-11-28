import { useEffect, useRef } from 'react'
import type { ScanView } from '../../lib/g/scan'

/** The last few things the review found, newest at the bottom with a blinking cursor. */
export function AiLog({ view }: { view: ScanView }) {
  const last = view.shown.slice(-5)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.scrollTo({ top: 9999 }) }, [last.length])
  return (
    <div ref={box} className="ai-log" role="log" aria-live="polite" aria-label="What we are checking">
      {last.map((l, i) => <div key={`${l.stage}-${l.text}`} className={'ai-line' + (i === last.length - 1 ? ' ai-last' : '')}>{l.text}</div>)}
    </div>
  )
}
