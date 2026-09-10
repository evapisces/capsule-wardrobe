import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTopBarSlotContent } from '../lib/topBarSlot';
import { useBreakpoint } from '../lib/useIsMobile';
const DESTINATIONS = [
    { to: '/', label: 'Closet', end: true },
    { to: '/capsules', label: 'Capsules' },
    { to: '/trips', label: 'Trips' },
    { to: '/insights', label: 'Insights' },
];
const navStyle = {
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
const mobileNavStyle = {
    ...navStyle,
    height: 'auto',
    minHeight: '64px',
    padding: '0 20px',
    flexWrap: 'wrap',
    rowGap: '4px',
};
const wordmarkStyle = {
    fontFamily: 'var(--font-serif)',
    fontSize: '24px',
    color: 'var(--ink-primary)',
    marginRight: '36px',
};
const linkStyle = ({ isActive }) => ({
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    fontWeight: isActive ? 500 : 400,
    color: isActive ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
    borderBottom: isActive ? '2px solid var(--ink-primary)' : '2px solid transparent',
    paddingBottom: '3px',
});
const hamburgerStyle = {
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
const mobileLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    minHeight: '44px',
    fontFamily: 'var(--font-sans)',
    fontSize: '15px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
    borderBottom: '1px solid var(--line-soft)',
});
function DesktopNav({ slotContent }) {
    return (_jsxs("nav", { style: navStyle, children: [_jsx("span", { style: wordmarkStyle, children: "Capsule" }), _jsx("div", { style: { display: 'flex', gap: '26px', marginRight: 'auto' }, children: DESTINATIONS.map((d) => (_jsx(NavLink, { to: d.to, end: d.end, style: linkStyle, children: d.label }, d.to))) }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: slotContent })] }));
}
const MOBILE_NAV_LIST_ID = 'mobile-nav-list';
function MobileNav({ slotContent }) {
    const [menuOpen, setMenuOpen] = useState(false);
    return (_jsxs("nav", { style: mobileNavStyle, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    minHeight: '64px',
                }, children: [_jsx("span", { style: { ...wordmarkStyle, marginRight: 0 }, children: "Capsule" }), _jsx("button", { type: "button", "aria-label": "Menu", "aria-expanded": menuOpen, "aria-controls": MOBILE_NAV_LIST_ID, onClick: () => setMenuOpen((o) => !o), style: hamburgerStyle, children: _jsx("span", { "aria-hidden": "true", children: menuOpen ? '✕' : '≡' }) })] }), menuOpen && (_jsx("div", { id: MOBILE_NAV_LIST_ID, style: { display: 'flex', flexDirection: 'column', width: '100%', paddingBottom: '8px' }, children: DESTINATIONS.map((d) => (_jsx(NavLink, { to: d.to, end: d.end, style: mobileLinkStyle, onClick: () => setMenuOpen(false), children: d.label }, d.to))) })), slotContent && (_jsx("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    width: '100%',
                    paddingBottom: '10px',
                }, children: slotContent }))] }));
}
export default function NavBar() {
    const slotContent = useTopBarSlotContent();
    const breakpoint = useBreakpoint();
    return breakpoint === 'mobile' ? (_jsx(MobileNav, { slotContent: slotContent })) : (_jsx(DesktopNav, { slotContent: slotContent }));
}
export const searchInputStyle = {
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
