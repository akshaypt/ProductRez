// Core PM competencies & base bullet lexicons grounded in PM career ladders and hiring loops.

export const STRONG_VERBS = new Set(
  `launched shipped owned led drove defined built created designed established founded spearheaded scaled grew
   increased reduced cut improved accelerated delivered introduced pioneered architected transformed negotiated
   prioritized prioritised championed rebuilt redesigned migrated automated optimized optimised unified streamlined
   secured won landed expanded doubled tripled halved generated saved converted activated retained validated
   discovered identified aligned influenced mentored hired coached managed directed orchestrated operationalized
   monetized monetised productized productised rolled instituted overhauled consolidated simplified standardized
   standardised initiated formulated developed implemented executed deployed released piloted tested experimented
   analyzed analysed synthesized synthesised crafted authored drafted shaped steered reshaped turned repositioned
   evangelized evangelised sponsored incubated bootstrapped sourced partnered wrote ran made took won sold held
   set put found began brought taught spent chose gave got kept rose sought sent paid forged fostered reworked
   rewrote reran onboarded interviewed surveyed mapped scoped sized forecasted budgeted audited unblocked
   facilitated mediated documented specified instrumented benchmarked curated trained supervised sunsetted
   deprecated prototyped evaluated gated calibrated`
    .split(/\s+/)
    .filter(Boolean),
)

export const WEAK_OPENERS: RegExp[] = [
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
  /^\s*(coordinated|liaised)\s+with\b/i,
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
  'spearheaded various',
  'seasoned product',
]

export const FIRST_PERSON = /\b(I|my|me|myself|we|our)\b/

export const BUSINESS_METRIC_WORDS =
  /\b(retention|conversion|activation|churn|revenue|arr|mrr|gmv|nps|csat|dau|mau|wau|ltv|cac|arpu|aov|engagement|adoption|latency|p95|p99|margin|profit|cost|savings?|time[- ]to[- ](value|market|resolution|hire|first[- ]api[- ]call)|ttfac|ttv|ticket|tickets|funnel|signups?|sign-ups?|onboarding|nrr|bookings|pipeline|usage|throughput|uptime|sla|slo|defect|crash|attach rate|take rate|payback|growth|users?|customers?|sessions?|orders?|authorization rate|approval rate|fraud|deflect(ion|ed)?|hallucination|accuracy|precision|recall|eval)\b/i

