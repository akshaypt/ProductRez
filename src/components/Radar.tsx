import { useEffect, useState } from 'react'
import type { Dimension } from '@scoring'

const SHORT: Record<string, string> = { impact: 'Impact', ownership: 'Ownership', craft: 'Craft', writing: 'Clarity', ats: 'ATS', match: 'Job fit' }

/** Interactive radar of the score dimensions. Hovering a point highlights its row in the list. */
export function Radar({ dims, hot, onHot }: { dims: Dimension[]; hot: string | null; onHot: (id: string | null) => void }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80)
    return () => clearTimeout(t)
  }, [])
  const n = dims.length
  const R = 70
  const C = 110
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [C + Math.cos(a) * R * v, C + Math.sin(a) * R * v] as const
  }
  const poly = (v: (i: number) => number) => dims.map((_, i) => pt(i, v(i)).join(',')).join(' ')
  return (
    <svg className="radar" viewBox="0 0 220 220" role="img" aria-label="Score by dimension">
      {[0.33, 0.66, 1].map((r) => <polygon key={r} className="grid" points={poly(() => r)} />)}
      {dims.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} className="grid" x1={C} y1={C} x2={x} y2={y} /> })}
      <polygon className="poly" points={poly((i) => (on ? dims[i].score / 100 : 0.02))} />
      {dims.map((d, i) => {
        const [x, y] = pt(i, on ? d.score / 100 : 0.02)
        const [lx, ly] = pt(i, 1.2)
        return (
          <g key={d.id} onMouseEnter={() => onHot(d.id)} onMouseLeave={() => onHot(null)}>
            <circle className={`pt ${hot === d.id ? 'hot' : ''}`} cx={x} cy={y} r={4} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">{SHORT[d.id]}</text>
          </g>
        )
      })}
    </svg>
  )
}
