import { useEffect, useState } from 'react'
import { applyUpdate, dismissUpdate, onUpdate, updateReady } from '../lib/pwa'

/** Appears only when a newer version of the app has been downloaded. Never reloads the page on its own. */
export function UpdateBanner() {
  const [on, setOn] = useState(updateReady())
  useEffect(() => onUpdate(setOn), [])
  if (!on) return null
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'max(16px, env(safe-area-inset-bottom))', zIndex: 120, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: '#111827', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,.35)', fontSize: 14, maxWidth: 'calc(100vw - 24px)' }}>
      <span>A new version of ProductRez is ready.</span>
      <button type="button" onClick={applyUpdate} style={{ background: '#fc8019', color: '#fff', border: 0, borderRadius: 10, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
      <button type="button" onClick={dismissUpdate} aria-label="Dismiss" style={{ background: 'transparent', color: '#9ca3af', border: 0, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  )
}
