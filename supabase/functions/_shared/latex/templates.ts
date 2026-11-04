import type { ResumeData } from '../scoring/types.ts'
import { escapeLatex, escapeUrl, inline } from './escape.ts'

export type SectionKey = 'summary' | 'experience' | 'projects' | 'education' | 'skills' | 'extras'

export interface BuildOptions {
  paper: 'a4' | 'letter'
  fontSize: 10 | 11
  accent: string // hex without #
  boldMetrics: boolean
}

export interface TemplateMeta {
  id: string
  name: string
  tagline: string
  bestFor: string
  accentDefault: string
  accentChoices: string[]
  order: SectionKey[]
  /** CSS font stacks for the live preview */
  previewFont: string
  headingStyle: 'rule' | 'caps' | 'bar' | 'center' | 'plain'
  align: 'left' | 'center'
  dense?: boolean
  fontSize: 10 | 11
}

const DEFAULT_ORDER: SectionKey[] = ['summary', 'experience', 'projects', 'education', 'skills', 'extras']

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'ledger',
    name: 'Ledger',
    tagline: 'The classic that recruiters actually like',
    bestFor: 'Everyone · safest pick for big tech & enterprise',
    accentDefault: '111111',
    accentChoices: ['111111', '1F3A5F', '7A1F2B'],
    order: DEFAULT_ORDER,
    previewFont: '"Latin Modern Roman","CMU Serif","Computer Modern",Georgia,"Times New Roman",serif',
    headingStyle: 'rule',
    align: 'center',
    fontSize: 11,
  },
  {
    id: 'roadmap',
    name: 'Roadmap',
    tagline: 'Modern sans with a confident accent line',
    bestFor: 'PMs at startups & scale-ups',
    accentDefault: 'E8590C',
    accentChoices: ['E8590C', '1C7ED6', '2F9E44', '6741D9'],
    order: DEFAULT_ORDER,
    previewFont: '"TeX Gyre Heros","Helvetica Neue",Helvetica,Arial,sans-serif',
    headingStyle: 'caps',
    align: 'left',
    fontSize: 10,
  },
  {
    id: 'sprint',
    name: 'Sprint',
    tagline: 'Dense, one-page, nothing wasted',
    bestFor: '8+ years of experience that must fit one page',
    accentDefault: '1F3A5F',
    accentChoices: ['1F3A5F', '111111', '0B7285'],
    order: DEFAULT_ORDER,
    previewFont: '"TeX Gyre Heros","Helvetica Neue",Helvetica,Arial,sans-serif',
    headingStyle: 'rule',
    align: 'left',
    dense: true,
    fontSize: 10,
  },
  {
    id: 'northstar',
    name: 'Northstar',
    tagline: 'Elegant serif with a centred masthead',
    bestFor: 'Senior PMs, Group PMs and Directors',
    accentDefault: '7A1F2B',
    accentChoices: ['7A1F2B', '1F3A5F', '111111'],
    order: DEFAULT_ORDER,
    previewFont: '"TeX Gyre Pagella","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif',
    headingStyle: 'center',
    align: 'center',
    fontSize: 11,
  },
  {
    id: 'launchpad',
    name: 'Launchpad',
    tagline: 'Education & projects first, built to prove potential',
    bestFor: 'APMs, new grads and career switchers',
    accentDefault: '0B7285',
    accentChoices: ['0B7285', 'E8590C', '5F3DC4', '2B8A3E'],
    order: ['summary', 'education', 'projects', 'experience', 'skills', 'extras'],
    previewFont: '"Latin Modern Sans","CMU Sans Serif","Helvetica Neue",Helvetica,Arial,sans-serif',
    headingStyle: 'bar',
    align: 'left',
    fontSize: 10,
  },
  {
    id: 'ink',
    name: 'Ink',
    tagline: 'Understated Times-style, zero decoration',
    bestFor: 'Conservative companies, finance & consulting-heavy PM roles',
    accentDefault: '111111',
    accentChoices: ['111111'],
    order: DEFAULT_ORDER,
    previewFont: '"TeX Gyre Termes","Times New Roman",Times,serif',
    headingStyle: 'plain',
    align: 'left',
    fontSize: 11,
  },
]

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]

