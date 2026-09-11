import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTopBarSlotContent } from '../lib/topBarSlot';
import { useBreakpoint } from '../lib/useIsMobile';
import { useAuth } from '../lib/auth';

const DESTINATIONS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Closet', end: true },
  { to: '/capsules', label: 'Capsules' },
  { to: '/trips', label: 'Trips' },
  { to: '/insights', label: 'Insights' },
  { to: '/history', label: 'History' },
];

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: '64px',
  padding: '0 28px',
  background: 'var(--bg-page)',
  borderBottom: '1px solid var(--line-soft)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const mobileNavStyle: React.CSSProperties = {
  ...navStyle,
  height: 'auto',
  minHeight: '64px',
  padding: '0 20px',
  flexWrap: 'wrap',
  rowGap: '4px',
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '24px',
  color: 'var(--ink-primary)',
  marginRight: '36px',
};

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  fontWeight: isActive ? 500 : 400,
  color: isActive ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
  borderBottom: isActive ? '2px solid var(--ink-primary)' : '2px solid transparent',
  paddingBottom: '3px',
});

const hamburgerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '44px',
  height: '44px',
  minWidth: '44px',
  minHeight: '44px',
  border: 'none',
  background: 'transparent',
  color: 'var(--ink-primary)',
  fontSize: '20px',
  lineHeight: 1,
};

const mobileLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  minHeight: '44px',
  fontFamily: 'var(--font-sans)',
  fontSize: '15px',
  fontWeight: isActive ? 600 : 400,
  color: isActive ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
  borderBottom: '1px solid var(--line-soft)',
});

const avatarStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  objectFit: 'cover',
};

const identityNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  color: 'var(--ink-primary)',
  whiteSpace: 'nowrap',
};

const signOutButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  color: 'var(--ink-tertiary)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};

function UserIdentity() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const label = user.name ?? user.email;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {user.avatarUrl && <img src={user.avatarUrl} alt="" style={avatarStyle} />}
      <span style={identityNameStyle}>{label}</span>
      <button type="button" onClick={() => void logout()} style={signOutButtonStyle}>
        Sign out
      </button>
    </div>
  );
}

function DesktopNav({ slotContent }: { slotContent: React.ReactNode }) {
  return (
    <nav style={navStyle}>
      <span style={wordmarkStyle}>Capsule</span>
      <div style={{ display: 'flex', gap: '26px', marginRight: 'auto' }}>
        {DESTINATIONS.map((d) => (
          <NavLink key={d.to} to={d.to} end={d.end} style={linkStyle}>
            {d.label}
          </NavLink>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{slotContent}</div>
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '20px' }}>
        <UserIdentity />
      </div>
    </nav>
  );
}

const MOBILE_NAV_LIST_ID = 'mobile-nav-list';

function MobileNav({ slotContent }: { slotContent: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={mobileNavStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: '64px',
        }}
      >
        <span style={{ ...wordmarkStyle, marginRight: 0 }}>Capsule</span>
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls={MOBILE_NAV_LIST_ID}
          onClick={() => setMenuOpen((o) => !o)}
          style={hamburgerStyle}
        >
          <span aria-hidden="true">{menuOpen ? '✕' : '≡'}</span>
        </button>
      </div>

      {menuOpen && (
        <div
          id={MOBILE_NAV_LIST_ID}
          style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingBottom: '8px' }}
        >
          {DESTINATIONS.map((d) => (
            <NavLink
              key={d.to}
              to={d.to}
              end={d.end}
              style={mobileLinkStyle}
              onClick={() => setMenuOpen(false)}
            >
              {d.label}
            </NavLink>
          ))}
        </div>
      )}

      {slotContent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            width: '100%',
            paddingBottom: '10px',
          }}
        >
          {slotContent}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingBottom: '10px' }}>
        <UserIdentity />
      </div>
    </nav>
  );
}

export default function NavBar() {
  const slotContent = useTopBarSlotContent();
  const breakpoint = useBreakpoint();

  return breakpoint === 'mobile' ? (
    <MobileNav slotContent={slotContent} />
  ) : (
    <DesktopNav slotContent={slotContent} />
  );
}

export const searchInputStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 16px',
  borderRadius: '999px',
  border: '1px solid var(--line-default)',
  background: 'var(--bg-page)',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  color: 'var(--ink-body)',
  width: '100%',
  maxWidth: '220px',
};
