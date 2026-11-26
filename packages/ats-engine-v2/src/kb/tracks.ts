import type { PmTrack } from '../types.ts'

export interface TrackKb {
  id: PmTrack
  label: string
  summary: string
  /** Keywords & KPIs expected inside experience bullets (higher value) */
  coreKpisPattern: RegExp
  /** Tools/methods expected for this track */
  toolsPattern: RegExp
  /** Track-specific keywords ATS & recruiters scan for */
  mustHaveTerms: string[]
  recommendedTools: string[]
  exemplarBullets: string[]
  commonPitfalls: string[]
}

export const TRACK_KB: Record<PmTrack, TrackKb> = {
  generalist: {
    id: 'generalist',
    label: 'Core / Generalist PM',
    summary: 'End-to-end discovery, prioritization, execution, and measurable user/business outcomes.',
    coreKpisPattern: /\b(retention|activation|conversion|adoption|revenue|arr|nps|csat|churn|engagement|time[- ]to[- ]value|dau|mau)\b/i,
    toolsPattern: /\b(sql|amplitude|mixpanel|looker|jira|figma|a\/b|experiment)\b/i,
    mustHaveTerms: ['customer discovery', 'roadmap', 'prioritization', 'A/B testing', 'SQL', 'cross-functional', 'KPIs'],
    recommendedTools: ['SQL', 'Amplitude / Mixpanel', 'Figma', 'Jira', 'Looker'],
    exemplarBullets: [
      'Owned onboarding roadmap across 3 squads; redesigned setup after 30 customer interviews, lifting D7 activation from 38% to 54% in 2 quarters.',
      'Sunsetted 2 low-adoption enterprise workflows to free 40% squad capacity for core billing, cutting churn from 4.8% to 3.4%.',
    ],
    commonPitfalls: [
      'Listing shipped features without before → after outcomes.',
      'Generic summary adjectives ("visionary", "passionate") instead of domain + scale.',
    ],
  },
  ai_ml: {
    id: 'ai_ml',
    label: 'AI / ML Product Manager',
    summary: 'Probabilistic products, LLM/RAG workflows, evaluation pipelines (evals), latency/token unit economics, and quality guardrails.',
    coreKpisPattern: /\b(evals?|golden set|hallucination|latency|token (cost|yield)|inference|deflect|accuracy|precision|recall|pass rate|csat|adoption|human[- ]in[- ]the[- ]loop|hitl|regression)\b/i,
    toolsPattern: /\b(rag|llm|prompt|context engineering|hybrid search|rerank|chunking|agent|langgraph|langsmith|braintrust|v0|lovable|cursor|claude code|streamlit|eval|llm[- ]as[- ]a[- ]judge|embeddings?|vector|fine[- ]tun|mcp|guardrail)\b/i,
    mustHaveTerms: ['evals / golden set', 'RAG / context engineering', 'latency & token cost', 'guardrail metrics', 'rapid AI prototyping', 'LLM-as-a-judge'],
    recommendedTools: ['Golden Eval Suites', 'RAG / Vector DBs', 'v0 / Lovable / Cursor', 'LangSmith / Braintrust', 'SQL / Python'],
    exemplarBullets: [
      'Shipped RAG support copilot across 3 languages; deflected 31% of tier-1 tickets while holding CSAT flat at 4.6/5 via a 300-case golden eval set.',
      'Defined an LLM-as-a-judge evaluation suite gating 14 prompt and model releases, cutting hallucination rate from 6.4% to 1.1% and inference cost by 28%.',
      'Cut discovery cycle from 3 weeks to 4 days by building 5 working prototypes in v0/Lovable and validating with 12 enterprise buyers pre-engineering.',
    ],
    commonPitfalls: [
      'AI-washing: listing "GenAI, LLMs, Prompt Engineering" in Skills with zero evals, guardrails, or cost/latency trade-offs in Experience.',
      'Claiming automation efficiency ("cut tickets 40%") without proving CSAT/accuracy stayed intact.',
    ],
  },
  growth_plg: {
    id: 'growth_plg',
    label: 'Growth & PLG PM',
    summary: 'Acquisition funnels, onboarding activation, experimentation velocity, retention loops, and self-serve monetization.',
    coreKpisPattern: /\b(activation|conversion|retention|d7|d30|cac|ltv|viral|k[- ]factor|paywall|trial[- ]to[- ]paid|arpu|nrr|plg|funnel|drop[- ]off|churn|signups?)\b/i,
    toolsPattern: /\b(a\/b|multivariate|amplitude|mixpanel|posthog|optimizely|statsig|launchdarkly|segment|ga4|sql|cohort)\b/i,
    mustHaveTerms: ['funnel optimization', 'A/B experimentation', 'cohort analysis', 'activation rate', 'PLG / self-serve', 'trial-to-paid conversion', 'retention loops'],
    recommendedTools: ['Amplitude / PostHog / Mixpanel', 'Statsig / Optimizely', 'SQL', 'Segment', 'GA4'],
    exemplarBullets: [
      'Ran 14 onboarding & paywall A/B tests using Amplitude and Statsig, lifting D7 activation 24% and free-to-paid conversion from 3.2% to 4.8%.',
      'Rebuilt workspace invite loop and lifecycle triggers, reducing CAC 18% and cutting D30 churn 14% (+$1.2M ARR).',
    ],
    commonPitfalls: [
      'Stating "improved conversion" without stating sample size, experiment count, or baseline → after numbers.',
      'Ignoring monetization or retention guardrails (e.g. lifting top-of-funnel signups with zero retention impact).',
    ],
  },
  b2b_saas: {
    id: 'b2b_saas',
    label: 'B2B SaaS & Enterprise PM',
    summary: 'Account-level workflows, multi-stakeholder buying committees, enterprise readiness (RBAC/SSO), NRR expansion, and GTM alignment.',
    coreKpisPattern: /\b(arr|nrr|acv|churn|logo retention|expansion|time[- ]to[- ]value|ttv|seat adoption|pipeline|deal|enterprise|win rate|renewal|upsell)\b/i,
    toolsPattern: /\b(rbac|sso|saml|scim|salesforce|hubspot|looker|tableau|zendesk|jira|figma|multi[- ]tenant|soc\s?2|audit log)\b/i,
    mustHaveTerms: ['NRR / ARR expansion', 'RBAC / SSO / enterprise readiness', 'multi-tenant', 'time-to-value (TTV)', 'sales & CS enablement', 'customer discovery calls'],
    recommendedTools: ['Salesforce', 'Looker / Tableau', 'Jira', 'Figma', 'Zendesk / Gong'],
    exemplarBullets: [
      'Launched enterprise RBAC, SAML SSO, and audit logs across multi-tenant workspaces, unlocking $3.5M net-new ARR and lifting NRR to 118%.',
      'Partnered with Customer Success on guided admin onboarding after 22 enterprise discovery calls, cutting time-to-value by 40% and logo churn 5.2%.',
    ],
    commonPitfalls: [
      'Sounding like an internal project coordinator instead of owning ARR, renewal, or enterprise workflow outcomes.',
      'Missing enterprise trust primitives (RBAC, SSO, SOC2/compliance, permissions) when targeting B2B SaaS roles.',
    ],
  },
  platform_api: {
    id: 'platform_api',
    label: 'Platform & Technical / API PM',
    summary: 'Developer experience (DevEx), API-first design, internal platforms, reliability SLAs/SLOs, throughput, and migration leverage.',
    coreKpisPattern: /\b(latency|p95|p99|uptime|sla|slo|throughput|req\/s|rps|ttfac|time[- ]to[- ]first[- ]api|adoption|migration|error rate|deployment|incident|tech debt)\b/i,
    toolsPattern: /\b(api|sdk|rest|graphql|grpc|openapi|swagger|postman|microservices?|kafka|kubernetes|aws|gcp|azure|datadog|opentelemetry|webhooks?|oauth|mcp|rate[- ]limit|terraform|sql)\b/i,
    mustHaveTerms: ['API-first design', 'Developer Experience (DevEx)', 'SLA / SLO / uptime', 'p95/p99 latency', 'system scalability', 'platform adoption'],
    recommendedTools: ['OpenAPI / Postman', 'REST / GraphQL', 'Datadog', 'AWS / GCP', 'SQL'],
    exemplarBullets: [
      'Redesigned core developer auth & sandbox APIs, cutting Time-to-First-API-Call (TTFAC) from 4.2 days to 6.3 hours across 1,800 external teams.',
      'Led zero-downtime migration to event-driven microservices, scaling throughput to 10,000 req/sec at 99.99% uptime and lowering infra cost 22%.',
    ],
    commonPitfalls: [
      'Writing purely architectural engineering bullets without framing developer adoption, partner velocity, or cost savings.',
      'No reliability, latency, or adoption numbers.',
    ],
  },
  fintech: {
    id: 'fintech',
    label: 'Fintech & Payments PM',
    summary: 'Payment conversion & routing, KYC/KYB onboarding, risk & fraud guardrails, ledger integrity, and regulatory compliance.',
    coreKpisPattern: /\b(authorization rate|approval rate|success rate|fraud|chargeback|kyc|kyb|gmv|tpv|take rate|reconciliation|settlement|disbursement|default|npa|drop[- ]off|compliance)\b/i,
    toolsPattern: /\b(stripe|razorpay|adyen|upi|ach|sepa|swift|ledger|pci[- ]dss|rbi|npci|aml|kyc|socure|sift|sql|looker|webhook)\b/i,
    mustHaveTerms: ['payment authorization rate', 'KYC / AML onboarding', 'fraud & risk mitigation', 'ledger reconciliation', 'settlement / routing', 'PCI-DSS / RBI compliance'],
    recommendedTools: ['SQL', 'Payment Gateways (Stripe / Razorpay / Adyen)', 'Risk/KYC Engines', 'Looker', 'Ledger / Webhook Specs'],
    exemplarBullets: [
      'Built smart multi-gateway payment routing across UPI and cards, lifting authorization rate +3.8% and recovering $850K/month in failed transactions.',
      'Automated KYC/AML verification pipeline compliant with RBI/PCI-DSS mandates, cutting manual review time 65% while keeping fraud under 0.01%.',
    ],
    commonPitfalls: [
      'Highlighting faster KYC/lending disbursement without showing fraud, chargeback, or compliance guardrails.',
      'Missing reconciliation, settlement, or regulatory depth.',
    ],
  },
}
