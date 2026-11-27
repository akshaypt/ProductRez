import type { CompanyArchetype, PmTrack, TargetLevel } from '@ats'

export const LEVELS: { label: string; v: Exclude<TargetLevel, 'auto'> }[] = [
  { label: 'APM (0–2 yrs)', v: 'apm' },
  { label: 'Product Manager', v: 'pm' },
  { label: 'Senior PM', v: 'senior' },
  { label: 'Lead / Group PM', v: 'lead' },
]
export const TRACKS: { label: string; v: PmTrack }[] = [
  { label: 'Core / Generalist', v: 'generalist' },
  { label: 'AI / ML Product', v: 'ai_ml' },
  { label: 'Growth & PLG', v: 'growth_plg' },
  { label: 'B2B SaaS', v: 'b2b_saas' },
  { label: 'Fintech', v: 'fintech' },
  { label: 'Platform & API', v: 'platform_api' },
]
export const COMPANIES: { label: string; v: CompanyArchetype }[] = [
  { label: 'Early Startups', v: 'early_startup' },
  { label: 'Scale-ups', v: 'scaleup' },
  { label: 'Big Tech / MAANG', v: 'maang' },
  { label: 'Enterprise', v: 'enterprise' },
]

/** Illustrative sample for the marketing page only. Real numbers appear in the report you generate. */
export const CURR = {
  INR: { min: '₹34L', mid: 'Median ₹44L (Fit: ₹44L–₹53L)', max: '₹57L', cur: 'Current: ₹35L (Underpaid)', exp: 'Expected: ₹45L (Achievable)', note: 'Sample output: ₹45L sits at the 54th percentile, right on market median and well aligned with a 92/100 Senior PM resume.', pinC: '12%', pinE: '48%' },
  USD: { min: '$235k', mid: 'Median $290k (Fit: $290k–$345k)', max: '$365k', cur: 'Current: $245k (Underpaid)', exp: 'Expected: $300k (Achievable)', note: 'Sample output: $300k sits at the 54th percentile, right on market median and well aligned with a 92/100 Senior PM resume.', pinC: '14%', pinE: '50%' },
} as const

export const SAMPLE_JOBS = [
  { co: 'Sample Co. A', ago: '9h ago', role: 'Senior PM, Growth', loc: 'Bengaluru · ₹42L–₹54L', match: 91 },
  { co: 'Sample Co. B', ago: '14h ago', role: 'PM, Workflow & API', loc: 'Remote Global · $210k–$260k', match: 86 },
  { co: 'Sample Co. C', ago: '28h ago', role: 'PM, AI Agents', loc: 'Hybrid / Remote · 1 gap', match: 82 },
]

export const REWRITE_STEPS = [
  { ico: 'upload', t: 'Upload Existing Resume', d: 'Drop your current PDF or DOCX so we have your baseline score and history.' },
  { ico: 'layout', t: 'Pick a Template', d: 'Choose a clean, recruiter-approved single-column PM layout.' },
  { ico: 'tasks', t: 'Quick Questionnaire', d: 'Share target role context and any missing project metrics in 60 seconds.' },
  { ico: 'send', t: 'Submit & Relax', d: 'We rewrite your resume to PM standards and run our score check within 24 hours.' },
]