const nonEmpty = (s: string | undefined) => !!s && s.trim().length > 0

function geometry(id: string, o: BuildOptions) {
  const paper = o.paper === 'a4' ? 'a4paper' : 'letterpaper'
  const margins: Record<string, string> = {
    ledger: 'top=0.55in,bottom=0.5in,left=0.65in,right=0.65in',
    roadmap: 'top=0.55in,bottom=0.5in,left=0.7in,right=0.7in',
    sprint: 'top=0.4in,bottom=0.4in,left=0.5in,right=0.5in',
    northstar: 'top=0.6in,bottom=0.55in,left=0.75in,right=0.75in',
    launchpad: 'top=0.5in,bottom=0.5in,left=0.65in,right=0.65in',
    ink: 'top=0.6in,bottom=0.55in,left=0.8in,right=0.8in',
  }
  return `\\usepackage[${paper},${margins[id]}]{geometry}`
}

const FONTS: Record<string, string> = {
  ledger: '\\usepackage{lmodern}',
  roadmap: '\\usepackage[scale=0.96]{tgheros}\n\\renewcommand{\\familydefault}{\\sfdefault}',
  sprint: '\\usepackage[scale=0.95]{tgheros}\n\\renewcommand{\\familydefault}{\\sfdefault}',
  northstar: '\\usepackage{tgpagella}',
  launchpad: '\\usepackage{lmodern}\n\\renewcommand{\\familydefault}{\\sfdefault}',
  ink: '\\usepackage{tgtermes}',
}

