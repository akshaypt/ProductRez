import { alignAt, edgeOf, levels, money, posOf, scaleFor, type Band, type Cur } from '../../lib/pay'

interface Props {
  band: Band
  fit: { low: number; high: number }
  currency: Cur
  current: number | null
  expected: number | null
}

/**
 * The market pay range for the person's level, focus and company type as a horizontal ruler.
 * Above it, small flags show where the person is today and where they want to be; below it, the median and the range their resume
 * supports. The range stretches (within limits) so a flag stays on the chart; only a value far outside it is pinned to the edge with an arrow.
 * Everything is positioned by percentage, so it scales from a phone to a wide screen.
 */
export function PayChart({ band, fit, currency, current, expected }: Props) {
  const s = scaleFor(band, [current, expected].filter((v): v is number => v !== null))
  const at = (v: number) => posOf(v, s)
  const [lc, le] = levels(current === null ? null : at(current), expected === null ? null : at(expected))
  const pins = [
    current !== null && { key: 'cur', label: 'You now', v: current, level: lc, cls: 'cur' },
    expected !== null && { key: 'exp', label: 'You want', v: expected, level: le, cls: 'exp' },
  ].filter(Boolean) as { key: string; label: string; v: number; level: 0 | 1; cls: string }[]
  const aria = [`Market range ${money(currency, band.min)} to ${money(currency, band.max)}, median ${money(currency, band.median)}.`, `Your resume supports ${money(currency, fit.low)} to ${money(currency, fit.high)}.`, current !== null ? `You now: ${money(currency, current)}.` : '', expected !== null ? `You want: ${money(currency, expected)}.` : ''].filter(Boolean).join(' ')
  return (
    <div className="sd-pay" role="img" aria-label={aria}>
      <div className={'sd-pay-flags' + (pins.length === 0 ? ' empty' : lc === 1 || le === 1 ? ' two' : '')}>
        {pins.length === 0 && <div className="sd-pay-hint" style={{ left: `${at(band.median)}%` }}>Add your pay to see where you land</div>}
        {pins.map((p) => {
          const pct = at(p.v)
          const edge = edgeOf(p.v, s)
          return (
            <div key={p.key} className={`sd-flag ${p.cls} ${alignAt(pct)} l${p.level}`} style={{ left: `${pct}%` }}>
              <div className="sd-flag-chip" title={edge ? `${money(currency, p.v)} is outside the range shown` : undefined}>
                {edge === 'below' && <i className="sd-arrow" aria-hidden="true">◂</i>}
                <small>{p.label}</small><b>{money(currency, p.v)}</b>
                {edge === 'above' && <i className="sd-arrow" aria-hidden="true">▸</i>}
              </div>
              <span className="sd-flag-stem" />
            </div>
          )
        })}
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
        {pins.map((p) => <i key={p.key} className={`sd-dot ${p.cls}`} style={{ left: `${at(p.v)}%` }} />)}
      </div>

      <div className="sd-pay-axis">
        <span style={{ left: `${at(band.min)}%` }} className="start">{money(currency, band.min)}<small>low</small></span>
        <span style={{ left: `${at(band.median)}%` }} className="mid">{money(currency, band.median)}<small>median</small></span>
        <span style={{ left: `${at(band.max)}%` }} className="end">{money(currency, band.max)}<small>high</small></span>
      </div>

      <div className="sd-pay-fit">
        <i style={{ left: `${at(fit.low)}%`, width: `${Math.max(2, at(fit.high) - at(fit.low))}%` }} />
        {/* Centred under the band, unless the band is near an edge: then the label starts or ends with it so it is never cut off. */}
        <span className={alignAt((at(fit.low) + at(fit.high)) / 2)} style={{ left: `${alignAt((at(fit.low) + at(fit.high)) / 2) === 'end' ? at(fit.high) : alignAt((at(fit.low) + at(fit.high)) / 2) === 'start' ? at(fit.low) : (at(fit.low) + at(fit.high)) / 2}%` }}>Fits your resume <b>{money(currency, fit.low)} to {money(currency, fit.high)}</b></span>
      </div>
    </div>
  )
}
