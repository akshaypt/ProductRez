import type { Job } from '../types'

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)

const ROWS: Omit<Job, 'id' | 'postedOn' | 'url' | 'sample'>[] = [
  { title: 'Senior Product Manager, Payments', company: 'Lumen Pay', location: 'San Francisco, CA', country: 'US', workMode: 'hybrid', level: 'senior' },
  { title: 'Product Manager, Growth', company: 'Kite Commerce', location: 'Remote, United States', country: 'US', workMode: 'remote', level: 'pm' },
  { title: 'Associate Product Manager', company: 'Northwind Labs', location: 'Seattle, WA', country: 'US', workMode: 'onsite', level: 'apm' },
  { title: 'Group Product Manager, Platform', company: 'Halcyon Cloud', location: 'New York, NY', country: 'US', workMode: 'hybrid', level: 'lead' },
  { title: 'Product Manager, AI Assistants', company: 'Tandem AI', location: 'Remote, United States', country: 'US', workMode: 'remote', level: 'pm' },
  { title: 'Senior Product Manager, LLM Platform', company: 'Orbit Systems', location: 'Austin, TX', country: 'US', workMode: 'hybrid', level: 'senior' },
  { title: 'Product Manager, Health Records', company: 'Orbit Health', location: 'Boston, MA', country: 'US', workMode: 'hybrid', level: 'pm' },
  { title: 'Associate Product Manager, Consumer', company: 'Paperplane', location: 'Chicago, IL', country: 'US', workMode: 'onsite', level: 'apm' },
  { title: 'Principal Product Manager, Data', company: 'Meridian Data', location: 'Remote, United States', country: 'US', workMode: 'remote', level: 'lead' },
  { title: 'Product Manager, Marketplace', company: 'Basil Foods', location: 'Los Angeles, CA', country: 'US', workMode: 'hybrid', level: 'pm' },
  { title: 'Product Manager, Developer Tools', company: 'Quill Labs', location: 'Denver, CO', country: 'US', workMode: 'remote', level: 'pm' },
  { title: 'Senior Product Manager, Security', company: 'Ironbark', location: 'Atlanta, GA', country: 'US', workMode: 'hybrid', level: 'senior' },
  { title: 'Product Manager, Onboarding', company: 'Lumen Pay', location: 'Remote, United States', country: 'US', workMode: 'remote', level: 'pm' },
  { title: 'Product Manager, Fintech Lending', company: 'Kiln Finance', location: 'Bengaluru, Karnataka, India', country: 'IN', workMode: 'hybrid', level: 'pm' },
  { title: 'Associate Product Manager', company: 'Chaiwala Commerce', location: 'Gurugram, Haryana, India', country: 'IN', workMode: 'onsite', level: 'apm' },
  { title: 'Senior Product Manager, Payments', company: 'Rupee Rail', location: 'Mumbai, Maharashtra, India', country: 'IN', workMode: 'hybrid', level: 'senior' },
  { title: 'Product Manager, AI Search', company: 'Tandem AI', location: 'Bengaluru, Karnataka, India', country: 'IN', workMode: 'hybrid', level: 'pm' },
  { title: 'Group Product Manager, Consumer Growth', company: 'Dosa Digital', location: 'Hyderabad, Telangana, India', country: 'IN', workMode: 'hybrid', level: 'lead' },
  { title: 'Product Manager, Logistics', company: 'Kite Commerce', location: 'Pune, Maharashtra, India', country: 'IN', workMode: 'onsite', level: 'pm' },
  { title: 'Associate Product Manager, EdTech', company: 'Quill Learning', location: 'Remote, India', country: 'IN', workMode: 'remote', level: 'apm' },
  { title: 'Senior Product Manager, Platform', company: 'Halcyon Cloud', location: 'Bengaluru, Karnataka, India', country: 'IN', workMode: 'hybrid', level: 'senior' },
  { title: 'Product Manager, Healthtech', company: 'Orbit Health', location: 'Chennai, Tamil Nadu, India', country: 'IN', workMode: 'hybrid', level: 'pm' },
  { title: 'Product Manager, Merchant Experience', company: 'Rupee Rail', location: 'Bengaluru, Karnataka, India', country: 'IN', workMode: 'hybrid', level: 'pm' },
  { title: 'Product Manager, Gen AI', company: 'Meridian Data', location: 'Noida, Uttar Pradesh, India', country: 'IN', workMode: 'hybrid', level: 'pm' },
]

/** Demo-only sample listings, dated relative to today so the 2-day window behaves like production. */
export function demoJobs(): Job[] {
  return ROWS.map((r, i) => ({
    ...r,
    id: `sample-${i + 1}`,
    postedOn: iso(i % 3 === 0 ? 1 : 0),
    url: 'https://www.linkedin.com/jobs/',
    sample: true,
  }))
}