const NUM = String.raw`\d[\d,]*(?:\.\d+)?`
export const METRIC_PATTERNS: RegExp[] = [
  new RegExp(String.raw`${NUM}\s?%`),
  new RegExp(String.raw`[$₹€£]\s?${NUM}\s?(?:k|m|mn|bn|b|cr|crore|lakh|lakhs|million|billion|thousand)?`, 'i'),
  new RegExp(String.raw`${NUM}\s?(?:x|×)\b`, 'i'),
  new RegExp(String.raw`\b${NUM}\s?(?:k|m|mn|bn|b|cr|crore|lakh|lakhs|million|billion|thousand)\+?\b`, 'i'),
  new RegExp(
    String.raw`\b${NUM}\+?\s+(?:[a-z-]+\s+){0,2}(?:users|customers|clients|teams|engineers|designers|markets|countries|stores|merchants|partners|sprints|weeks|months|days|hours|minutes|seconds|ms|stakeholders|reports|features|releases|launches|experiments|tests|interviews|apps|accounts|sellers|drivers|riders|students|employees|squads|pms|cases|prompts|evals|models|apis?|endpoints?|tickets?)\b`,
    'i',
  ),
  /\b(doubled|tripled|quadrupled|halved|10x|2x|3x)\b/i,
  /\bfrom\s+(?!the\b|a\b)[^,;]{1,28}\s+to\s+[^,;]{1,28}/i,
  /\b(#\s?1|top\s?\d+|99\.\d+%|p95|p99)\b/i,
]

/**
 * A change measured against a starting point: "from X to Y", "by 15%", "cut cost from", year-over-year. Lookarounds, not \b, because a
 * number often ends in "%" and \b never matches between "%" and a space.
 */
export const BASELINE_DELTA_PATTERN =
  /(?<![\w])(from\s+[^,;]{1,28}\s+to\s+[^,;]{1,28}|by\s+[$₹€£]?\d[\d,.]*\s?(?:%|x|×|k|m|mn|bn|cr|crore|lakhs?|million|billion)?|vs\.?\s+(?:prior|last|baseline|control)|year[- ]over[- ]year|yoy|qoq|mom|\+\d[\d,.]*\s?%|-\d[\d,.]*\s?%|cut\s+.{1,30}\s+from|lift(?:ed)?\s+.{1,30}\s+from|reduc(?:ed|ing)\s+.{1,30}\s+by|increas(?:ed|ing)\s+.{1,30}\s+by)(?![\w])/i

/** The bullet already carries its baseline: a percentage, a multiple, "doubled", "from X to Y" or a timeframe, so no extra before/after is needed. */
export const RELATIVE_CHANGE_PATTERN =
  /\d\s?%|\d\s?(?:x|×)(?![\w])|\b(?:doubled|tripled|quadrupled|halved)\b|\bfrom\s+[^,;]{1,28}\s+to\s+[^,;]{1,28}|\b(?:in|within|over)\s+(?:its\s+|the\s+)?(?:first\s+|last\s+|past\s+)?\d+\s*(?:days?|weeks?|months?|quarters?|years?)\b|\bQ[1-4]\b|\bFY\d{2}/i

/** Words that claim an effect. A bullet that says it improved something should say by how much; one that only describes work should not be forced to. */
export const IMPACT_CLAIM_PATTERN =
  /\b(?:(?:increas|improv|reduc|accelerat|decreas|elevat|eliminat|shorten|expand)(?:e|ed|es|ing)|(?:boost|lift|grow|cut|lower|save|streamline|maximi[sz]e|minimi[sz]e|optimi[sz]e|enhance|generate|scale|double|triple)(?:s|d|ed|ing)?|grew|drove|saving|savings|speed(?:ed|ing)?\s+up|significantly|substantially|dramatically|greatly)\b|\bdriving\s+\w+\s+(?:growth|adoption|conversion|retention|revenue|engagement|savings)\b/i

/** Describes what was built, designed, owned or led. These bullets show scope and ownership; a metric helps but is not what makes them good. */
export const BUILD_OR_LEAD_PATTERN =
  /\b(?:architect|design|built|build|develop|implement|engineer|creat|set\s+up|establish|integrat|migrat|instrument|defin|author|own|led|lead|manag|launch|ship|deliver|run|partner|collaborat|spearhead|orchestrat|introduc|rolled\s+out|stood\s+up)\w*\b.{0,120}\b(?:platform|pipeline|system|service|api|apis|architecture|infrastructure|framework|workflow|workflows|engine|tooling|toolchain|integration|schema|microservices?|sdk|dashboard|portal|roadmap|vision|strategy|process|playbook|program|programme|initiative|team|squad|organi[sz]ation|stakeholders|model|agent|agents|data\s+model|access\s+control|rbac|ledger|backend|front-end|frontend|stack|automation|engine)\b/i

export const CHANGE_WORDS =
  /\b(increase[ds]?|decrease[ds]?|reduce[ds]?|improve[ds]?|grew|grow(?:th|n|ing)?|boost(?:ed)?|lift(?:ed)?|cut|save[ds]?|drove|drive|raise[ds]?|lower(?:ed)?|accelerate[ds]?|generate[ds]?|achiev(?:ed|ing)|exceed(?:ed|ing)|surpass(?:ed|ing)|deflect(?:ed|ing)?|recover(?:ed|ing)?|up|down|by|from)\b/i

/** Guardrail pattern: proves PM balanced speed/cost/efficiency against quality, CSAT, latency, or fraud. */
export const GUARDRAIL_PATTERN =
  /\b(while\s+(?:holding|keeping|maintaining|preserving|protecting)|without\s+(?:degrading|hurting|impacting|increasing|sacrificing)|holding\s+\w+\s+flat|maintaining\s+99\.\d+%|with\s+(?:zero|0)\s+downtime|under\s+0?\.\d+%|guardrail|flat\s+(?:csat|nps|latency|churn)|regression)\b/i

export const AUTOMATION_EFFICIENCY_PATTERN =
  /\b(automat(ed|ing|ion)\s+(?:support|review|kyc|onboarding|workflow|triage|reporting|ticket|customer|manual)|deflect(ed|ing)?|cut\s+(?:manual|support|review|processing)|ai\s+copilot|chatbot|support\s+agent)\b/i

export interface CompetencyDef {
  id: string
  label: string
  pattern: RegExp
  interviewSignal: string
  missingHint: string
}

export const COMPETENCIES: CompetencyDef[] = [
  {
    id: 'discovery',
    label: 'Customer discovery',
    pattern:
      /\b(user research|customer interviews?|user interviews?|interviews?|surveys?|usability|customer insights?|jobs?[- ]to[- ]be[- ]done|jtbd|persona|pain points?|voice of (the )?customer|discovery|problem space|user feedback|field research|concept test|prototype test)/i,
    interviewSignal: 'Proves you validate user pain before committing engineering capacity.',
    missingHint: 'Show a decision driven by customer evidence (e.g. "Interviewed 25 merchants, cutting onboarding from 9 steps to 4").',
  },
  {
    id: 'strategy',
    label: 'Strategy & vision',
    pattern:
      /\b(strateg(y|ic|ies)|vision|positioning|business case|market (sizing|analysis|entry|opportunity)|tam\b|competitive (analysis|landscape)|north[- ]star|long[- ]term|multi[- ]year|portfolio|p&l|bet|differentiat|pricing model|monetization strategy)/i,
    interviewSignal: 'Shows you connect feature work to market positioning, moats, and business model.',
    missingHint: 'Highlight a strategic bet, rejected alternative, pricing pivot, or multi-quarter product vision.',
  },
  {
    id: 'prioritization',
    label: 'Prioritization & trade-offs',
    pattern:
      /\b(roadmap|prioriti[sz](e|ed|ing|ation)|backlog|rice\b|ice score|trade-?offs?|okrs?|kpis?|mvp|scope|sequenc(e|ed|ing)|cut scope|say(ing)? no|sunset|deprecated|killed|opportunity (cost|sizing))/i,
    interviewSignal: 'Hiring managers screen out "feature factories" by checking what you chose NOT to build.',
    missingHint: 'Call out an explicit trade-off, scope cut, or deprioritized bet and its measurable result.',
  },
  {
    id: 'execution',
    label: 'Execution & shipping',
    pattern:
      /\b(launch(ed)?|shipp?(ed|ing)|releas(e|ed|ing)|deliver(ed|ing)?|sprint|agile|scrum|kanban|prd\b|spec(s|ification)?|requirements|user stories|ga\b|beta|rollout|rolled out|go-live|milestone|unblock)/i,
    interviewSignal: 'Demonstrates reliability turning ambiguous specs into shipped software.',
    missingHint: 'Anchor shipped launches with scope, cadence, and post-launch adoption/impact.',
  },
  {
    id: 'data',
    label: 'Data & experimentation',
    pattern:
      /\b(a\/b|ab test|multivariate|experiment(s|ation)?|hypothes[ie]s|sql|analytics|funnel|cohort|dashboard|metrics?|amplitude|mixpanel|posthog|looker|tableau|heap|statsig|optimizely|statistical|stat[- ]sig|instrument(ed|ation)|retention curve|segment(ation)?|eval(s|uation)?|golden\s*(set|dataset)|llm[- ]as[- ]a[- ]judge|hallucination|precision|recall)\b/i,
    interviewSignal: 'Shows analytical rigor and comfort measuring probabilistic / user outcomes.',
    missingHint: 'Include an experiment or SQL/cohort insight with baseline → after numbers.',
  },
  {
    id: 'gtm',
    label: 'Go-to-market & growth',
    pattern:
      /\b(go[- ]to[- ]market|gtm|pricing|packaging|monetiz|adoption|enablement|sales|marketing|partners?(hips?)?|launch plan|positioning|acquisition|activation|onboarding|lifecycle|growth|conversion|plg|channel|nrr|expansion)/i,
    interviewSignal: 'Proves shipping is not the finish line — you drive adoption, pricing, and revenue.',
    missingHint: 'Tie launches to GTM levers: pricing tier, PLG activation, sales enablement, or ARR impact.',
  },
  {
    id: 'technical',
    label: 'Technical fluency',
    pattern:
      /\b(api(s)?\b|sdk|platform|architecture|machine learning|\bml\b|\bai\b|llm|genai|generative|rag\b|model(s)?\b|integration|infrastructure|microservices?|data pipeline|latency|scalab|migration|cloud|aws|gcp|azure|security|privacy|compliance|embedding|fine-?tun|webhook|oauth|sso)/i,
    interviewSignal: 'Confirms you can reason through technical constraints with staff engineers.',
    missingHint: 'Describe technical trade-offs (latency vs. cost, build vs. buy, API schema, RAG vs. fine-tuning).',
  },
  {
    id: 'leadership',
    label: 'Influence without authority',
    pattern:
      /\b(cross[- ]functional|stakeholders?|executives?|c-suite|leadership|mentor(ed|ing)?|coach(ed|ing)?|hired|hiring|aligned|alignment|influenc(e|ed|ing)|managed a team|led a team|squads?|orchestrat|negotiat|partnered with|escalat|buy-in|evangeli[sz]|rfc)/i,
    interviewSignal: 'Core PM differentiation: aligning Engineering, Design, Data, Legal, and GTM.',
    missingHint: 'State which cross-functional teams or exec stakeholders you aligned and what moved.',
  },
]

export const LEVEL_SIGNALS: Record<'senior' | 'lead', RegExp> = {
  senior:
    /\b(roadmap|strategy|strategic|okrs?|mentor|stakeholders?|executive|cross[- ]functional|multi[- ]team|multi[- ]squad|\d+\s+(?:squads?|teams?|regions?|countries|languages)|enterprise|arr\b|nrr\b|platform|portfolio|p&l|pricing|north[- ]star|vision|influenc|escalat|org[- ]wide|company[- ]wide|distributed)\b/i,
  lead:
    /\b(director|head of|vp\b|org(ani[sz]ation)?|portfolio|p&l|hired|hiring|built the (product )?team|managed (a )?(team|pms?|product managers)|reports?|multi[- ]year|vision|company[- ]wide|board|business unit|general manager|gm\b|c-suite|exec(utive)? team)\b/i,
}

export const TITLE_WORDS =
  /\b(manager|product|owner|lead|director|analyst|engineer|intern|associate|head|vp|vice president|founder|co-?founder|consultant|designer|developer|specialist|strategist|architect|officer|president|principal|apm|pm|scientist|coordinator|executive|fellow)\b/i

export const PM_TITLE_PATTERN =
  /\b(product manager|associate product manager|senior product manager|group product manager|principal product manager|staff product manager|director of product|head of product|vp of product|chief product officer|product owner|product lead|\bapm\b|\bgpm\b|\bcpo\b)\b/i
