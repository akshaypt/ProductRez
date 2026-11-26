import type { InputFieldSpec } from '../types.ts'

export const SECTION_ALIASES: Record<string, RegExp> = {
  summary: /^(professional\s+)?(summary|profile|objective|about(\s+me)?|career\s+summary|executive\s+summary)$/i,
  experience:
    /^((professional|work|relevant|product|industry|related)\s+)?(experience|employment(\s+history)?|work\s+history|career\s+history)$/i,
  projects: /^((selected|personal|side|key|academic|product|ai)\s+)?projects?(\s*(&|and)\s*(case\s+studies|teardowns|portfolio))?$/i,
  education: /^(education(\s+(&|and)\s+(training|certifications?))?|academic\s+background|academics)$/i,
  skills:
    /^((technical|core|key|relevant)\s+)?(skills?|competenc(y|ies)|tools?(\s+(&|and)\s+technologies)?|technologies|skills\s*(&|and)\s*tools?|expertise)$/i,
  extras:
    /^(certifications?|licenses?|awards?(\s+(&|and)\s+honou?rs)?|honou?rs|achievements?|publications?|volunteer(ing)?(\s+experience)?|activities|extracurriculars?|interests|languages|speaking|patents?|courses?|community)$/i,
}

export const STOPWORDS = new Set(
  `a an and are as at be but by for from has have he her his i in is it its of on or our she that the their them they this to was we were will with you your
   about above after again all also am any because been before being below between both can could did do does doing down during each few further had having here
   how if into just more most my no nor not now off once only other out over own same so some such than then there these those through too under until up very what when where which while who whom why would
   work working experience years year including include ability strong team teams role roles company candidate looking join using use used etc via within across new
   must should may will plus per able well`.split(/\s+/).filter(Boolean),
)

export const JD_PHRASES = [
  'roadmap',
  'stakeholder',
  'a/b testing',
  'experimentation',
  'sql',
  'go-to-market',
  'user research',
  'customer discovery',
  'prd',
  'agile',
  'scrum',
  'okr',
  'kpi',
  'analytics',
  'b2b',
  'b2c',
  'saas',
  'marketplace',
  'platform',
  'api',
  'machine learning',
  'ai',
  'llm',
  'rag',
  'evals',
  'generative ai',
  'agentic',
  'data-driven',
  'cross-functional',
  'prioritization',
  'strategy',
  'pricing',
  'monetization',
  'growth',
  'retention',
  'activation',
  'onboarding',
  'fintech',
  'payments',
  'kyc',
  'compliance',
  'enterprise',
  'rbac',
  'sso',
  'nrr',
  'arr',
  'plg',
  'infrastructure',
  'developer experience',
  'jira',
  'figma',
  'amplitude',
  'mixpanel',
  'posthog',
  'tableau',
  'looker',
  'kubernetes',
  'aws',
  'gcp',
  'azure',
  'python',
  'snowflake',
  'datadog',
  'salesforce',
  'hubspot',
  'stripe',
  'razorpay',
  'v0',
  'lovable',
  'cursor',
  'mcp',
  'langgraph',
  'scim',
  'soc2',
  'gdpr',
  'pci-dss',
  'context engineering',
  'token economics',
  'hybrid search',
  'reranking',
  'human-in-the-loop',
  'observability',
  'opentelemetry',
  'claude code',
  'linear',
]

/** Synonym groups so rule-based JD matching credits genuine PM terminology variants while still distinguishing exact vs synonym matches. */
export const JD_SYNONYMS: Record<string, string[]> = {
  'a/b testing': ['ab testing', 'experimentation', 'split testing', 'multivariate'],
  'experimentation': ['a/b testing', 'ab testing', 'experiments', 'hypothesis testing'],
  'go-to-market': ['gtm', 'product launch', 'launch strategy', 'commercialization'],
  'customer discovery': ['user research', 'user interviews', 'customer interviews', 'jtbd'],
  'user research': ['customer discovery', 'usability testing', 'customer interviews'],
  'monetization': ['pricing', 'packaging', 'paywall', 'revenue expansion'],
  'plg': ['product-led growth', 'self-serve', 'self serve'],
  'evals': ['evaluation', 'golden set', 'llm-as-a-judge', 'model quality', 'pass rate'],
  'rag': ['retrieval-augmented generation', 'retrieval augmented', 'context engineering', 'hybrid search'],
  'context engineering': ['rag', 'chunking', 'reranking', 'retrieval-augmented generation'],
  'developer experience': ['devex', 'dx', 'api adoption', 'sdk'],
  'stakeholder': ['cross-functional', 'executive alignment', 'leadership alignment'],
  'observability': ['opentelemetry', 'tracing', 'spans', 'telemetry'],
}

