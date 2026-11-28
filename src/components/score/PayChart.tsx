import { alignAt, clusters, edgeOf, money, posOf, scaleFor, type Band, type Cur } from '../../lib/pay'

interface Props {
  band: Band
  /** The range this resume supports at the level shown. Null when the level is only being explored, where no such claim is made. */
  fit: { low: number; high: number } | null
  currency: Cur
  current: number | null
  expected: number | null
}

/**
 * The market pay range for the person's level, focus and company type as a horizontal ruler.
 * Above it, one small pill per value shows where the person is today and where they want to be. When the two would collide they
 * share a single pill ("₹35L → ₹40L"), so the chart never has two labels and two stems stacked on one spot. Below it are the median
 * and the range their resume supports. The range stretches (within limits) so a value stays on the chart; only a value far outside it is
 * pinned to the edge with an arrow. Everything is positioned by percentage, so it scales from a phone to a wide screen.
 */
export function PayChart({ band, fit, currency, current, expected }: Props) {
  const s = scaleFor(band, [current, expected].filter((v): v is number => v !== null))
  const at = (v: number) => posOf(v, s)
  const pc = current === null ? null : at(current)
  const pe = expected === null ? null : at(expected)
  const together = clusters(pc, pe)
  const ec = current === null ? null : edgeOf(current, s)
  const ee = expected === null ? null : edgeOf(expected, s)
  const aria = [`Market range ${money(currency, band.min)} to ${money(currency, band.max)}, median ${money(currency, band.median)}.`, fit ? `Your resume supports ${money(currency, fit.low)} to ${money(currency, fit.high)}.` : '', current !== null ? `You now: ${money(currency, current)}.` : '', expected !== null ? `You want: ${money(currency, expected)}.` : ''].filter(Boolean).join(' ')

  // Two dots on (nearly) the same spot are nudged apart so both can be seen, always toward the inside of the chart so neither is cut off at an edge.
  const nudge = (own: number | null, other: number | null, which: 'cur' | 'exp') => {
    if (own === null || other === null || Math.abs(own - other) >= 4) return 0
    const mid = (own + other) / 2
    if (mid > 85) return which === 'cur' ? -15 : 0
    if (mid < 15) return which === 'exp' ? 15 : 0
    return which === 'cur' ? -8 : 8
  }

  const pill = (key: string, pct: number, className: string, children: React.ReactNode, title?: string) => (
    <div key={key} className={`sd-flag ${className} ${alignAt(pct)}`} style={{ left: `${pct}%` }}>
      <div className="sd-flag-chip" title={title}>{children}</div>
      <span className="sd-flag-stem" />
    </div>
  )
  const arrow = (edge: 'below' | 'above' | null, where: 'before' | 'after') => (edge === 'below' && where === 'before' ? <i className="sd-arrow" aria-hidden="true">◂</i> : edge === 'above' && where === 'after' ? <i className="sd-arrow" aria-hidden="true">▸</i> : null)

  return (
    <div className="sd-pay" role="img" aria-label={aria}>
      <div className={'sd-pay-flags' + (current === null && expected === null ? ' empty' : '')}>
        {current === null && expected === null && <div className="sd-pay-hint" style={{ left: `${at(band.median)}%` }}>Add your pay to see where you land</div>}

        {together && pc !== null && pe !== null && current !== null && expected !== null &&
          pill('both', (pc + pe) / 2, 'both', (
            <>
              {arrow(ec === 'below' && ee === 'below' ? 'below' : null, 'before')}
              <i className="sd-dotm cur" /><b>{money(currency, current)}</b>
              <i className="sd-to" aria-hidden="true">→</i>
              <i className="sd-dotm exp" /><b>{money(currency, expected)}</b>
              {arrow(ec === 'above' && ee === 'above' ? 'above' : null, 'after')}
            </>
          ), `You now ${money(currency, current)}, you want ${money(currency, expected)}`)}

        {!together && current !== null && pc !== null &&
          pill('cur', pc, 'cur', <>{arrow(ec, 'before')}<small>You now</small><b>{money(currency, current)}</b>{arrow(ec, 'after')}</>, ec ? `${money(currency, current)} is outside the range shown` : undefined)}
        {!together && expected !== null && pe !== null &&
          pill('exp', pe, 'exp', <>{arrow(ee, 'before')}<small>You want</small><b>{money(currency, expected)}</b>{arrow(ee, 'after')}</>, ee ? `${money(currency, expected)} is outside the range shown` : undefined)}
      </div>

      <div className="sd-pay-track">
        <div className="sd-segs">
          <i className="seg off" style={{ left: 0, width: `${at(band.min)}%` }} />
          <i className="seg lo" style={{ left: `${at(band.min)}%`, width: `${at(band.p25) - at(band.min)}%` }} />
          <i className="seg core" style={{ left: `${at(band.p25)}%`, width: `${at(band.p75) - at(band.p25)}%` }} />
          <i className="seg lo" style={{ left: `${at(band.p75)}%`, width: `${at(band.max) - at(band.p75)}%` }} />
          <i className="seg off" style={{ left: `${at(band.max)}%`, width: `${100 - at(band.max)}%` }} />
        </div>
        <i className="sd-median" style={{ left: `${at(band.median)}%` }} />
        {pc !== null && <i className="sd-dot cur" style={{ left: `calc(${pc}% + ${nudge(pc, pe, 'cur')}px)` }} />}
        {pe !== null && <i className="sd-dot exp" style={{ left: `calc(${pe}% + ${nudge(pe, pc, 'exp')}px)` }} />}
      </div>

      <div className="sd-pay-axis">
        <span style={{ left: `${at(band.min)}%` }} className="start">{money(currency, band.min)}<small>low</small></span>
        <span style={{ left: `${at(band.median)}%` }} className="mid">{money(currency, band.median)}<small>median</small></span>
        <span style={{ left: `${at(band.max)}%` }} className="end">{money(currency, band.max)}<small>high</small></span>
      </div>

      {fit && (
        <div className="sd-pay-fit">
          <i style={{ left: `${at(fit.low)}%`, width: `${Math.max(2, at(fit.high) - at(fit.low))}%` }} />
          {/* Centred under the band, unless the band is near an edge: then the label starts or ends with it so it is never cut off. */}
          <span className={alignAt((at(fit.low) + at(fit.high)) / 2)} style={{ left: `${alignAt((at(fit.low) + at(fit.high)) / 2) === 'end' ? at(fit.high) : alignAt((at(fit.low) + at(fit.high)) / 2) === 'start' ? at(fit.low) : (at(fit.low) + at(fit.high)) / 2}%` }}>Fits your resume <b>{money(currency, fit.low)} to {money(currency, fit.high)}</b></span>
        </div>
      )}
    </div>
  )
}
