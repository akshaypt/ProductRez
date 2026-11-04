import type { ResumeData } from '@scoring'
import { uid } from './util'

export const emptyResume = (): ResumeData => ({
  basics: { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '' },
  summary: '',
  experience: [{ id: uid(), company: '', title: '', location: '', start: '', end: '', bullets: ['', '', ''] }],
  projects: [],
  education: [{ id: uid(), school: '', degree: '', location: '', start: '', end: '', details: '' }],
  skills: [{ id: uid(), label: 'Product', items: '' }],
  extras: [],
})

export const sampleResume = (): ResumeData => ({
  basics: { name: 'Alex Morgan', headline: 'Senior Product Manager · Payments & AI', email: 'alex.morgan@example.com', phone: '+1 (415) 555-0142', location: 'San Francisco, CA', linkedin: 'linkedin.com/in/alexmorgan', website: '' },
  summary: 'Product manager who has taken two B2B payments products from 0 to $40M ARR. Strong in experimentation, pricing and LLM-powered automation.',
  experience: [
    {
      id: uid(), company: 'Northwind Pay', title: 'Senior Product Manager', location: 'San Francisco, CA', start: 'Jan 2021', end: 'Present',
      bullets: [
        'Owned the merchant onboarding roadmap across 3 squads; redesigned KYC after 40 customer interviews, lifting activation from 38% to 61% in two quarters',
        'Launched usage-based pricing for 12,000 SMB accounts, adding $6.2M ARR and cutting churn from 5.1% to 3.8% via a 6-week A/B test',
        'Built an LLM-assisted support copilot with Engineering and Support that deflected 27% of tickets and saved $1.1M annually',
        'Defined the multi-year platform strategy with the CTO and CFO; prioritised API investment over a custom dashboard',
      ],
    },
    {
      id: uid(), company: 'Halcyon Labs', title: 'Product Manager', location: 'Seattle, WA', start: 'Mar 2018', end: 'Dec 2020',
      bullets: ['Shipped a self-serve billing portal for 8,000 customers, reducing support tickets 35% in 90 days', 'Ran 14 checkout experiments with SQL and Amplitude, improving conversion 12% (3.1% to 3.5%)'],
    },
  ],
  projects: [],
  education: [{ id: uid(), school: 'University of California, Berkeley', degree: 'B.S. Computer Science', location: 'Berkeley, CA', start: '2014', end: '2018', details: '' }],
  skills: [
    { id: uid(), label: 'Product', items: 'Roadmapping, Experimentation, Pricing, Customer discovery' },
    { id: uid(), label: 'Tools', items: 'SQL, Amplitude, Looker, Jira, Figma' },
  ],
  extras: [],
})

/** Count of unresolved [placeholders] left by the coach scaffolds. */
export function placeholderCount(d: ResumeData): number {
  const all = [d.summary, ...d.experience.flatMap((x) => x.bullets), ...d.projects.flatMap((p) => p.bullets), ...d.extras.flatMap((e) => e.items)]
  return all.reduce((n, s) => n + ((s ?? '').match(/\[[^\]]{1,30}\]/g)?.length ?? 0), 0)
}

export function withIds(d: ResumeData): ResumeData {
  const s = structuredClone(d)
  s.experience.forEach((x) => (x.id ||= uid()))
  s.projects.forEach((x) => (x.id ||= uid()))
  s.education.forEach((x) => (x.id ||= uid()))
  s.skills.forEach((x) => (x.id ||= uid()))
  s.extras.forEach((x) => (x.id ||= uid()))
  return s
}
