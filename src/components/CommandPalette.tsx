import { useFocusTrap } from '../lib/useFocusTrap'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/app'
import { Icon, type IconName } from './Icon'
import { useInstall } from './InstallPrompt'

interface Cmd {
  id: string
  group: string
  label: string
  icon: IconName
  run: () => void
  hint?: string
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trap = useFocusTrap<HTMLDivElement>(open)
  const nav = useNavigate()
  const { user, prefs, setPrefs, api, openAuth, toast } = useApp()
  const { canInstall, install } = useInstall()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const cmds = useMemo<Cmd[]>(() => {
    const go = (to: string) => () => nav(to)
    const list: Cmd[] = [
      { id: 'score', group: 'Go to', label: 'Resume Score', icon: 'score', run: go('/score'), hint: 'free' },
      { id: 'writer', group: 'Go to', label: 'Resume Writer', icon: 'pen', run: go('/writer') },
      { id: 'jobs', group: 'Go to', label: 'Fresh Jobs', icon: 'briefcase', run: go('/jobs') },
      { id: 'learn', group: 'Go to', label: 'Learn', icon: 'book', run: go('/learn') },
      { id: 'pricing', group: 'Go to', label: 'Plans & pricing', icon: 'zap', run: go('/pricing') },
      { id: 'method', group: 'Go to', label: 'How scoring works', icon: 'info', run: go('/methodology') },
      { id: 'account', group: 'Go to', label: 'Account & settings', icon: 'user', run: go('/account') },
      { id: 'theme', group: 'Actions', label: `Theme: ${prefs.theme === 'dark' ? 'switch to light' : 'switch to dark'}`, icon: prefs.theme === 'dark' ? 'sun' : 'moon', run: () => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' }) },
    ]
    if (canInstall) list.push({ id: 'install', group: 'Actions', label: 'Install ProductRez', icon: 'download', run: install })
    if (user) list.push({ id: 'out', group: 'Actions', label: 'Sign out', icon: 'x', run: () => api?.signOut().then(() => toast('Signed out')) })
    else list.push({ id: 'in', group: 'Actions', label: 'Sign in', icon: 'user', run: () => openAuth() })
    return list
  }, [nav, prefs.theme, setPrefs, canInstall, install, user, api, toast, openAuth])

  const shown = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => input.current?.focus(), 30)
    }
  }, [open])
  useEffect(() => setSel(0), [q])
  if (!open) return null

  const run = (c?: Cmd) => {
    if (!c) return
    onClose()
    c.run()
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, shown.length - 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)))
    else if (e.key === 'Enter') run(shown[sel])
    else if (e.key === 'Escape') onClose()
  }
  let lastGroup = ''
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card cmdk" onKeyDown={onKey} ref={trap}>
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages and actions…" aria-label="Search commands" />
        <ul role="listbox">
          {shown.length === 0 && <li className="grp">No results</li>}
          {shown.map((c, i) => {
            const head = c.group !== lastGroup ? (lastGroup = c.group) : null
            return (
              <li key={c.id} className={i === sel ? 'sel' : ''} role="option" aria-selected={i === sel}>
                {head && <div className="grp">{head}</div>}
                <button onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
                  <Icon name={c.icon} size={18} />
                  {c.label}
                  {c.hint && <span className="chip good" style={{ marginLeft: 'auto' }}>{c.hint}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="foot">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> select</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  )
}
