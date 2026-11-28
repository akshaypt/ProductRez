import { Link } from 'react-router-dom'

/** Shown beside every "Review my resume" button. What we keep and why is spelled out in the Terms and Privacy pages (see TERMS_VERSION). */
export function ConsentNote({ verb = 'Reviewing' }: { verb?: string }) {
  return (
    <p className="consent-note">
      {verb} your resume means you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
    </p>
  )
}
