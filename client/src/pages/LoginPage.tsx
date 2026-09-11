const GOOGLE_SIGN_IN_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/auth/google`;

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px',
  padding: '24px',
  textAlign: 'center',
  background: 'var(--bg-page)',
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '40px',
  color: 'var(--ink-primary)',
};

const explanationStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  color: 'var(--ink-tertiary)',
  maxWidth: '360px',
};

const signInLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '44px',
  padding: '0 24px',
  borderRadius: '9px',
  background: 'var(--ink-primary)',
  color: 'var(--bg-page)',
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
};

/**
 * Anonymous-state screen. Signing in is a full page navigation (an <a>, not an
 * onClick handler doing an XHR) so the browser follows the server's OAuth
 * redirect chain and the httpOnly session cookie gets set on the real response.
 */
export default function LoginPage() {
  return (
    <div style={pageStyle}>
      <span style={wordmarkStyle}>Capsule</span>
      <p style={explanationStyle}>
        Sign in with Google to see your own closets, capsules, and trips.
      </p>
      <a href={GOOGLE_SIGN_IN_URL} style={signInLinkStyle}>
        Sign in with Google
      </a>
    </div>
  );
}
