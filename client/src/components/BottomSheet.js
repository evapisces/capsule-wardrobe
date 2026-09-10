import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useBreakpoint } from '../lib/useIsMobile';
export default function BottomSheet({ isOpen, onClose, title, children }) {
    const sheetRef = useRef(null);
    const triggerRef = useRef(null);
    const breakpoint = useBreakpoint();
    const isMobile = breakpoint === 'mobile';
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen)
            return;
        // Remember whatever opened the sheet so focus can return there on close.
        triggerRef.current = document.activeElement;
        sheetRef.current?.focus();
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            triggerRef.current?.focus?.();
        };
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    const backdropStyle = {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
    };
    const sheetStyle = {
        position: 'fixed', bottom: 0,
        left: isMobile ? 0 : '50%',
        transform: isMobile ? 'none' : 'translateX(-50%)',
        width: '100%',
        maxWidth: isMobile ? '100%' : '640px',
        background: '#fff', borderRadius: '16px 16px 0 0',
        display: 'flex', flexDirection: 'column',
        zIndex: 301,
        boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
    };
    const handleStyle = {
        width: '36px', height: '4px', background: '#ddd',
        borderRadius: '2px', margin: '12px auto 0',
    };
    const headerStyle = {
        padding: '8px 20px 12px',
        borderBottom: '1px solid #f0ebe3',
        fontSize: '16px', fontWeight: 700,
    };
    const bodyStyle = {
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        overflowY: 'auto', flex: 1,
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { "data-testid": "sheet-backdrop", style: backdropStyle, onClick: onClose }), _jsxs("div", { ref: sheetRef, tabIndex: -1, className: "bottom-sheet", style: sheetStyle, role: "dialog", "aria-modal": "true", "aria-label": title, children: [_jsx("div", { style: handleStyle }), _jsx("div", { style: headerStyle, children: title }), _jsx("div", { style: bodyStyle, children: children })] })] }));
}