/** Per-template macro definitions. The body generator only calls these macros. */
/** A function, not a constant: tagged templates (String.raw) count as side effects and would otherwise be bundled into the browser. */
const macros = (): Record<string, string> => ({
  ledger: String.raw`
\newcommand{\rzname}[1]{{\centering{\Huge\scshape\bfseries #1}\par}\vspace{3pt}}
\newcommand{\rzheadline}[1]{{\centering{\large #1}\par}\vspace{1pt}}
\newcommand{\rzcontact}[1]{{\centering{\small #1}\par}}
\newcommand{\rzsection}[1]{\vspace{8pt}\noindent{\large\scshape\bfseries #1}\par\vspace{-5pt}\noindent\rule{\linewidth}{0.6pt}\par\vspace{3pt}}
\newcommand{\rzrole}[4]{\noindent\textbf{#1}\hfill #2\par\noindent\textit{#3}\hfill\textit{#4}\par\vspace{1pt}}
\newcommand{\rzroleone}[2]{\noindent\textbf{#1}\hfill #2\par\vspace{1pt}}
\newcommand{\rzskill}[2]{\noindent\textbf{#1:} #2\par\vspace{1pt}}
`,
  roadmap: String.raw`
\newcommand{\rzname}[1]{{\fontsize{26}{28}\selectfont\bfseries\color{accent} #1}\par\vspace{2pt}}
\newcommand{\rzheadline}[1]{{\large\color{black!70} #1}\par\vspace{2pt}}
\newcommand{\rzcontact}[1]{{\small\color{black!80} #1}\par}
\newcommand{\rzsection}[1]{\vspace{9pt}\noindent{\bfseries\color{accent}\MakeUppercase{#1}}\par\vspace{-4pt}\noindent{\color{accent}\rule{\linewidth}{1pt}}\par\vspace{3pt}}
\newcommand{\rzrole}[4]{\noindent\textbf{#1}\hfill {\small #2}\par\noindent{\color{black!75}#3}\hfill{\small\color{black!75}#4}\par\vspace{1pt}}
\newcommand{\rzroleone}[2]{\noindent\textbf{#1}\hfill {\small #2}\par\vspace{1pt}}
\newcommand{\rzskill}[2]{\noindent\textbf{#1:} #2\par\vspace{1pt}}
`,
  sprint: String.raw`
\newcommand{\rzname}[1]{{\LARGE\bfseries #1}\par\vspace{1pt}}
\newcommand{\rzheadline}[1]{{\normalsize\color{accent}\bfseries #1}\par\vspace{1pt}}
\newcommand{\rzcontact}[1]{{\footnotesize #1}\par}
\newcommand{\rzsection}[1]{\vspace{5pt}\noindent{\small\bfseries\color{accent}\MakeUppercase{#1}}\par\vspace{-3pt}\noindent{\color{accent}\rule{\linewidth}{0.5pt}}\par\vspace{2pt}}
\newcommand{\rzrole}[4]{\noindent\textbf{#1}\hfill {\small #2}\par\noindent{\small\textit{#3}}\hfill{\small\textit{#4}}\par}
\newcommand{\rzroleone}[2]{\noindent\textbf{#1}\hfill {\small #2}\par}
\newcommand{\rzskill}[2]{\noindent\textbf{#1:} #2\par}
`,
  northstar: String.raw`
\newcommand{\rzname}[1]{\begin{center}{\fontsize{24}{26}\selectfont\scshape #1}\end{center}\vspace{-14pt}}
\newcommand{\rzheadline}[1]{\begin{center}{\itshape #1}\end{center}\vspace{-12pt}}
\newcommand{\rzcontact}[1]{\begin{center}{\small #1}\end{center}\vspace{-6pt}\noindent{\color{accent}\rule{\linewidth}{0.8pt}}\par}
\newcommand{\rzsection}[1]{\vspace{8pt}\begin{center}{\large\scshape\bfseries\color{accent} #1}\end{center}\vspace{-14pt}\noindent\rule{\linewidth}{0.3pt}\par\vspace{3pt}}
\newcommand{\rzrole}[4]{\noindent\textbf{#1}\hfill #2\par\noindent\textit{#3}\hfill\textit{#4}\par\vspace{1pt}}
\newcommand{\rzroleone}[2]{\noindent\textbf{#1}\hfill #2\par\vspace{1pt}}
\newcommand{\rzskill}[2]{\noindent\textbf{#1:} #2\par\vspace{1pt}}
`,
  launchpad: String.raw`
\newcommand{\rzname}[1]{{\fontsize{25}{27}\selectfont\bfseries #1}\par\vspace{1pt}}
\newcommand{\rzheadline}[1]{{\large\color{accent}\bfseries #1}\par\vspace{2pt}}
\newcommand{\rzcontact}[1]{{\small #1}\par}
\newcommand{\rzsection}[1]{\vspace{8pt}\noindent\colorbox{accent}{\parbox{\dimexpr\linewidth-2\fboxsep}{\color{white}\bfseries\MakeUppercase{#1}}}\par\vspace{3pt}}
\newcommand{\rzrole}[4]{\noindent\textbf{#1}\hfill #2\par\noindent{\color{accent}\textbf{#3}}\hfill{\small #4}\par\vspace{1pt}}
\newcommand{\rzroleone}[2]{\noindent\textbf{#1}\hfill #2\par\vspace{1pt}}
\newcommand{\rzskill}[2]{\noindent\textbf{#1:} #2\par\vspace{1pt}}
`,
  ink: String.raw`
\newcommand{\rzname}[1]{{\LARGE\bfseries #1}\par\vspace{2pt}}
\newcommand{\rzheadline}[1]{{\itshape #1}\par\vspace{1pt}}
\newcommand{\rzcontact}[1]{{\small #1}\par}
\newcommand{\rzsection}[1]{\vspace{9pt}\noindent{\bfseries\MakeUppercase{#1}}\par\vspace{2pt}}
\newcommand{\rzrole}[4]{\noindent\textbf{#1}\hfill #2\par\noindent\textit{#3}\hfill\textit{#4}\par\vspace{1pt}}
\newcommand{\rzroleone}[2]{\noindent\textbf{#1}\hfill #2\par\vspace{1pt}}
\newcommand{\rzskill}[2]{\noindent\textbf{#1:} #2\par\vspace{1pt}}
`,
})

