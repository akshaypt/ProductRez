import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startPwa } from './lib/pwa'
import App from './App'
import './styles/app.css'
import './styles/mk.css'

startPwa()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
