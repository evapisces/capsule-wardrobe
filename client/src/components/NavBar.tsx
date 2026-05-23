import { NavLink } from 'react-router-dom';

const navStyle: React.CSSProperties = {
  display: 'flex', gap: '24px', padding: '12px 24px',
  background: '#fff', borderBottom: '1px solid #e8e0d8',
  position: 'sticky', top: 0, zIndex: 100,
};

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  fontWeight: isActive ? 700 : 400,
  color: isActive ? '#0bcddb' : '#2a2018',
  fontSize: '15px',
});

export default function NavBar() {
  return (
    <nav style={navStyle}>
      <span style={{ fontWeight: 700, marginRight: 'auto', color: '#2a2018' }}>
        🧳 Capsule
      </span>
      <NavLink to="/" style={linkStyle}>Closet</NavLink>
      <NavLink to="/capsules" style={linkStyle}>Capsules</NavLink>
      <NavLink to="/trips" style={linkStyle}>Trips</NavLink>
    </nav>
  );
}