const LIST: Record<string, string> = {
  default: '\\setlist[itemize]{leftmargin=1.2em,itemsep=1.2pt,topsep=2pt,parsep=0pt,partopsep=0pt,label={\\textbullet}}',
  sprint: '\\setlist[itemize]{leftmargin=1.1em,itemsep=0.4pt,topsep=1pt,parsep=0pt,partopsep=0pt,label={\\textbullet}}',
}

function preamble(meta: TemplateMeta, o: BuildOptions, d: ResumeData) {
  const title = escapeLatex(`${d.basics.name || 'Resume'} - Resume`)
  const author = escapeLatex(d.basics.name || '')
  return String.raw`%% Generated by ProductRez - ${meta.name} template
%% Single column, standard fonts, real text layer: built to survive ATS parsing.
%% Compile with pdfLaTeX (Overleaf: Menu > Compiler > pdfLaTeX).
\documentclass[${o.fontSize}pt]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{cmap}
${FONTS[meta.id]}
${geometry(meta.id, o)}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage[hidelinks,pdftitle={${title}},pdfauthor={${author}}]{hyperref}
\definecolor{accent}{HTML}{${/^[0-9a-fA-F]{6}$/.test(o.accent) ? o.accent.toUpperCase() : meta.accentDefault}}
\input{glyphtounicode}
\pdfgentounicode=1
\pagestyle{empty}
\setlength{\parindent}{0pt}
\raggedright
\raggedbottom
${meta.dense ? LIST.sprint : LIST.default}
${macros()[meta.id].trim()}
`
}

function contactLine(d: ResumeData): string {
  const b = d.basics
  const parts: string[] = []
  if (nonEmpty(b.email)) parts.push(`\\href{mailto:${escapeUrl(b.email)}}{${escapeLatex(b.email)}}`)
  if (nonEmpty(b.phone)) parts.push(escapeLatex(b.phone))
  if (nonEmpty(b.location)) parts.push(escapeLatex(b.location))
  const link = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)
  const show = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
  if (nonEmpty(b.linkedin)) parts.push(`\\href{${escapeUrl(link(b.linkedin))}}{${escapeLatex(show(b.linkedin))}}`)
  if (nonEmpty(b.website)) parts.push(`\\href{${escapeUrl(link(b.website))}}{${escapeLatex(show(b.website))}}`)
  return parts.join(' \\textbar{} ')
}

function items(bullets: string[], o: BuildOptions): string {
  const rows = bullets.map((b) => b.trim()).filter(Boolean)
  if (!rows.length) return ''
  return `\\begin{itemize}\n${rows.map((b) => `  \\item ${inline(b, o.boldMetrics)}`).join('\n')}\n\\end{itemize}\n`
}

const dates = (s: string, e: string) => [s, e].filter(nonEmpty).map((x) => escapeLatex(x.trim())).join(' -- ')

