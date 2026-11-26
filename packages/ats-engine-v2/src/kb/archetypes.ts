import type { CompanyArchetype, DimensionId } from '../types.ts'

export interface ArchetypeKb {
  id: CompanyArchetype
  label: string
  coreTheme: string
  signalPattern: RegExp
  idealBulletsPerRole: { min: number; max: number }
  /** Base dimension weights before JD activation (must sum to 1.0) */
  baseWeights: Record<Exclude<DimensionId, 'jd_match'>, number>
  /** Bonus weight allocated to jd_match when a JD is provided */
  jdWeight: number
  whatHiringManagersScreenFor: string[]
  recommendedKeywords: string[]
  pitfallAdvice: string
}

export const ARCHETYPE_KB: Record<CompanyArchetype, ArchetypeKb> = {
  early_startup: {
    id: 'early_startup',
    label: 'Early-Stage Startup (Seed – Series A)',
    coreTheme: 'Velocity, 0→1 product building, scrappy discovery, PMF, and direct GTM ownership.',
    signalPattern: /\b(0[- ]?to[- ]?1|mvp|pmf|product[- ]market fit|founding|prototype|shipped in \d+ (days|weeks)|customer calls|cold outreach|self[- ]serve|gtm|launched from scratch|first \d+ (users|customers))\b/i,
    idealBulletsPerRole: { min: 2, max: 4 },
    baseWeights: {
      impact: 0.28,
      ownership: 0.24,
      craft: 0.22,
      ats_hygiene: 0.10,
      experience_fit: 0.08,
      writing: 0.08,
    },
    jdWeight: 0.20,
    whatHiringManagersScreenFor: [
      'Shipping speed under ambiguity (MVPs launched in weeks, not quarters).',
      'Direct user proximity: running customer interviews, rapid prototypes, and first-customer GTM.',
      'High ownership without layers of process — framing what you personally built/closed.',
    ],
    recommendedKeywords: ['0-to-1', 'MVP', 'Product-Market Fit (PMF)', 'Rapid Prototyping', 'Go-to-Market', 'Customer Discovery'],
    pitfallAdvice: 'Early-stage founders reject resumes heavy on corporate governance jargon ("SAFe", "steering committee"). Show shipping speed, 0→1 ownership, and customer obsession.',
  },
  scaleup: {
    id: 'scaleup',
    label: 'Growth / Scale-up (Series B – Pre-IPO)',
    coreTheme: 'Repeatable growth loops, funnel/NRR optimization, experimentation velocity, and scaling squads.',
    signalPattern: /\b(a\/b|experiment|funnel|cohort|retention|nrr|arr|activation|conversion|plg|pricing|multi[- ]squad|cross[- ]functional|scale[ds]?)\b/i,
    idealBulletsPerRole: { min: 3, max: 4 },
    baseWeights: {
      impact: 0.32,
      craft: 0.20,
      ownership: 0.18,
      ats_hygiene: 0.12,
      experience_fit: 0.10,
      writing: 0.08,
    },
    jdWeight: 0.25,
    whatHiringManagersScreenFor: [
      'Moving core SaaS/consumer needles: activation, D30 retention, ARR, NRR, and CAC payback.',
      'Experimentation cadence (A/B tests, SQL/Amplitude cohorts) tied to business revenue.',
      'Scaling from 1 squad to multiple squads cleanly.',
    ],
    recommendedKeywords: ['Experimentation', 'Retention', 'Activation', 'ARR / NRR', 'A/B Testing', 'Cross-functional'],
    pitfallAdvice: 'Scale-ups care about compounding metrics over one-off launches. Make sure every bullet shows a baseline → after metric delta.',
  },
  maang: {
    id: 'maang',
    label: 'MAANG / Big Tech',
    coreTheme: 'Massive user/system scale, analytical & statistical rigor, strategic clarity, and cross-org alignment.',
    signalPattern: /\b(\d+\s*(m|mn|million|billion)\+?\s*(users|mau|dau|requests|queries)|stat[- ]sig|a\/b|north[- ]star|strategy|vision|platform|latency|p99|okrs?|cross[- ]org|executive|machine learning|ai)\b/i,
    idealBulletsPerRole: { min: 3, max: 4 },
    baseWeights: {
      impact: 0.28,
      craft: 0.24,
      ownership: 0.18,
      ats_hygiene: 0.12,
      experience_fit: 0.10,
      writing: 0.08,
    },
    jdWeight: 0.25,
    whatHiringManagersScreenFor: [
      'Scale context (millions of users, high-QPS systems, or multi-million-dollar impact).',
      'Structured product thinking: product sense, statistical A/B rigor, trade-offs, and strategy.',
      'Concise 1-page editorial polish (Shreyas Doshi rule: max 3–4 punchy outcome bullets per role).',
    ],
    recommendedKeywords: ['Product Strategy', 'North-Star Metric', 'Statistical Significance', 'Cross-Org Alignment', 'Scale (MAU/QPS)', 'Trade-offs'],
    pitfallAdvice: 'Big Tech screeners rapidly reject "Feature Factory" resumes with 6–8 bullets per role or uncontextualized claims ("grew 10M users" without isolating your specific lever).',
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise / Legacy Tech / MNC',
    coreTheme: 'Multi-stakeholder orchestration, enterprise compliance/security, ARR expansion, and predictable delivery.',
    signalPattern: /\b(enterprise|arr|acv|stakeholders?|governance|compliance|soc\s?2|gdpr|rbac|sso|integration|multi[- ]quarter|roadmap|migration|sales|executive|c-suite|sla)\b/i,
    idealBulletsPerRole: { min: 3, max: 5 },
    baseWeights: {
      impact: 0.24,
      ats_hygiene: 0.18,
      ownership: 0.20,
      craft: 0.16,
      experience_fit: 0.14,
      writing: 0.08,
    },
    jdWeight: 0.30,
    whatHiringManagersScreenFor: [
      'Enterprise portals (Workday/Taleo) heavily rely on clean headings, exact role titles, and consistent dates.',
      'Multi-quarter roadmapping, executive/legal/sales alignment, and contract/ARR impact.',
      'Security, compliance, and integration depth (SSO, RBAC, SLAs, data migration).',
    ],
    recommendedKeywords: ['Enterprise SaaS', 'Stakeholder Alignment', 'ARR / ACV', 'Compliance / Security', 'Multi-quarter Roadmap', 'Executive Buy-in'],
    pitfallAdvice: 'Enterprise ATS systems like Workday scramble non-standard layouts and penalize missing exact JD phrases. Keep headings standard and mirror JD terminology verbatim inside experience bullets.',
  },
}
