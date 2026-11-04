// Shared by the browser, the local demo mode and the Supabase edge functions.
// Keep this folder free of DOM / Deno / Node specific imports.

export type Level = 'apm' | 'pm' | 'senior' | 'lead'
export type TargetLevel = Level | 'auto'

export interface Basics {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin: string
  website: string
}

export interface ExperienceItem {
  id: string
  company: string
  title: string
  location: string
  start: string
  end: string
  bullets: string[]
}

export interface ProjectItem {
  id: string
  name: string
  tag: string
  link: string
  bullets: string[]
}

export interface EducationItem {
  id: string
  school: string
  degree: string
  location: string
  start: string
  end: string
  details: string
}

export interface SkillGroup {
  id: string
  label: string
  items: string
}

export interface ResumeData {
  basics: Basics
  summary: string
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  skills: SkillGroup[]
  extras: { id: string; title: string; items: string[] }[]
}

export interface ParseResult {
  data: ResumeData
  /** Normalised full text, one logical line per entry */
  lines: string[]
  sectionsFound: string[]
  wordCount: number
}

export type DimensionId = 'impact' | 'ownership' | 'craft' | 'writing' | 'ats' | 'match'
export type Priority = 'P0' | 'P1' | 'P2'

export interface Dimension {
  id: DimensionId
  label: string
  /** 0-100 */
  score: number
  /** share of the overall score, 0-1 (already renormalised) */
  weight: number
  verdict: string
}

export interface Finding {
  id: string
  priority: Priority
  dimension: DimensionId
  title: string
  why: string
  fix: string
  evidence: string[]
  /** rough overall-score points this is worth */
  gain: number
}

export interface BulletReview {
  text: string
  section: 'experience' | 'projects' | 'other'
  context: string
  /** 0 weak … 3 strong */
  impact: 0 | 1 | 2 | 3
  words: number
  flags: BulletFlag[]
  competencies: string[]
}

export type BulletFlag =
  | 'no-metric'
  | 'weak-verb'
  | 'no-verb'
  | 'too-long'
  | 'too-short'
  | 'first-person'
  | 'passive'
  | 'buzzword'

export interface Competency {
  id: string
  label: string
  hits: number
  covered: boolean
}

export interface ScoreInput {
  text: string
  jobDescription?: string
  targetLevel?: TargetLevel
  source?: 'pdf' | 'paste' | 'docx'
  pageCount?: number
}

export interface KeywordMatch {
  matched: string[]
  missing: string[]
  percent: number
}

export interface ScoreReport {
  version: 1
  overall: number
  grade: 'prototype' | 'alpha' | 'beta' | 'ship'
  gradeLabel: string
  headline: string
  dimensions: Dimension[]
  findings: Finding[]
  strengths: string[]
  bullets: BulletReview[]
  competencies: Competency[]
  level: { detected: Level; target: Level; years: number; note: string }
  stats: {
    words: number
    bullets: number
    bulletsWithMetrics: number
    roles: number
    pages: number | null
  }
  keywordMatch: KeywordMatch | null
  parsed: ResumeData
}
