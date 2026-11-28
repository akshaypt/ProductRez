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
        <tbody>{rows.map(([a, b, c]) => <tr key={a}><td data-l="Dimension"><b style={{ color: 'var(--text)' }}>{a}</b></td><td data-l="Weight" className="mono">{b}</td><td data-l="What we check">{c}</td></tr>)}</tbody>
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
        <li>When you upload a PDF or DOCX, the text is read <b>in your browser</b> and scored there. The file itself is never uploaded.</li>
        <li><b>When you start a check, we save a copy of what we read from your resume as data</b>, whether or not you have signed in. That includes your name, email address, phone number, location and links as they appear on the resume, your work history, education and skills, the score we gave it, and the level, focus and company type you picked. We do not keep the file.</li>
        <li>If you sign in afterwards, your earlier checks from the same browser are attached to your account. We keep your <b>latest check</b> visible to you in the app, replacing the previous one. Only you can see it there.</li>
        <li>Resumes you build in the Writer are saved to your account so you can access them across devices (paid plans).</li>
        <li>If AI rewrites are enabled, the single bullet you ask about plus your role and level are sent to our AI provider to generate suggestions.</li>
      </ul>
      <h2>Why we keep it</h2>
      <ul>
        <li><b>To improve ProductRez:</b> understanding what product managers write, what works and what doesn’t, so our scoring, benchmarks and job matching get more accurate. When we study resumes in bulk, we work with the data in aggregate.</li>
        <li><b>To contact you:</b> we may email the address on your resume or your account about your resume, new features, relevant roles and your plan. Every marketing email has an unsubscribe link, and you can also write to us to stop emails at any time.</li>
        <li>We keep it until you ask us to delete it. We may keep anonymised, aggregated statistics after that.</li>
      </ul>
      <h2>Other data</h2>
      <ul>
        <li><b>Account:</b> your email address, used for passwordless sign-in.</li>
        <li><b>Payments:</b> handled by Razorpay. We never see or store card or UPI details; we store the order, plan and payment id.</li>
        <li><b>Preferences</b> (currency, level, theme) and learning progress are stored to personalise your experience.</li>
      </ul>
      <h2>What we don’t do</h2>
      <ul><li>We don’t sell your data or show you ads.</li><li>We don’t share your resume or contact details with employers or recruiters.</li><li>We don’t use the file you upload for anything, because we never receive it.</li></ul>
      <h2>Your choices</h2>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on your resume or account to see, export or delete everything we hold about you, or to stop emails. This works even if you never created an account. Deleting your account also deletes the resume data saved against it.</p>
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
        <li>Checking your resume and seeing your score is <b>free</b>. Paid plans unlock the full report, the Writer and the job feed.</li>
        <li>Paid plans are <b>one-time payments</b> in INR with no automatic renewal: 1 month (30 days) for ₹299, 6 months (182 days) for ₹599, and Lifetime for ₹999. Buying again while a plan is active adds time.</li>
        <li>“Lifetime” means for as long as ProductRez operates the service.</li>
      </ul>
      <h2>Job listings</h2>
      <p>Listings come from public postings and link to the original source. We don’t verify employers and aren’t affiliated with the platforms they appear on. Apply at your own discretion.</p>
      <h2>Your content and your resume data</h2>
      <p>You own your resume. You’re responsible for the accuracy of what you submit to employers, including any numbers you add.</p>
      <p>When you start a resume check, you agree that we may save the parsed contents of your resume, including the contact details on it, and the results of the check, and use them to improve ProductRez and to contact you about your resume and our service, as described in our <Link to="/privacy">Privacy Policy</Link>. Only upload your own resume, or one you have permission to share. You can ask us to delete it, or stop emailing you, at any time.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalPage>
  )
}
