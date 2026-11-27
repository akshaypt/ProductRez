import { useEffect, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import '@fontsource-variable/inter'
import '../styles/gd.css'
import '../styles/gm.css'
import '../styles/g.css'
import { LandingDesktop } from '../components/g/LandingDesktop'
import { LandingMobile } from '../components/g/LandingMobile'
import { useMedia, useTheme } from '../lib/g/useLanding'
import { analysisStore } from '../lib/g/store'

function Page({ view }: { view: 'landing' | 'report' }) {
  const [theme, toggle] = useTheme()
  const mobile = useMedia('(max-width: 720px)')
  const analysis = useSyncExternalStore(analysisStore.subscribe, analysisStore.get)
  const go = useNavigate()
  // A report only exists in memory. After a refresh there is nothing to show, so go back to the start.
  useEffect(() => { if (view === 'report' && !analysis) go('/', { replace: true }) }, [view, analysis, go])
  useEffect(() => {
    document.title = view === 'report' ? 'Your PM resume report | ProductRez' : 'ProductRez | Built Exclusively for Product Managers'
    window.scrollTo(0, 0)
  }, [view])
  useEffect(() => {
    // The marketing pages own the whole viewport colour, so keep the browser chrome and overscroll in sync.
    const prev = document.body.style.background
    document.body.style.background = theme === 'dark' ? '#09090b' : '#fafaf9'
    return () => { document.body.style.background = prev }
  }, [theme])
  const cls = (mobile ? 'gm' : 'gd') + (view === 'report' ? ' is-report' : '')
  return (
    <div className={cls} data-theme={theme}>
      {mobile ? <LandingMobile theme={theme} toggleTheme={toggle} view={view} /> : <LandingDesktop theme={theme} toggleTheme={toggle} view={view} />}
    </div>
  )
}

export default function Landing() { return <Page view="landing" /> }
export function Report() { return <Page view="report" /> }
