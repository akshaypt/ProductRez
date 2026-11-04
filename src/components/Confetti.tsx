import { useEffect, useState } from 'react'

const COLORS = ['#ff5b35', '#ffc93c', '#3d5afe', '#12a36b', '#d4c8ff']

export function Confetti({ run }: { run: number }) {
  const [bits, setBits] = useState<{ id: number; left: number; delay: number; dur: number; color: string; w: number }[]>([])
  useEffect(() => {
    if (!run) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setBits(Array.from({ length: 70 }, (_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 0.5, dur: 1.8 + Math.random() * 1.6, color: COLORS[i % COLORS.length], w: 6 + Math.random() * 8 })))
    const t = setTimeout(() => setBits([]), 4200)
    return () => clearTimeout(t)
  }, [run])
  if (!bits.length) return null
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b) => (
        <i key={b.id} style={{ left: `${b.left}%`, background: b.color, width: b.w, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  )
}
