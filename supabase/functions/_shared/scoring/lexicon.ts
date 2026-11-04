export const STRONG_VERBS = new Set(
  `launched shipped owned led drove defined built created designed established founded spearheaded scaled grew
   increased reduced cut improved accelerated delivered introduced pioneered architected transformed negotiated
   prioritized prioritised championed rebuilt redesigned migrated automated optimized optimised unified streamlined
   secured won landed expanded doubled tripled halved generated saved converted activated retained validated
   discovered identified aligned influenced mentored hired coached managed directed orchestrated operationalized
   monetized monetised productized productised rolled instituted overhauled consolidated simplified standardized
   standardised initiated formulated developed implemented executed deployed released piloted tested experimented
   analyzed analysed synthesized synthesised crafted authored drafted shaped steered reshaped turned repositioned
   evangelized evangelised sponsored incubated bootstrapped sourced partnered drove
   wrote ran made took won sold held set put found began brought taught spent chose gave got kept rose
   sought sent paid forged fostered reworked rewrote reran onboarded interviewed surveyed analysed analyzed
   mapped scoped sized forecasted budgeted audited unblocked facilitated mediated documented specified
   instrumented benchmarked curated trained supervised`
    .split(/\s+/)
    .filter(Boolean),
)

export const WEAK_PHRASES: RegExp[] = [
  /^\s*(was\s+)?responsible\s+for\b/i,
  /^\s*(was\s+)?in\s+charge\s+of\b/i,
  /^\s*(duties|responsibilities)\s+(included|include)\b/i,
  /^\s*(helped|helping|assisted|assisting|supported|supporting)\b/i,
  /^\s*(worked|working)\s+(on|with|closely|to)\b/i,
  /^\s*(was\s+)?(involved|participated|part\s+of)\b/i,
  /^\s*(participated|contributed)\s+(in|to)\b/i,
  /^\s*(tasked|charged)\s+with\b/i,
  /^\s*(handled|handling)\b/i,
  /^\s*(attended|sat\s+in)\b/i,
]

export const BUZZWORDS = [
  'team player',
  'hard-working',
  'hardworking',
  'hard working',
  'results-driven',
  'results driven',
  'detail-oriented',
  'detail oriented',
  'self-starter',
  'self starter',
  'go-getter',
  'synergy',
  'synergize',
  'think outside the box',
  'out-of-the-box',
  'passionate about',
  'highly motivated',
  'dynamic',
  'proven track record',
  'excellent communication skills',
  'strong communication skills',
  'fast-paced environment',
  'guru',
  'ninja',
  'rockstar',
  'visionary',
  'thought leader',
  'best-in-class',
  'world-class',
  'game-changing',
  'cutting-edge',
  'leverage',
  'leveraged',
  'utilize',
  'utilized',
]

export const FIRST_PERSON = /\b(I|my|me|myself|we|our)\b/

export const BUSINESS_METRIC_WORDS =
  /\b(retention|conversion|activation|churn|revenue|arr|mrr|gmv|nps|csat|dau|mau|wau|ltv|cac|arpu|aov|engagement|adoption|latency|margin|profit|cost|savings?|time[- ]to[- ](value|market|resolution|hire)|ticket|tickets|funnel|signups?|sign-ups?|onboarding|nrr|bookings|pipeline|usage|throughput|uptime|sla|defect|crash|attach rate|take rate|payback|growth|users?|customers?|sessions?|orders?)\b/i

