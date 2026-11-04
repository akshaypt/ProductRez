import { AuthModal } from './AuthModal'
import { RzFooter, RzNav } from './mk/Sections'
import { useSmoothScroll } from '../lib/motion'

export const MkNav = RzNav
export const MkFooter = RzFooter

export function LegalPage({ children }: { children: React.ReactNode }) {
  useSmoothScroll(true)
  return (
    <div className="rz">
      <RzNav />
      <section className="rz-sec dark" style={{ borderTop: 0 }}>
        <div className="rz-frame"><main className="rz-pad prose" style={{ margin: '0 auto' }}>{children}</main></div>
      </section>
      <RzFooter />
      <AuthModal />
    </div>
  )
}
