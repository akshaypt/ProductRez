import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/app'
import { Icon } from '../components/Icon'
import { AuthModal } from '../components/AuthModal'
import { AppWindow } from '../components/mk/AppWindow'
import { Headline, LabelRow, Scrub, Donut, CountStat } from '../components/mk/primitives'
import { AtsStory, InAction } from '../components/mk/Story'
import { Bands, CtaBand, Faq, Pricing, RzFooter, RzNav, Templates, Topics } from '../components/mk/Sections'
import { Xray } from '../components/mk/Xray'
import { reducedMotion, useSmoothScroll } from '../lib/motion'

export default function Landing() {
  const { user, openAuth } = useApp()
  const nav = useNavigate()
  const [over, setOver] = useState(false)
  useSmoothScroll(true)
  const start = () => (user ? nav('/score') : openAuth('Create a free account. Your first resume score is on us.'))

  return (
    <div className={`rz ${reducedMotion() ? 'reduced' : ''}`}>
      <RzNav onHome />

      <main id="main">
      {/* hero */}
      <section className="rz-sec dark" style={{ borderTop: 0 }}>
        <div className="rz-glow" />
        <div className="rz-frame">
          <div className="rz-pad rz-hero" style={{ paddingBottom: '2.5rem' }}>
            <Headline as="h1" className="rz-h1" parts={[{ t: 'The resume workspace for' }, { t: 'product managers', mute: true }]} />
            <div className="hero-in">
              <p className="lead">Score your resume against how PM hiring managers actually screen. Rebuild it in ATS-safe LaTeX. Apply to roles posted in the last two days.</p>
              <div className="row" style={{ gap: '1.4rem', marginTop: '1.8rem' }}>
                <button className="btn lg" onClick={start} data-testid="hero-cta">Try for free <Icon name="arrow" size={16} /></button>
                <div className="rz-rate"><div><b>1 free score</b><br />No card required</div></div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: '1.6rem clamp(1rem, 4.5vw, 3.75rem)' }}>
            <div className={`rz-upload ${over ? 'over' : ''}`} role="button" tabIndex={0} onClick={start} onKeyDown={(e) => e.key === 'Enter' && start()} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); start() }}>
              <div className="ring" style={{ ['--p' as string]: 95, background: 'conic-gradient(#34d399 95%, #262626 0)' }}><span>95</span></div>
              <div className="txt"><u>Upload</u> or drop your resume to get started</div>
              <span className="btn">Score resume</span>
            </div>
          </div>
          <div className="rz-stage"><AppWindow /></div>
        </div>
      </section>

      {/* at a glance */}
      <section className="rz-sec dark">
        <div className="rz-frame">
          <LabelRow tone="teal">At a glance</LabelRow>
          <div style={{ padding: '2.5rem 0 5rem' }}>
            <div className="rz-stats">
              <Donut pct={100} center="48h" label="Maximum age of any job listing shown" />
              <CountStat value={65} label="Curated learning resources, links verified" />
              <CountStat value={8} label="PM competencies assessed in every resume" dots={8} />
            </div>
          </div>
        </div>
      </section>

      {/* principle */}
      <section className="rz-sec dark">
        <div className="rz-frame">
          <LabelRow>Our principle</LabelRow>
          <div className="rz-pad" style={{ paddingTop: '3rem' }}>
            <Scrub text="No tool can honestly promise an ATS pass rate. [[So we measure what is measurable:]] whether your resume parses cleanly, and whether it shows the impact, ownership and craft that PM hiring managers screen for." />
            <p style={{ marginTop: '2rem' }}><Link className="arrow-link" to="/methodology">Read exactly how scoring works <Icon name="arrow" size={14} /></Link></p>
          </div>
        </div>
      </section>

      {/* try it */}
      <section className="rz-sec dark">
        <div className="rz-frame">
          <LabelRow tone="teal">Try it now</LabelRow>
          <div className="rz-pad" style={{ paddingTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div>
              <Headline parts={[{ t: 'See what a hiring manager sees in' }, { t: 'one bullet', mute: true }]} />
              <p className="lead" style={{ marginTop: '1.4rem', maxWidth: '24em' }}>Resume bullets are won or lost on outcomes. Paste yours for an instant impact rating, with no sign-up.</p>
            </div>
            <Xray />
          </div>
        </div>
      </section>

      <InAction />
      <AtsStory />
      <Templates onStart={start} />
      <Topics />
      <Bands />
      <Pricing />
      <Faq />
      <CtaBand onStart={start} />
      </main>
      <RzFooter />
      <AuthModal />
    </div>
  )
}
