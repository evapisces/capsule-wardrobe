import type { PackingRow } from '@capsule/shared';
import { useBreakpoint } from '../lib/useIsMobile';

interface Props {
  rows: PackingRow[];
  onToggle: (itemId: string, packed: boolean) => void;
}

const desktopRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '26px 52px 1fr 200px 36px',
  gap: '14px',
  alignItems: 'center',
  padding: '12px 16px',
  borderTop: '1px solid var(--line-hairline)',
};

const mobileRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  padding: '12px 14px',
  borderTop: '1px solid var(--line-hairline)',
};

export default function PackingList({ rows, onToggle }: Props) {
  const isMobile = useBreakpoint() === 'mobile';
  const packedCount = rows.filter((r) => r.packed).length;
  const rowStyle = isMobile ? mobileRowStyle : desktopRowStyle;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span className="section-label">Packing list</span>
        <span style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>{packedCount} of {rows.length} packed</span>
      </div>
      <div style={{ border: '1px solid var(--line-soft)', borderRadius: '11px', overflow: 'hidden' }}>
        {rows.length === 0 && (
          <p style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>Nothing to pack yet — link a capsule with items.</p>
        )}
        {rows.map((row, i) => {
          const toggle = (
            <button
              onClick={() => onToggle(row.itemId, !row.packed)}
              aria-label={row.packed ? `Mark ${row.name} unpacked` : `Mark ${row.name} packed`}
              style={{
                // The visible box stays 18px; on mobile the padding grows the
                // hit area to >= 44x44px without resizing the box.
                padding: isMobile ? '13px' : 0,
                margin: isMobile ? '-13px 0' : 0,
                border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '18px', height: '18px', borderRadius: '5px',
                  border: row.packed ? 'none' : '1.5px solid var(--line-default)',
                  background: row.packed ? 'var(--accent-green)' : 'transparent',
                  color: '#fff', fontSize: '12px', lineHeight: '16px',
                }}
              >
                {row.packed ? '✓' : ''}
              </span>
            </button>
          );

          const thumb = (
            <div style={{
              width: '52px', height: '48px', borderRadius: '6px', border: '1px solid var(--line-strong)', flexShrink: 0,
              background: row.photoUrl ? `center/cover no-repeat url(${row.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>
              {!row.photoUrl && '👕'}
            </div>
          );

          if (isMobile) {
            return (
              <div key={row.itemId} style={{ ...rowStyle, borderTop: i === 0 ? 'none' : rowStyle.borderTop }}>
                {toggle}
                {thumb}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>{row.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--ink-tertiary)', flexShrink: 0 }}>×{row.quantity}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', textTransform: 'capitalize', marginTop: '2px' }}>{row.category}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '2px' }}>
                    {row.neededByOutfits.length > 0 ? row.neededByOutfits.join(', ') : '—'}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={row.itemId} style={{ ...rowStyle, borderTop: i === 0 ? 'none' : rowStyle.borderTop }}>
              {toggle}
              {thumb}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>{row.name}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', textTransform: 'capitalize' }}>{row.category}</div>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.neededByOutfits.length > 0 ? row.neededByOutfits.join(', ') : '—'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', textAlign: 'right', color: 'var(--ink-tertiary)' }}>
                ×{row.quantity}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
