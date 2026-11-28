import { Link } from 'react-router-dom'

/** Shown beside every "Review my resume" button. Starting the check is the person's agreement to this wording (see TERMS_VERSION). */
export function ConsentNote({ verb = 'Reviewing' }: { verb?: string }) {
  return (
    <p className="consent-note">
      {verb} your resume means you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>. We save your parsed resume,
      including your contact details, to improve our scoring and to email you about your resume and ProductRez. We never save the file, and you can opt out or delete it any time.
    </p>
  )
}
