import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { PAID_FEATURES, PLANS, rupees } from '../data/plans'

export function LockCard({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className="card lock-card" data-testid="paywall">
      <div className="lock-ico">
        <Icon name="lock" size={28} />
      </div>
      <h2 style={{ fontSize: compact ? '1.5rem' : undefined }}>{title}</h2>
      <p className="muted" style={{ maxWidth: '52ch' }}>
        {body}
      </p>
      {!compact && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6, textAlign: 'left', fontSize: '0.95rem' }}>
          {PAID_FEATURES.slice(0, 4).map((f) => (
            <li key={f} style={{ display: 'flex', gap: 8 }}>
              <Icon name="check" size={18} style={{ color: 'var(--green)', flex: 'none', marginTop: 3 }} />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link className="btn lg" to="/pricing">
          Unlock everything from {rupees(PLANS[0].price)} <Icon name="arrow" size={18} />
        </Link>
      </div>
      <p className="faint" style={{ fontSize: '0.85rem' }}>
        Lifetime access is just {rupees(PLANS[2].price)}. One payment, no subscription.
      </p>
    </div>
  )
}

export function AuthPrompt({ onSignIn, title, body }: { onSignIn: () => void; title: string; body: string }) {
  return (
    <div className="card lock-card" style={{ background: 'var(--card)' }}>
      <div className="lock-ico" style={{ background: 'var(--lilac)' }}>
        <Icon name="user" size={28} />
      </div>
      <h2>{title}</h2>
      <p className="muted" style={{ maxWidth: '48ch' }}>
        {body}
      </p>
      <button className="btn lg" onClick={onSignIn}>
        Sign in free <Icon name="arrow" size={18} />
      </button>
    </div>
  )
}
