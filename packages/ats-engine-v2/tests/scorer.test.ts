import { describe, expect, it } from 'vitest'
import {
  EXCLUDED_INPUTS,
  INPUT_SCHEMA,
  checkResume,
  compareSalaryExpectations,
  parseResume,
  reviewBullet,
  scoreResume,
} from '../src/index.ts'
import {
  MULTI_COL_ARTIFACT_RESUME,
  STRONG_AI_PM,
  SWITCHER_ENGINEER_NO_PROJECTS,
  WEAK_FEATURE_FACTORY_AI_WASHED,
} from './fixtures.ts'

const NOW = new Date('2026-11-26')

describe('KB & Input Schema', () => {
  it('defines clear required, context, and excluded inputs', () => {
    expect(INPUT_SCHEMA.some((f) => f.key === 'track')).toBe(true)
    expect(INPUT_SCHEMA.some((f) => f.key === 'companyArchetype')).toBe(true)
    expect(INPUT_SCHEMA.some((f) => f.key === 'market')).toBe(true)
    expect(EXCLUDED_INPUTS.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Parser & Artifacts', () => {
  it('extracts contact, portfolio, roles, and months cleanly', () => {
    const p = parseResume(STRONG_AI_PM, NOW)
    expect(p.data.basics.name).toBe('Priya Nair')
    expect(p.data.basics.email).toBe('priya.nair@example.com')
    expect(p.data.basics.portfolio).toContain('priyanair.notion.site')
    expect(p.data.experience).toHaveLength(2)
    expect(p.data.experience[0].months).toBeGreaterThan(36)
  })

  it('flags PII, bare PM abbreviations, and multi-column/glyph artifacts', () => {
    const pWeak = parseResume(WEAK_FEATURE_FACTORY_AI_WASHED, NOW)
    expect(pWeak.artifacts.piiWarnings.length).toBeGreaterThanOrEqual(2)
    expect(pWeak.artifacts.rawAbbreviationsOnlyPm).toBe(true)

    const pMulti = parseResume(MULTI_COL_ARTIFACT_RESUME, NOW)
    expect(pMulti.artifacts.multiColumnSuspected).toBe(true)
    expect(pMulti.artifacts.weirdChars).toBeGreaterThan(0)
  })
})

describe('Bullet Review & Guardrails', () => {
  it('awards impact 3 for metric + business outcome + baseline delta', () => {
    const r = reviewBullet(
      'Defined an LLM-as-a-judge evaluation suite gating 14 prompt releases, cutting hallucination rate from 6.4% to 1.1%',
      'experience',
      'CloudDesk AI',
      0,
      true,
      'ai_ml',
    )
    expect(r.impact).toBe(3)
    expect(r.hasBaselineDelta).toBe(true)
    expect(r.competencies).toContain('data')
    expect(r.trendingSignals).toContain('ai_evals')
  })

  it('flags automation claims that omit a quality/CSAT guardrail', () => {
    const r = reviewBullet(
      'Automated tier-1 support workflows, deflecting 40% of customer tickets',
      'experience',
      'Acme',
      0,
      true,
      'ai_ml',
    )
    expect(r.flags).toContain('missing-guardrail')

    const withGuardrail = reviewBullet(
      'Shipped RAG support copilot deflecting 31% of tier-1 tickets while holding CSAT flat at 4.6/5',
      'experience',
      'Acme',
      0,
      true,
      'ai_ml',
    )
    expect(withGuardrail.flags).not.toContain('missing-guardrail')
  })
})

describe('Rule-Based PM ATS Scorer', () => {
  it('scores strong 2026 AI PM dramatically higher than weak AI-washed resume', () => {
    const strong = scoreResume(
      {
        text: STRONG_AI_PM,
        targetLevel: 'senior',
        pmExperience: '5_8',
        track: 'ai_ml',
        companyArchetype: 'scaleup',
        market: 'us',
        pageCount: 1,
      },
      NOW,
    )
    const weak = scoreResume(
      {
        text: WEAK_FEATURE_FACTORY_AI_WASHED,
        targetLevel: 'pm',
        pmExperience: '2_5',
        track: 'ai_ml',
        companyArchetype: 'maang',
        market: 'us',
        pageCount: 2,
      },
      NOW,
    )

    expect(strong.overall).toBeGreaterThanOrEqual(80)
    expect(weak.overall).toBeLessThan(50)
    expect(strong.overall - weak.overall).toBeGreaterThan(30)

    // Weak resume catches AI-washing, feature factory, PII, and bare PM title
    const findingIds = weak.findings.map((f) => f.kbRuleId)
    expect(findingIds).toContain('ai_washing')
    expect(findingIds).toContain('feature_factory')
    expect(findingIds).toContain('pii_market')
    expect(findingIds).toContain('page_count')
    expect(findingIds).toContain('lever_title_boolean')
  })

  it('weights sum to exactly 1.0 across all company archetypes with and without JD', () => {
    for (const companyArchetype of ['early_startup', 'scaleup', 'maang', 'enterprise'] as const) {
      const noJd = scoreResume({ text: STRONG_AI_PM, companyArchetype }, NOW)
      const withJd = scoreResume(
        {
          text: STRONG_AI_PM,
          companyArchetype,
          jobDescription:
            'Looking for a Senior Product Manager with 5+ years of product management experience in AI, LLM evals, RAG, SQL, A/B testing, RBAC, SSO, pricing, and cross-functional stakeholder alignment.',
        },
        NOW,
      )
      expect(noJd.dimensions.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(1, 5)
      expect(withJd.dimensions.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(1, 5)
      expect(withJd.dimensions.some((d) => d.id === 'jd_match')).toBe(true)
    }
  })

  it('calibrates engineering switcher properly instead of misclassifying as senior PM', () => {
    const r = scoreResume(
      {
        text: SWITCHER_ENGINEER_NO_PROJECTS,
        targetLevel: 'auto',
        pmExperience: 'transitioning',
        background: 'engineering',
        market: 'india',
      },
      NOW,
    )
    expect(r.contextUsed.level).toBe('apm')
    expect(r.contextUsed.totalYears).toBeGreaterThan(3)
    expect(r.findings.some((f) => f.kbRuleId === 'transition_projects')).toBe(true)
  })

  it('enforces Greenhouse 2.5 MB limit & Remote timezone/async checks', () => {
    const r = scoreResume(
      {
        text: SWITCHER_ENGINEER_NO_PROJECTS,
        market: 'remote_global',
        fileSizeBytes: 3.1 * 1024 * 1024,
        pageCount: 2,
      },
      NOW,
    )
    const ids = r.findings.map((f) => f.kbRuleId)
    expect(ids).toContain('greenhouse_size')
    expect(ids).toContain('page_count')
    expect(r.kbInsights.some((k) => k.id === 'market_remote' && k.status !== 'present')).toBe(true)

    const remoteStrong = scoreResume({ text: STRONG_AI_PM, market: 'remote_global' }, NOW)
    expect(remoteStrong.kbInsights.find((k) => k.id === 'market_remote')?.status).toBe('present')
  })

  it('audits JD skills placement (proven in bullets vs skills-only) and YOE gap', () => {
    const jd = `
      Senior Product Manager (8+ years of product management experience required)
      Must have: Kubernetes, RAG, Evals, Pricing, Go-to-Market, SQL, Experimentation, Roadmapping
    `
    const r = scoreResume(
      {
        text: SWITCHER_ENGINEER_NO_PROJECTS,
        pmExperience: 'transitioning',
        targetRoleTitle: 'Senior Product Manager',
        jobDescription: jd,
      },
      NOW,
    )
    expect(r.keywordMatch).not.toBeNull()
    expect(r.keywordMatch!.matchedSkillsOnly).toContain('kubernetes')
    expect(r.keywordMatch!.seniorityMismatch).toContain('8+')
    expect(r.findings.some((f) => f.kbRuleId === 'jd_yoe_gap')).toBe(true)
  })

  it('is 100% deterministic across repeated runs and rejects non-resumes', () => {
    const a = scoreResume({ text: STRONG_AI_PM, track: 'ai_ml' }, NOW)
    const b = scoreResume({ text: STRONG_AI_PM, track: 'ai_ml' }, NOW)
    expect(a).toEqual(b)

    expect(checkResume('hello world').ok).toBe(false)
    expect(checkResume(STRONG_AI_PM).ok).toBe(true)
  })
})

describe('Career Analysis, Market Standing & Compensation Benchmark', () => {
  it('generates structured career positives, negatives, and market standing', () => {
    const strong = scoreResume(
      {
        text: STRONG_AI_PM,
        targetLevel: 'senior',
        track: 'ai_ml',
        companyArchetype: 'scaleup',
        market: 'us',
      },
      NOW,
    )
    expect(strong.careerAnalysis.positives.length).toBeGreaterThanOrEqual(2)
    expect(strong.marketStanding.percentile).toBeGreaterThanOrEqual(80)
    expect(strong.marketStanding.trackReadiness).toHaveLength(6)
    expect(strong.marketStanding.trackReadiness[0].readinessScore).toBeGreaterThanOrEqual(
      strong.marketStanding.trackReadiness[5].readinessScore,
    )

    const weak = scoreResume(
      {
        text: WEAK_FEATURE_FACTORY_AI_WASHED,
        targetLevel: 'pm',
        track: 'ai_ml',
        companyArchetype: 'maang',
        market: 'india',
      },
      NOW,
    )
    expect(weak.careerAnalysis.negatives.length).toBeGreaterThanOrEqual(2)
    expect(weak.marketStanding.percentile).toBeLessThan(40)
  })

  it('computes salary bands and expectation verdicts without ever altering the resume score', () => {
    const base = scoreResume(
      {
        text: STRONG_AI_PM,
        targetLevel: 'senior',
        track: 'ai_ml',
        companyArchetype: 'scaleup',
        market: 'india',
      },
      NOW,
    )
    const withSalaries = scoreResume(
      {
        text: STRONG_AI_PM,
        targetLevel: 'senior',
        track: 'ai_ml',
        companyArchetype: 'scaleup',
        market: 'india',
        currentSalary: 24,
        expectedSalary: 52,
      },
      NOW,
    )

    expect(withSalaries.overall).toBe(base.overall)
    expect(withSalaries.compensation.currency).toBe('INR')
    expect(withSalaries.compensation.comparison?.currentSalary?.verdict).toBe('significantly_underpaid')
    expect(withSalaries.compensation.comparison?.expectedSalary?.verdict).toBe('achievable')

    const inflated = compareSalaryExpectations(base, { currentSalary: 56, expectedSalary: 78 })
    expect(inflated.comparison?.currentSalary?.verdict).toBe('good')
    expect(inflated.comparison?.expectedSalary?.verdict).toBe('inflated')

    const easy = compareSalaryExpectations(base, { currentSalary: 25, expectedSalary: 35 })
    expect(easy.comparison?.expectedSalary?.verdict).toBe('easy')
  })

  it('detects Claude Code under Rapid AI Prototyping trending skill', () => {
    const resumeWithClaudeCode = STRONG_AI_PM.replace(/v0\/Cursor/g, 'Claude Code')
    const r = scoreResume({ text: resumeWithClaudeCode, track: 'ai_ml' }, NOW)
    const proto = r.trendingSkills.find((t) => t.id === 'rapid_ai_prototyping')
    expect(proto?.status).toBe('proven_in_bullets')
  })
})
