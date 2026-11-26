import type { PmTrack } from '../types.ts'

export interface TrendingSkillDef {
  id: string
  label: string
  /** Tracks where this skill is core/high priority */
  highRelevanceTracks: PmTrack[]
  /** Term mentions (can be in Skills or Bullets) */
  mentionPattern: RegExp
  /** Deeper operational proof expected in Experience/Project bullets */
  proofPattern: RegExp
  suggestionIfMissing: string
  suggestionIfListedOnly: string
  exampleBullet: string
}

export const TRENDING_SKILLS_2026: TrendingSkillDef[] = [
  {
    id: 'ai_evals',
    label: 'AI Evals & Quality Guardrails',
    highRelevanceTracks: ['ai_ml', 'generalist', 'b2b_saas'],
    mentionPattern: /\b(evals?|evaluation|golden\s*(set|dataset)|llm[- ]as[- ]a[- ]judge|hallucination|guardrails?|regression\s*test|model\s*quality|pass\s*rate|human[- ]in[- ]the[- ]loop|hitl|failure\s*trace)\b/i,
    proofPattern: /\b(evals?|golden\s*(set|dataset)|llm[- ]as[- ]a[- ]judge|hallucination|guardrail|pass\s*rate|csat|accuracy|precision|recall|regression)\b.*\d|\d.*\b(evals?|golden\s*(set|dataset)|hallucination|pass\s*rate|accuracy|precision|recall)\b/i,
    suggestionIfMissing:
      'In 2026, an offline eval suite IS the AI PRD: hiring managers expect golden datasets, pass rates, LLM-as-a-judge rubrics, or guardrail metrics — not manual vibe checks.',
    suggestionIfListedOnly:
      'Avoid "AI-washing": move evals/AI quality out of your Skills list and prove it in a bullet with a pass rate or guardrail metric (e.g., ticket deflection while holding CSAT flat).',
    exampleBullet:
      'Defined a 300-case golden eval set and LLM-as-a-judge rubric gating 14 prompt releases, lifting pass rate from 62% to 88% and cutting hallucinations from 6.4% to 1.1% while holding CSAT at 4.6/5.',
  },
  {
    id: 'rapid_ai_prototyping',
    label: 'Rapid AI Prototyping (v0 / Lovable / Cursor / Claude Code)',
    highRelevanceTracks: ['ai_ml', 'generalist', 'growth_plg', 'b2b_saas'],
    mentionPattern: /\b(v0|lovable|cursor|claude\s*code|replit|bolt|streamlit|rapid\s*prototyp|ai\s*prototyp|coded\s*prototype|working\s*prototype|figma\s*make)\b/i,
    proofPattern: /\b(prototyp(e|ed|ing)|v0|lovable|cursor|claude\s*code|replit|streamlit)\b.*\b(\d+|users?|customers?|days?|weeks?|discovery|validated)\b/i,
    suggestionIfMissing:
      'Leading PMs in 2026 validate ideas with functional prototypes (v0, Lovable, Cursor, Streamlit) before committing engineering sprints.',
    suggestionIfListedOnly:
      'Show how rapid prototyping compressed your discovery cycle or validated demand with real customers before engineering build.',
    exampleBullet:
      'Cut discovery cycle from 3 weeks to 4 days by building 5 working prototypes in v0/Cursor and testing with 12 enterprise users before engineering commitment.',
  },
  {
    id: 'context_rag_agents',
    label: 'Context Engineering, RAG & Agentic Workflows',
    highRelevanceTracks: ['ai_ml', 'platform_api'],
    mentionPattern: /\b(rag\b|retrieval[- ]augmented|context\s*engineering|hybrid\s*search|rerank(ing|er)?|chunking|agent(s|ic)?|tool[- ]calling|tool\s*use|mcp\b|langgraph|prompt\s*orchestration|vector|embeddings?|fine[- ]tun)\b/i,
    proofPattern: /\b(rag\b|agent(s|ic)?|prompt|context\s*engineering|hybrid\s*search|rerank|chunking|mcp|embeddings?|fine[- ]tun)\b.*\b(\d+|deflect|latency|cost|adoption|users?|tickets?)\b/i,
    suggestionIfMissing:
      'Prompt engineering is table stakes in 2026; clarify context engineering choices (hybrid search, chunking, reranking, RAG vs. fine-tuning, agentic tool calling) tied to a business outcome.',
    suggestionIfListedOnly:
      'Listing "RAG / Agents / LLMs" in Skills triggers a screener BS check unless backed by a shipped workflow and user metric.',
    exampleBullet:
      'Shipped RAG-powered support agent with hybrid search and tool calling across 3 regions, resolving 31% of tier-1 queries autonomously and cutting median resolution time 44%.',
  },
  {
    id: 'ai_unit_economics',
    label: 'AI / Cloud Unit Economics (Latency & Cost Trade-offs)',
    highRelevanceTracks: ['ai_ml', 'platform_api', 'b2b_saas', 'fintech'],
    mentionPattern: /\b(token\s*(cost|yield|budget)|inference\s*(cost|latency)|unit\s*economics|gross\s*margin|model\s*routing|caching|p95|p99|ttft|time[- ]to[- ]first[- ]token|latency\s*vs)\b/i,
    proofPattern: /\b(token|inference|infra(structure)?|compute|latency|p95|p99|ttft|margin|cost)\b.*\d|\d.*\b(token|inference|latency|margin|cost)\b/i,
    suggestionIfMissing:
      'Hiring managers test whether PMs manage cost & latency trade-offs (model routing, caching, token budgets, gross margin), not just top-line shipping.',
    suggestionIfListedOnly:
      'Tie latency or inference cost directly to a trade-off you drove (e.g., routing simple queries to a smaller model to cut cost 35%).',
    exampleBullet:
      'Introduced tiered LLM routing and prompt caching, reducing inference cost per active user by 42% and p95 latency from 3.4s to 1.1s.',
  },
  {
    id: 'plg_monetization',
    label: 'PLG, Pricing & Monetization Loops',
    highRelevanceTracks: ['growth_plg', 'b2b_saas', 'generalist'],
    mentionPattern: /\b(plg|product[- ]led\s*growth|usage[- ]based|pricing|packaging|paywall|self[- ]serve|freemium|trial[- ]to[- ]paid|nrr|expansion\s*revenue)\b/i,
    proofPattern: /\b(pricing|packaging|paywall|self[- ]serve|plg|freemium|trial[- ]to[- ]paid|usage[- ]based)\b.*\d|\d.*\b(arr|nrr|conversion|churn|revenue|trial[- ]to[- ]paid)\b/i,
    suggestionIfMissing:
      'Monetization & self-serve PLG proficiency (pricing tests, packaging tiers, activation-to-paid) strongly differentiates commercial PMs.',
    suggestionIfListedOnly:
      'Connect pricing or self-serve PLG directly to conversion, ARPU, or NRR lift.',
    exampleBullet:
      'Launched usage-based pricing for 12,000 SMB accounts, adding $2.4M ARR and lifting trial-to-paid conversion from 3.4% to 4.9% in two quarters.',
  },
]

/** Detects "AI-washing": claiming AI/LLM in summary or skills without proving it in experience/projects */
export const AI_CLAIM_PATTERN = /\b(ai\s*product|genai|generative\s*ai|llm|large\s*language|rag\b|agentic|prompt\s*engineering|machine\s*learning)\b/i
