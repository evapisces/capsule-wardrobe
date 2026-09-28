import { useEffect, useRef, useState } from 'react';
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

const wrapperStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: 'var(--bg-page)',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: '64px',
  padding: '0 28px',
  background: 'var(--bg-page)',
  borderBottom: '1px solid var(--line-soft)',
};

const mobileNavStyle: React.CSSProperties = {
  ...navStyle,
  height: 'auto',
  minHeight: '64px',
  padding: '0 20px',
  flexWrap: 'wrap',
  rowGap: '4px',
};

/** The contextual toolbar a page registers via `useTopBarActions` (search + primary action).
 * Only rendered when a page has one, so pages without contextual actions stay a single row. */
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '12px',
  minHeight: '56px',
  padding: '10px 28px',
  background: 'var(--bg-muted)',
  borderBottom: '1px solid var(--line-soft)',
  flexWrap: 'wrap',
};

const mobileToolbarStyle: React.CSSProperties = {
  ...toolbarStyle,
  justifyContent: 'flex-start',
  padding: '10px 20px',
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

const avatarFallbackStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: 'var(--accent-green-tint)',
  border: '1px solid var(--accent-green-line)',
  color: 'var(--accent-green-ink)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-sans)',
  fontSize: '12px',
  fontWeight: 600,
};

const accountTriggerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: '44px',
  minHeight: '44px',
  padding: '4px 8px',
  marginLeft: '12px',
  border: 'none',
  borderRadius: '999px',
  background: 'transparent',
};

const accountPanelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  minWidth: '200px',
  maxWidth: '260px',
  background: 'var(--bg-raised)',
  border: '1px solid var(--line-default)',
  borderRadius: '10px',
  boxShadow: 'var(--shadow-frame)',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  zIndex: 110,
};

const accountNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--ink-primary)',
};

const accountEmailStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '12px',
  color: 'var(--ink-tertiary)',
  wordBreak: 'break-all',
};

const accountDividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'var(--line-soft)',
  margin: '2px 0',
};

const accountSignOutStyle: React.CSSProperties = {
  textAlign: 'left',
  minHeight: '32px',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  color: 'var(--ink-body)',
  background: 'none',
  border: 'none',
  padding: 0,
};

const ACCOUNT_MENU_ID = 'account-menu-panel';

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M1 3l4 4 4-4"
        stroke="var(--ink-tertiary)"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Global identity affordance: an avatar-only trigger whose menu holds the
 * account name/email and sign-out, so the nav row no longer has to spend
 * width on a persistently visible name + "Sign out" text pair. */
function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const label = user.name ?? user.email;
  const initial = (user.name ?? user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={ACCOUNT_MENU_ID}
        aria-label="Account"
        onClick={() => setOpen((o) => !o)}
        style={accountTriggerStyle}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" style={avatarStyle} />
        ) : (
          <span style={avatarFallbackStyle}>{initial}</span>
        )}
        <ChevronDown />
      </button>
      {open && (
        <div id={ACCOUNT_MENU_ID} role="menu" style={accountPanelStyle}>
          <span style={accountNameStyle}>{label}</span>
          {user.email && user.email !== label && <span style={accountEmailStyle}>{user.email}</span>}
          <div style={accountDividerStyle} />
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            style={accountSignOutStyle}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function DesktopNav({ slotContent }: { slotContent: React.ReactNode }) {
  return (
    <div style={wrapperStyle}>
      <nav style={navStyle}>
        <span style={wordmarkStyle}>Capsule</span>
        <div style={{ display: 'flex', gap: '26px', marginRight: 'auto' }}>
          {DESTINATIONS.map((d) => (
            <NavLink key={d.to} to={d.to} end={d.end} style={linkStyle}>
              {d.label}
            </NavLink>
          ))}
        </div>
        <AccountMenu />
      </nav>
      {slotContent && <div style={toolbarStyle}>{slotContent}</div>}
    </div>
  );
}

const MOBILE_NAV_LIST_ID = 'mobile-nav-list';

function MobileNav({ slotContent }: { slotContent: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={wrapperStyle}>
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
            <span style={{ ...wordmarkStyle, marginRight: 0, marginLeft: '4px' }}>Capsule</span>
          </div>
          <AccountMenu />
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
      </nav>

      {slotContent && (
        <div style={mobileToolbarStyle}>{slotContent}</div>
      )}
    </div>
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