export function buildLatex(d: ResumeData, templateId: string, opts?: Partial<BuildOptions>): string {
  const meta = templateById(templateId)
  const o: BuildOptions = {
    paper: opts?.paper ?? 'letter',
    fontSize: opts?.fontSize ?? meta.fontSize,
    accent: opts?.accent ?? meta.accentDefault,
    boldMetrics: opts?.boldMetrics ?? false,
  }
  const sections: Record<SectionKey, () => string> = {
    summary: () => (nonEmpty(d.summary) ? `\\rzsection{Summary}\n${inline(d.summary.trim(), o.boldMetrics)}\n` : ''),
    experience: () => {
      const xs = d.experience.filter((x) => nonEmpty(x.company) || nonEmpty(x.title) || x.bullets.some(nonEmpty))
      if (!xs.length) return ''
      return (
        '\\rzsection{Experience}\n' +
        xs
          .map((x) => {
            const head = nonEmpty(x.company)
              ? `\\rzrole{${escapeLatex(x.company)}}{${dates(x.start, x.end)}}{${escapeLatex(x.title)}}{${escapeLatex(x.location)}}`
              : `\\rzroleone{${escapeLatex(x.title)}}{${dates(x.start, x.end)}}`
            return `${head}\n${items(x.bullets, o)}`
          })
          .join('\\vspace{3pt}\n')
      )
    },
    projects: () => {
      const ps = d.projects.filter((p) => nonEmpty(p.name) || p.bullets.some(nonEmpty))
      if (!ps.length) return ''
      return (
        '\\rzsection{Projects}\n' +
        ps
          .map((p) => {
            const title = escapeLatex(p.name) + (nonEmpty(p.tag) ? ` \\textbar{} \\textit{${escapeLatex(p.tag)}}` : '')
            const link = nonEmpty(p.link) ? `\\href{${escapeUrl(/^https?:\/\//i.test(p.link) ? p.link : `https://${p.link}`)}}{${escapeLatex(p.link.replace(/^https?:\/\/(www\.)?/i, ''))}}` : ''
            return `\\rzroleone{${title}}{${link}}\n${items(p.bullets, o)}`
          })
          .join('\\vspace{3pt}\n')
      )
    },
    education: () => {
      const es = d.education.filter((e) => nonEmpty(e.school) || nonEmpty(e.degree))
      if (!es.length) return ''
      return (
        '\\rzsection{Education}\n' +
        es
          .map((e) => {
            const det = e.details
              .split(/[;\n]/)
              .map((x) => x.trim())
              .filter(Boolean)
            return `\\rzrole{${escapeLatex(e.school)}}{${dates(e.start, e.end)}}{${escapeLatex(e.degree)}}{${escapeLatex(e.location)}}\n${det.length ? items(det, o) : ''}`
          })
          .join('\\vspace{2pt}\n')
      )
    },
    skills: () => {
      const ss = d.skills.filter((s) => nonEmpty(s.items))
      if (!ss.length) return ''
      return '\\rzsection{Skills}\n' + ss.map((s) => `\\rzskill{${escapeLatex(s.label || 'Skills')}}{${escapeLatex(s.items)}}`).join('\n') + '\n'
    },
    extras: () => {
      const xs = d.extras.filter((x) => x.items.some(nonEmpty))
      if (!xs.length) return ''
      return xs.map((x) => `\\rzsection{${escapeLatex(x.title || 'Additional')}}\n${items(x.items, o)}`).join('')
    },
  }

  const header = [
    `\\rzname{${escapeLatex(d.basics.name || 'Your Name')}}`,
    nonEmpty(d.basics.headline) ? `\\rzheadline{${escapeLatex(d.basics.headline)}}` : '',
    `\\rzcontact{${contactLine(d)}}`,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    preamble(meta, o, d),
    '\\begin{document}',
    header,
    ...meta.order.map((k) => sections[k]()).filter(Boolean),
    '\\end{document}',
    '',
  ].join('\n')
}

/** Plain-text export (for ATS portals that ask you to paste your resume). */
export function buildPlainText(d: ResumeData): string {
  const b = d.basics
  const out: string[] = [b.name, b.headline, [b.email, b.phone, b.location, b.linkedin, b.website].filter(Boolean).join(' | ')].filter(Boolean)
  const section = (t: string, lines: string[]) => lines.length && out.push('', t.toUpperCase(), ...lines)
  if (d.summary) section('Summary', [d.summary])
  section(
    'Experience',
    d.experience.flatMap((x) => [`${[x.title, x.company].filter(Boolean).join(', ')}${x.start ? ` (${[x.start, x.end].filter(Boolean).join(' - ')})` : ''}`, ...x.bullets.map((t) => `- ${t.replace(/\*\*/g, '')}`)]),
  )
  section('Projects', d.projects.flatMap((p) => [p.name, ...p.bullets.map((t) => `- ${t.replace(/\*\*/g, '')}`)]))
  section('Education', d.education.map((e) => [e.degree, e.school, [e.start, e.end].filter(Boolean).join(' - ')].filter(Boolean).join(', ')))
  section('Skills', d.skills.map((s) => `${s.label}: ${s.items}`))
  return out.join('\n')
}