export const ATS_PLATFORM_KB = {
  greenhouseMaxBytes: 2.5 * 1024 * 1024, // 2.5 MB Greenhouse parse cap
  rules: [
    {
      id: 'single_column',
      platforms: ['Greenhouse', 'Lever', 'Workday', 'Ashby'],
      summary: 'Multi-column sidebars and embedded layout tables scramble reading order across columns (even Ashby scrambles text tables).',
    },
    {
      id: 'header_contact',
      platforms: ['Workday', 'Greenhouse'],
      summary: 'Contact info inside PDF header/footer zones, images, or icon-fonts is frequently dropped during ingestion.',
    },
    {
      id: 'lever_phone_format',
      platforms: ['Lever'],
      summary: 'Lever strict-validates contact fields and maps phone numbers without an international country code (+1, +91) to null.',
    },
    {
      id: 'workday_dates_headers',
      platforms: ['Workday', 'Greenhouse'],
      summary: 'Creative headers ("My Journey") or non-standard dates ("Spring 2023") break Workday chronology and Greenhouse section mapping.',
    },
    {
      id: 'exact_pm_title',
      platforms: ['Lever', 'Greenhouse', 'Ashby'],
      summary: 'Recruiter Boolean queries search full "Product Manager" rather than bare "PM". Spell out titles cleanly.',
    },
    {
      id: 'file_size',
      platforms: ['Greenhouse'],
      summary: 'Files larger than 2.5 MB fail silent auto-parsing in Greenhouse.',
    },
  ],
}

/**
 * Canonical input specification for ProductRez's PM ATS Scorer.
 * Explicitly separates Required, Context, Optional Targeting, and Explicitly Excluded inputs.
 */
