import type { Capsule } from '@capsule/shared';

interface Props {
  capsule: Capsule;
  onClick: () => void;
}

const cardStyle: React.CSSProperties = {
  textAlign: 'left',
  border: '1px solid var(--line-strong)',
  borderRadius: '12px',
  background: 'var(--bg-raised)',
  cursor: 'pointer',
  overflow: 'hidden',
};

const thumbStyle: React.CSSProperties = {
  width: '78px',
  height: '92px',
  borderRadius: '6px',
  border: '1px solid var(--line-strong)',
  background: 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
  backgroundSize: 'cover',
  flexShrink: 0,
};

export default function CapsuleCard({ capsule, onClick }: Props) {
  const thumbnails = capsule.thumbnails ?? [];
  const extra = (capsule.itemCount ?? 0) - thumbnails.length;

  return (
    <button style={cardStyle} onClick={onClick}>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', lineHeight: 1.1, color: 'var(--ink-primary)' }}>
              {capsule.name}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '3px' }}>
              {capsule.tripLabel ?? (capsule.kind === 'trip' ? 'Trip capsule' : 'Standing capsule')}
            </div>
          </div>
          {capsule.climateLabel && (
            <span className={capsule.climateSuitable ? 'pill-green' : 'pill-amber'} style={{ flexShrink: 0 }}>
              {capsule.climateLabel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {thumbnails.map((t) => (
            <div
              key={t.id}
              style={{ ...thumbStyle, backgroundImage: t.photoUrl ? `url(${t.photoUrl})` : undefined }}
            />
          ))}
          {extra > 0 && (
            <div style={{
              ...thumbStyle,
              background: 'var(--bg-sunken)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)',
            }}>
              +{extra}
            </div>
          )}
        </div>

        <div style={{ marginTop: '14px', fontSize: '13px', color: 'var(--ink-body)' }}>
          {capsule.itemCount ?? 0} items · {capsule.outfitCount ?? 0} outfits
        </div>
      </div>

      <div style={{
        marginTop: '14px', borderTop: '1px solid var(--line-soft)', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '18px',
      }}>
        <div>
          <div className="eyebrow">Efficiency</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', lineHeight: 1.1, color: 'var(--ink-primary)' }}>
            {capsule.efficiency ?? 0}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: '3px', borderRadius: '2px', background: '#E8E3DA', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${capsule.efficiency ?? 0}%`,
              background: capsule.climateSuitable === false ? 'var(--accent-amber)' : 'var(--accent-green)',
            }} />
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '6px' }}>
            {capsule.efficiencyReason}
          </div>
        </div>
      </div>
    </button>
  );
}
