import { Link } from 'react-router-dom'
import { LegalPage } from '../components/MarketingChrome'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../data/site'

export function Methodology() {
  const rows: [string, string, string][] = [
    ['Impact & metrics', '30%', 'Share of bullets with a quantified outcome, how many show a before → after, and whether the first bullets under each role lead with results.'],
    ['Ownership & scope', '18%', 'Whether bullets open with ownership verbs (not “helped”, “responsible for”) and carry scope signals appropriate to the level you target.'],
    ['Product craft', '20%', 'Evidence for 8 PM competencies: discovery, strategy, prioritization, execution, data, go-to-market, technical fluency, influence.'],
    ['Writing clarity', '14%', 'Bullet length, repeated openers, buzzwords, first-person pronouns and passive voice.'],
    ['ATS & structure', '18%', 'Whether the text extracts cleanly: contact details, standard headings, parsable dates, page length, layout artefacts.'],
    ['Job match (optional)', '10%', 'Keyword overlap with a job description you paste in. When used, the other weights scale by 0.9.'],
  ]
  return (
    <LegalPage>
      <span className="eyebrow">Transparency</span>
      <h1>How scoring works</h1>
      <p style={{ fontSize: '1.08rem' }}>We’d rather you understand the score than trust it blindly. This is exactly what ProductRez measures, and what it can’t.</p>
      <h2>The rubric</h2>
      <table>
        <thead><tr><th>Dimension</th><th>Weight</th><th>What we check</th></tr></thead>
        <tbody>{rows.map(([a, b, c]) => <tr key={a}><td><b style={{ color: 'var(--text)' }}>{a}</b></td><td className="mono">{b}</td><td>{c}</td></tr>)}</tbody>
      </table>
      <p>Every dimension is scored 0–100, weighted, and shown with the exact bullets that drove it. Scores above 82 are compressed slightly so that only exceptional resumes approach 100.</p>
      <h2>Fix backlog priorities</h2>
      <ul>
        <li><b>P0</b>: blockers that can stop a human or a parser from reading your resume (unreadable text, no contact email, no experience section) or that are severe gaps (almost no quantified outcomes).</li>
        <li><b>P1</b>: meaningful improvements worth doing before you apply.</li>
        <li><b>P2</b>: polish.</li>
      </ul>
      <h2>Levels</h2>
      <p>We estimate your level (Associate, PM, Senior, Group/Director+) from years of experience and titles, then check that your bullets show the scope that level is hired for. You can override the target level when you score.</p>
      <h2>What the score is not</h2>
      <ul>
        <li><b>Not an “ATS pass rate”.</b> No real applicant tracking system publishes a 0–100 score, and recruiters differ in how they use them. We test what is testable: whether your text parses, whether the structure is standard, and whether your content shows what PM hiring managers screen for.</li>
        <li><b>Not a prediction of interviews.</b> We have not run outcome studies, so we make no claims about callback rates.</li>
        <li><b>Not a model of any specific company.</b> The rubric encodes widely shared PM hiring practice. It’s a rules-based analysis, not a company-specific or AI-judged verdict.</li>
        <li><b>Not a substitute for your judgement.</b> Add numbers only where they’re true. Our rewrite tool uses <span className="mono">[X%]</span> placeholders and never invents metrics.</li>
      </ul>
      <p style={{ marginTop: 24 }}><Link className="btn" to="/score">Score my resume, free</Link></p>
    </LegalPage>
  )
}

export function Privacy() {
  return (
    <LegalPage>
      <span className="eyebrow">Trust</span>
      <h1>Privacy</h1>
      <p className="faint">Plain-language summary · Last updated {LEGAL_UPDATED}</p>
      <h2>What happens to your resume</h2>
      <ul>
        <li>When you upload a PDF, the text is extracted <b>in your browser</b>. The file itself is never uploaded.</li>
        <li>To compute your score, the extracted text is sent to our scoring service. We keep your <b>latest score report</b>, which includes the parsed resume (name, contact details, experience), so you can revisit it. It’s visible only to your account.</li>
        <li>Resumes you build in the Writer are saved to your account so you can access them across devices (paid plans).</li>
        <li>If AI rewrites are enabled, the single bullet you ask about plus your role and level are sent to our AI provider to generate suggestions.</li>
      </ul>
      <h2>Other data</h2>
      <ul>
        <li><b>Account:</b> your email address, used for passwordless sign-in.</li>
        <li><b>Payments:</b> handled by Razorpay. We never see or store card or UPI details; we store the order, plan and payment id.</li>
        <li><b>Preferences</b> (market, level, theme) and learning progress are stored to personalise your experience.</li>
      </ul>
      <h2>What we don’t do</h2>
      <ul><li>We don’t sell your data or show you ads.</li><li>We don’t share your resume with employers or recruiters.</li></ul>
      <h2>Your choices</h2>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to export or delete your account and stored resumes.</p>
    </LegalPage>
  )
}

export function Terms() {
  return (
    <LegalPage>
      <span className="eyebrow">Trust</span>
      <h1>Terms of use</h1>
      <p className="faint">Plain-language summary · Last updated {LEGAL_UPDATED}</p>
      <h2>The service</h2>
      <p>ProductRez provides a resume scorer, a resume writer, a feed of public job listings and a curated learning library for product managers. It’s guidance, not a guarantee of interviews or offers.</p>
      <h2>Plans</h2>
      <ul>
        <li>Every account includes <b>one free resume score</b>.</li>
        <li>Paid plans are <b>one-time payments</b> in INR with no automatic renewal: 1 month (30 days) for ₹299, 6 months (182 days) for ₹599, and Lifetime for ₹999. Buying again while a plan is active adds time.</li>
        <li>“Lifetime” means for as long as ProductRez operates the service.</li>
      </ul>
      <h2>Job listings</h2>
      <p>Listings come from public postings and link to the original source. We don’t verify employers and aren’t affiliated with the platforms they appear on. Apply at your own discretion.</p>
      <h2>Your content</h2>
      <p>You own your resume. You’re responsible for the accuracy of what you submit to employers, including any numbers you add.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalPage>
  )
}