const NUM = String.raw`\d[\d,]*(?:\.\d+)?`
export const METRIC_PATTERNS: RegExp[] = [
  new RegExp(String.raw`${NUM}\s?%`),
  new RegExp(String.raw`[$₹€£]\s?${NUM}\s?(?:k|m|mn|bn|b|cr|crore|lakh|lakhs|million|billion|thousand)?`, 'i'),
  new RegExp(String.raw`${NUM}\s?(?:x|×)\b`, 'i'),
  new RegExp(String.raw`\b${NUM}\s?(?:k|m|mn|bn|cr|crore|lakh|lakhs|million|billion|thousand)\+?\b`, 'i'),
  new RegExp(
    String.raw`\b${NUM}\+?\s+(?:[a-z-]+\s+){0,2}(?:users|customers|clients|teams|engineers|designers|markets|countries|stores|merchants|partners|sprints|weeks|months|days|hours|stakeholders|reports|features|releases|launches|experiments|tests|interviews|apps|accounts|sellers|drivers|riders|students|employees|squads|pms)\b`,
    'i',
  ),
  /\b(doubled|tripled|quadrupled|halved|10x|2x|3x)\b/i,
  /\bfrom\s+[^,.;]{1,25}\s+to\s+[^,.;]{1,25}/i,
  /\b(#\s?1|top\s?\d+|first)\b/i,
]

export const CHANGE_WORDS =
  /\b(increase[ds]?|decrease[ds]?|reduce[ds]?|improve[ds]?|grew|grow(?:th|n|ing)?|boost(?:ed)?|lift(?:ed)?|cut|save[ds]?|drove|drive|raise[ds]?|lower(?:ed)?|accelerate[ds]?|generate[ds]?|achiev(?:ed|ing)|exceed(?:ed|ing)|surpass(?:ed|ing)|up|down|by|from)\b/i

export interface CompetencyDef {
  id: string
  label: string
  pattern: RegExp
  hint: string
}

export const COMPETENCIES: CompetencyDef[] = [
  {
    id: 'discovery',
    label: 'Customer discovery',
    pattern:
      /\b(user research|customer interviews?|interviews?|surveys?|usability|customer insights?|jobs?[- ]to[- ]be[- ]done|jtbd|persona|pain points?|voice of (the )?customer|discovery|problem space|user feedback|field research|concept test|ethnograph)/i,
    hint: 'Show a decision you made because of what customers told you, e.g. “Interviewed 25 merchants … which led us to cut onboarding from 9 steps to 4.”',
  },
  {
    id: 'strategy',
    label: 'Strategy & vision',
    pattern:
      /\b(strateg(y|ic|ies)|vision|positioning|business case|market (sizing|analysis|entry|opportunity)|tam\b|competitive (analysis|landscape)|north[- ]star|long[- ]term|multi[- ]year|portfolio|p&l|bet|differentiat)/i,
    hint: 'Show how you chose where to play: the bet, the alternatives you rejected, and the outcome.',
  },
  {
    id: 'prioritization',
    label: 'Prioritization & roadmap',
    pattern:
      /\b(roadmap|prioriti[sz](e|ed|ing|ation)|backlog|rice\b|ice score|trade-?offs?|okrs?|kpis?|mvp|scope|sequenc(e|ed|ing)|cut scope|say(ing)? no|opportunity (cost|sizing))/i,
    hint: 'Name the trade-off you made and what you said no to, with the result.',
  },
  {
    id: 'execution',
    label: 'Execution & delivery',
    pattern:
      /\b(launch(ed)?|shipp?(ed|ing)|releas(e|ed|ing)|deliver(ed|ing)?|sprint|agile|scrum|kanban|prd\b|spec(s|ification)?|requirements|user stories|ga\b|beta|rollout|rolled out|go-live|milestone|dependenc)/i,
    hint: 'Anchor delivery to a date, scope and outcome: what shipped, when, to whom.',
  },
  {
    id: 'data',
    label: 'Data & experimentation',
    pattern:
      /\b(a\/b|ab test|experiment(s|ation)?|hypothes[ie]s|sql|analytics|funnel|cohort|dashboard|metrics?|amplitude|mixpanel|looker|tableau|heap|statsig|optimizely|statistical|instrument(ed|ation)|data[- ]driven|retention curve|segment(ation)?)/i,
    hint: 'Describe the experiment: hypothesis, metric, result, and the decision it drove.',
  },
  {
    id: 'gtm',
    label: 'Go-to-market & growth',
    pattern:
      /\b(go[- ]to[- ]market|gtm|pricing|packaging|monetiz|adoption|enablement|sales|marketing|partners?(hips?)?|launch plan|positioning|acquisition|activation|onboarding|lifecycle|growth|conversion|plg|channel)/i,
    hint: 'Connect the launch to demand: pricing, channel, adoption or revenue numbers.',
  },
  {
    id: 'technical',
    label: 'Technical fluency',
    pattern:
      /\b(api(s)?\b|sdk|platform|architecture|machine learning|\bml\b|\bai\b|llm|genai|generative|rag\b|model(s)?\b|integration|infrastructure|microservices?|data pipeline|latency|scalab|migration|cloud|aws|gcp|azure|security|privacy|compliance|embedding|fine-?tun)/i,
    hint: 'Show you can make technical trade-offs with engineers: latency vs. cost, build vs. buy, model quality vs. safety.',
  },
  {
    id: 'leadership',
    label: 'Influence & leadership',
    pattern:
      /\b(cross[- ]functional|stakeholders?|executives?|c-suite|leadership|mentor(ed|ing)?|coach(ed|ing)?|hired|hiring|aligned|alignment|influenc(e|ed|ing)|managed a team|led a team|squad|orchestrat|negotiat|partnered with|escalat|buy-in|evangeli[sz])/i,
    hint: 'Say who you aligned, what they disagreed on, and what changed because of it.',
  },
]

export const AI_PM_PATTERN =
  /\b(llm|generative ai|genai|gpt|agents?|rag\b|prompt|embedding|fine-?tun|machine learning|\bml\b|evals?\b|model quality|hallucination|inference|copilot)\b/i

export const LEVEL_SIGNALS: Record<'senior' | 'lead', RegExp> = {
  senior:
    /\b(roadmap|strategy|strategic|okrs?|mentor|stakeholders?|executive|cross[- ]functional|multi[- ]team|platform|portfolio|p&l|pricing|north[- ]star|vision|influenc|escalat|reorg|org[- ]wide|company[- ]wide)/i,
  lead: /\b(director|head of|vp\b|org(ani[sz]ation)?|portfolio|p&l|hired|hiring|built the (product )?team|managed (a )?(team|pms?|product managers)|reports?|multi[- ]year|vision|company[- ]wide|board|business unit|general manager|gm\b|c-suite|exec(utive)? team)/i,
}

export const TITLE_WORDS =
  /\b(manager|product|owner|lead|director|analyst|engineer|intern|associate|head|vp|vice president|founder|co-?founder|consultant|designer|developer|specialist|strategist|architect|officer|president|principal|apm|pm|scientist|coordinator|executive|fellow)\b/i

export const SECTION_ALIASES: Record<string, RegExp> = {
  summary: /^(professional\s+)?(summary|profile|objective|about(\s+me)?|career\s+summary|executive\s+summary)$/i,
  experience:
    /^((professional|work|relevant|product|industry|related)\s+)?(experience|employment(\s+history)?|work\s+history|career\s+history)$/i,
  projects: /^((selected|personal|side|key|academic|product)\s+)?projects?$/i,
  education: /^(education(\s+(&|and)\s+(training|certifications?))?|academic\s+background|academics)$/i,
  skills:
    /^((technical|core|key|relevant)\s+)?(skills?|competenc(y|ies)|tools?(\s+(&|and)\s+technologies)?|technologies|skills\s*(&|and)\s*tools?|expertise)$/i,
  extras:
    /^(certifications?|licenses?|awards?(\s+(&|and)\s+honou?rs)?|honou?rs|achievements?|publications?|volunteer(ing)?(\s+experience)?|leadership|activities|extracurriculars?|interests|languages|speaking|patents?|courses?|community)$/i,
}

export const STOPWORDS = new Set(
  `a an and are as at be but by for from has have he her his i in is it its of on or our she that the their them they this to was we were will with you your
   about above after again all also am any because been before being below between both can could did do does doing down during each few further had having here
   how if into just more most my no nor not now off once only other out over own same so some such than then there these those through too under until up very what when where which while who whom why would
   work working experience years year including include ability strong team teams role roles company candidate looking join using use used etc via within across new
   must should may will plus per able well`
    .split(/\s+/)
    .filter(Boolean),
)

/** Skills / phrases worth matching from a job description even if they appear once */
export const JD_PHRASES = [
  'roadmap',
  'stakeholder',
  'a/b testing',
  'experimentation',
  'sql',
  'go-to-market',
  'user research',
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
  'data-driven',
  'cross-functional',
  'prioritization',
  'strategy',
  'pricing',
  'growth',
  'retention',
  'onboarding',
  'fintech',
  'payments',
  'e-commerce',
  'mobile',
  'enterprise',
  'infrastructure',
  'developer',
  'jira',
  'figma',
  'amplitude',
  'mixpanel',
  'tableau',
  'looker',
]
