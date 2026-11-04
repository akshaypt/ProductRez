import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './state/app'
import { Shell } from './components/Shell'
import Landing from './pages/Landing'

const Score = lazy(() => import('./pages/Score'))
const Writer = lazy(() => import('./pages/Writer'))
const Jobs = lazy(() => import('./pages/Jobs'))
const Learn = lazy(() => import('./pages/Learn'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Account = lazy(() => import('./pages/Account'))

const Fallback = () => <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<Shell />}>
              <Route path="/score" element={<Score />} />
              <Route path="/writer" element={<Writer />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/account" element={<Account />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  )
}
