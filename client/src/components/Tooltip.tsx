import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  content: string;
  children: React.ReactNode;
}

const VIEWPORT_MARGIN = 8;

export default function Tooltip({ content, children }: Props) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !bubbleRef.current) {
      setShift(0);
      return;
    }
    const rect = bubbleRef.current.getBoundingClientRect();
    let delta = 0;
    if (rect.left < VIEWPORT_MARGIN) {
      delta = VIEWPORT_MARGIN - rect.left;
    } else if (rect.right > window.innerWidth - VIEWPORT_MARGIN) {
      delta = (window.innerWidth - VIEWPORT_MARGIN) - rect.right;
    }
    setShift(delta);
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      {children}
      {open && (
        <span
          ref={bubbleRef}
          style={{
            position: 'absolute', bottom: '130%', left: '50%',
            transform: `translateX(calc(-50% + ${shift}px))`,
            background: '#2b2b2b', color: '#fff', fontSize: '12px', lineHeight: 1.4,
            padding: '8px 10px', borderRadius: '6px', zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            width: 'max-content', maxWidth: '220px', whiteSpace: 'normal', textAlign: 'center',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
