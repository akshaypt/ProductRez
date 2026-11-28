import type { PlanId } from '../lib/types'

export interface Plan {
  id: PlanId
  name: string
  price: number
  per: string
  blurb: string
  perMonth?: string
  badge?: string
}

export const PLANS: Plan[] = [
  { id: 'month', name: '1 month', price: 299, per: 'one-time, no auto-renew', blurb: 'Sprint through a job hunt.' },
  { id: 'six_months', name: '6 months', price: 599, per: 'one-time, no auto-renew', blurb: 'A full search cycle, interviews included.', perMonth: '≈ ₹100/month', badge: 'Save 67%' },
  { id: 'lifetime', name: 'Lifetime', price: 999, per: 'pay once, use forever', blurb: 'Every future job search, every new feature.', badge: 'Best value' },
]

export const PAID_FEATURES = [
  'PM Resume Writer with 6 ATS-safe LaTeX templates',
  'Fix what the score finds: bullet-by-bullet rewrites in the Writer',
  'Fresh PM jobs from company job boards, ranked by how well they match your resume',
  'Curated videos, articles, books & learning paths',
  'Bullet coach with AI rewrites that never invent metrics',
  'Job pipeline tracker: saved → applied → offer',
]

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
