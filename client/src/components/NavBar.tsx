import { NavLink } from 'react-router-dom';
import { useTopBarSlotContent } from '../lib/topBarSlot';

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

export default function NavBar() {
  const slotContent = useTopBarSlotContent();

  return (
    <nav style={navStyle}>
      <span style={wordmarkStyle}>Capsule</span>
      <div style={{ display: 'flex', gap: '26px', marginRight: 'auto' }}>
        <NavLink to="/" end style={linkStyle}>Closet</NavLink>
        <NavLink to="/capsules" style={linkStyle}>Capsules</NavLink>
        <NavLink to="/trips" style={linkStyle}>Trips</NavLink>
        <NavLink to="/insights" style={linkStyle}>Insights</NavLink>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{slotContent}</div>
    </nav>
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
  width: '220px',
};