export const INPUT_SCHEMA: InputFieldSpec[] = [
  {
    key: 'text',
    tier: 'required',
    label: 'Resume (PDF / DOCX / Text)',
    required: true,
    whyCollected: 'Core document text, plus pageCount and fileSizeBytes for ATS parser limits (e.g., Greenhouse 2.5 MB cap).',
  },
  {
    key: 'targetLevel',
    tier: 'required',
    label: 'Target PM Level',
    required: true,
    defaultValue: 'pm',
    options: [
      { value: 'apm', label: 'APM / Entry PM', impactNote: 'Expects projects/case studies, 4+ competencies, strict 1-page.' },
      { value: 'pm', label: 'Product Manager', impactNote: 'Expects 5+ competencies, ownership verbs, metric-first bullets.' },
      { value: 'senior', label: 'Senior PM', impactNote: 'Expects 6+ competencies, multi-squad strategy, pricing/P&L scope.' },
      { value: 'lead', label: 'GPM / Director+', impactNote: 'Expects org design, hiring/managing PMs, portfolio & multi-year vision.' },
    ],
    whyCollected: 'Prevents misclassifying career switchers and sets exact seniority scope thresholds.',
  },
  {
    key: 'pmExperience',
    tier: 'required',
    label: 'Direct PM Experience',
    required: true,
    defaultValue: 'auto',
    options: [
      { value: 'transitioning', label: '0 yrs (Transitioning into PM)', impactNote: 'Evaluates transferable ownership + requires product projects/teardowns.' },
      { value: '0_2', label: '< 2 yrs as PM', impactNote: 'Weights execution, discovery, and metric clarity.' },
      { value: '2_5', label: '2–5 yrs as PM', impactNote: 'Expects autonomous roadmap & KPI ownership.' },
      { value: '5_8', label: '5–8 yrs as PM', impactNote: 'Expects multi-squad leverage, strategy, and mentoring.' },
      { value: '8_plus', label: '8+ yrs as PM', impactNote: 'Expects org leadership, P&L/portfolio ownership, permits 2 pages.' },
    ],
    whyCollected: 'Separates total career years (e.g. 6 yrs SWE) from actual PM years so switchers get accurate feedback.',
  },
  {
    key: 'track',
    tier: 'context',
    label: 'PM Track / Specialization',
    required: false,
    defaultValue: 'generalist',
    options: [
      { value: 'generalist', label: 'Core / Generalist', impactNote: 'Balanced core PM competencies & retention/conversion/ARR KPIs.' },
      { value: 'ai_ml', label: 'AI / ML PM', impactNote: 'Checks evals, golden sets, RAG/context engineering, latency/token cost, AI-washing.' },
      { value: 'growth_plg', label: 'Growth & PLG', impactNote: 'Checks A/B velocity, activation, retention cohorts, CAC/LTV, paywalls.' },
      { value: 'b2b_saas', label: 'B2B SaaS / Enterprise', impactNote: 'Checks NRR/ARR, TTV, RBAC/SSO/SOC2, sales & CS alignment.' },
      { value: 'platform_api', label: 'Platform & API', impactNote: 'Checks DevEx, TTFAC, p95/p99 latency, uptime/SLA, adoption.' },
      { value: 'fintech', label: 'Fintech & Payments', impactNote: 'Checks authorization rate, KYC/AML, fraud guardrails, ledger/PCI/RBI.' },
    ],
    whyCollected: 'Different PM tracks are screened on totally different KPIs, tools, and guardrail expectations.',
  },
  {
    key: 'companyArchetype',
    tier: 'context',
    label: 'Target Company Type',
    required: false,
    defaultValue: 'scaleup',
    options: [
      { value: 'early_startup', label: 'Early-Stage Startup', impactNote: 'Boosts ownership (24%) & craft (22%); screens for 0→1, MVP, PMF, shipping speed.' },
      { value: 'scaleup', label: 'Growth / Scale-up', impactNote: 'Boosts quantified impact (32%); screens for retention, NRR, funnel & A/B rigor.' },
      { value: 'maang', label: 'MAANG / Big Tech', impactNote: 'Boosts craft (24%) & impact (28%); enforces max 3–4 bullets/role & scale signals.' },
      { value: 'enterprise', label: 'Enterprise / MNC', impactNote: 'Boosts ATS hygiene (18%) & JD match (30%); checks Workday safety & stakeholder depth.' },
    ],
    whyCollected: 'A resume that wins at Seed startups fails at MAANG or Workday enterprises unless weights and signals adjust.',
  },
  {
    key: 'market',
    tier: 'context',
    label: 'Target Market / Work Mode',
    required: false,
    defaultValue: 'india',
    options: [
      { value: 'india', label: 'India', impactNote: 'Recognizes ₹/Cr/Lakhs metrics; 2 pages tolerated for Senior/GPM+.' },
      { value: 'us', label: 'United States', impactNote: 'Strict PII check (no DOB/marital status/photo); strict 1 page under 10 YOE.' },
      { value: 'remote_global', label: 'Global / US Remote', impactNote: 'Strict PII check + checks timezone overlap & async PRD/RFC documentation.' },
    ],
    whyCollected: 'Page length norms, PII compliance risks, currency parsing, and remote async signals vary sharply across India, US, and Remote.',
  },
  {
    key: 'background',
    tier: 'context',
    label: 'Current Background',
    required: false,
    defaultValue: 'auto',
    options: [
      { value: 'practicing_pm', label: 'Practicing PM', impactNote: 'Evaluates direct PM scope and progression.' },
      { value: 'engineering', label: 'Engineering / Tech', impactNote: 'Checks that bullets frame user/business outcomes, not just code tasks.' },
      { value: 'business_ops', label: 'Consulting / Ops / Strategy', impactNote: 'Checks product build proof (projects, tech fluency, PRDs).' },
      { value: 'design', label: 'Product Design / UX', impactNote: 'Checks quantitative KPIs, analytics, and GTM/business ownership.' },
      { value: 'analytics', label: 'Data / Analytics', impactNote: 'Checks end-to-end shipping & stakeholder decision ownership.' },
      { value: 'founder', label: 'Founder / 0→1 Builder', impactNote: 'Credits 0→1 ownership; advises translating founder scope to structured PM clarity.' },
      { value: 'mba_grad', label: 'MBA / New Grad', impactNote: 'Requires strong product projects/teardowns and concise pitch summary.' },
    ],
    whyCollected: 'Shapes tailored advice for career transitioners vs practicing PMs.',
  },
  {
    key: 'targetRoleTitle',
    tier: 'optional_targeting',
    label: 'Target Role Title (optional)',
    required: false,
    whyCollected: 'Checks title/headline alignment when full JD text is not provided.',
  },
  {
    key: 'jobDescription',
    tier: 'optional_targeting',
    label: 'Job Description (optional)',
    required: false,
    whyCollected: 'Unlocks weighted JD Match category (20–30%), required YOE eligibility check, and placement audit (in bullets vs skills-only).',
  },
]

export const EXCLUDED_INPUTS = [
  { input: 'Expected salary / CTC', reason: 'Zero relevance to resume ATS parsing or PM craft scoring.' },
  { input: 'Notice period / Visa sponsorship', reason: 'Belongs to application knockout forms, not resume quality evaluation.' },
  { input: 'Photo / Date of birth / Gender', reason: 'Never collect — actively harmful on US/Remote ATS resumes.' },
  { input: 'Manual role-by-role form entry', reason: 'Parsed directly from the resume; adding manual forms kills completion rate.' },
]
