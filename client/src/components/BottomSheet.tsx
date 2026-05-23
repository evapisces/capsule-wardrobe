import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
  };

  const sheetStyle: React.CSSProperties = {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '640px',
    background: '#fff', borderRadius: '16px 16px 0 0',
    maxHeight: '75vh', display: 'flex', flexDirection: 'column',
    zIndex: 301,
    boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
  };

  const handleStyle: React.CSSProperties = {
    width: '36px', height: '4px', background: '#ddd',
    borderRadius: '2px', margin: '12px auto 0',
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 20px 12px',
    borderBottom: '1px solid #f0ebe3',
    fontSize: '16px', fontWeight: 700,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '16px 20px',
    overflowY: 'auto', flex: 1,
  };

  return (
    <>
      <div
        data-testid="sheet-backdrop"
        style={backdropStyle}
        onClick={onClose}
      />
      <div style={sheetStyle} role="dialog" aria-modal="true" aria-label={title}>
        <div style={handleStyle} />
        <div style={headerStyle}>{title}</div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </>
  );
}
