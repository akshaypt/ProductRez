import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PAID_FEATURES, PLANS, rupees } from '../data/plans'
import { Icon } from '../components/Icon'
import { useApp } from '../state/app'
import { ApiError, type PlanId } from '../lib/types'

export function PriceCards({ onChoose, busy }: { onChoose: (id: PlanId) => void; busy: PlanId | null }) {
  return (
    <div className="price-grid">
      {PLANS.map((p) => (
        <div key={p.id} className={`card price ${p.id === 'lifetime' ? 'best' : ''}`}>
          {p.badge && <span className="chip accent tag">{p.badge}</span>}
          <h3>{p.name}</h3>
          <div><span className="amt">{rupees(p.price)}</span></div>
          <p className="faint" style={{ fontSize: '0.85rem', marginTop: -6 }}>{p.per}{p.perMonth ? ` · ${p.perMonth}` : ''}</p>
          <p className="muted">{p.blurb}</p>
          <ul>{PAID_FEATURES.map((f) => <li key={f}><Icon name="check" size={16} strokeWidth={3} />{f}</li>)}</ul>
          <div style={{ flex: 1 }} />
          <button className={`btn lg block ${p.id === 'lifetime' ? '' : 'dark'}`} onClick={() => onChoose(p.id)} disabled={busy !== null} data-testid={`buy-${p.id}`}>
            {busy === p.id ? 'Opening checkout…' : `Get ${p.name}`}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function Pricing() {
  const { user, ent, api, openAuth, refresh, toast } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState<PlanId | null>(null)

  const choose = async (id: PlanId) => {
    if (!api) return
    if (!user) return openAuth('Create your account first, then pick a plan. Your first resume score is free.')
    setBusy(id)
    try {
      await api.startCheckout(id)
      await refresh()
      toast('Payment confirmed. Everything is unlocked.')
      setTimeout(() => nav('/writer'), 1600)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'cancelled') toast('Checkout closed. No charge was made.')
      else if (e instanceof ApiError && e.code === 'payments_not_configured') toast('Payments aren’t switched on yet. Please check back soon.', 'err')
      else toast(e instanceof Error ? e.message : 'Payment failed', 'err')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head" style={{ textAlign: 'center', justifyContent: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.4rem)' }}>One price. <span className="hl">Zero subscriptions.</span></h1>
          <p style={{ margin: '10px auto 0' }}>Resume scoring is free. Pay only when you want the Writer, daily jobs and the learning library.{ent.active && ' You already have access, but you can extend your plan.'}</p>
        </div>
      </div>
      <PriceCards onChoose={choose} busy={busy} />
      <div className="card soft" style={{ marginTop: 24 }}>
        <b>Payments</b>
        <p className="muted" style={{ marginTop: 4 }}>Secure checkout by Razorpay: UPI, cards, netbanking and wallets. Prices are in Indian rupees. Plans are one-time purchases and never auto-renew; buying again while active adds time.</p>
      </div>
    </div>
  )
}
