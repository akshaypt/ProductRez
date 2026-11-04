export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function postedLabel(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (isoDate >= today) return 'Today'
  if (isoDate === y) return 'Yesterday'
  return isoDate
}

export function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Hours + minutes until the next 01:30 UTC (07:00 AM IST) job drop. */
export function nextDrop(now = new Date()): { h: number; m: number } {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1, 30))
  if (t <= now) t.setUTCDate(t.getUTCDate() + 1)
  const mins = Math.round((t.getTime() - now.getTime()) / 60000)
  return { h: Math.floor(mins / 60), m: mins % 60 }
}

export function download(filename: string, content: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume'

export function guessPaper(): 'a4' | 'letter' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (/^Asia\/(Kolkata|Calcutta)$/.test(tz)) return 'a4'
    if (/^(America|US)\//.test(tz)) return 'letter'
    return /^(Europe|Asia|Australia|Africa)\//.test(tz) ? 'a4' : 'letter'
  } catch {
    return 'letter'
  }
}

export function guessRegion(): 'US' | 'IN' {
  try {
    return /Asia\/(Kolkata|Calcutta)/.test(Intl.DateTimeFormat().resolvedOptions().timeZone) ? 'IN' : 'US'
  } catch {
    return 'US'
  }
}

export function safeStorage() {
  return {
    get<T>(k: string, fallback: T): T {
      try {
        const v = localStorage.getItem(k)
        return v ? (JSON.parse(v) as T) : fallback
      } catch {
        return fallback
      }
    },
    set(k: string, v: unknown) {
      try {
        localStorage.setItem(k, JSON.stringify(v))
      } catch {
        /* ignore */
      }
    },
  }
}
export const store = safeStorage()
