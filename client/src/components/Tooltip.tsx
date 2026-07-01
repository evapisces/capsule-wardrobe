import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: string;
  children: React.ReactNode;
}

const MARGIN = 8;

export default function Tooltip({ content, children }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        !(bubbleRef.current && bubbleRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleWidth = bubbleRect?.width ?? 220;
    const bubbleHeight = bubbleRect?.height ?? 40;

    let left = triggerRect.left + triggerRect.width / 2 - bubbleWidth / 2;
    left = Math.min(Math.max(left, MARGIN), window.innerWidth - bubbleWidth - MARGIN);

    let top = triggerRect.top - bubbleHeight - MARGIN;
    if (top < MARGIN) {
      top = triggerRect.bottom + MARGIN;
    }

    setCoords({ top, left });
  }, [open, content]);

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: 'inline-block' }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        {children}
      </span>
      {open && createPortal(
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            top: coords?.top ?? -9999,
            left: coords?.left ?? -9999,
            visibility: coords ? 'visible' : 'hidden',
            background: '#2b2b2b', color: '#fff', fontSize: '12px', lineHeight: 1.4,
            padding: '8px 10px', borderRadius: '6px', zIndex: 400,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            width: 'max-content', maxWidth: '220px', whiteSpace: 'normal', textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
