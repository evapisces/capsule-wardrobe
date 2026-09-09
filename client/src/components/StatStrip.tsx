export interface Stat {
  key: string;
  value: string;
  sub: string;
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  background: 'var(--line-soft)',
  gap: '1px',
  border: '1px solid var(--line-soft)',
  borderRadius: '10px',
  overflow: 'hidden',
};

const cellStyle: React.CSSProperties = {
  background: 'var(--bg-page)',
  padding: '16px 18px',
};

export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div style={gridStyle}>
      {stats.map((stat) => (
        <div key={stat.key} style={cellStyle}>
          <div className="eyebrow">{stat.key}</div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              lineHeight: 1.15,
              color: 'var(--ink-primary)',
              marginTop: '4px',
            }}
          >
            {stat.value}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '2px' }}>{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}
