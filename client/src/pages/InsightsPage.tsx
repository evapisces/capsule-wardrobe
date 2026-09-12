import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getClosets, getClosetStats, getInsights, addItemToCapsule } from '../lib/api';
import StatStrip, { type Stat } from '../components/StatStrip';
import OutfitSuggestionPanel from '../components/OutfitSuggestionPanel';
import { useBreakpoint } from '../lib/useIsMobile';

// Exported so tests can assert the value without relying on jsdom's CSSOM
// parsing the nested `min()` (AC 7). One column below ~660px.
export const panelGridColumns = 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))';

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function formatDelta(n: number): string {
  const pct = Math.round(n * 100);
  if (pct === 0) return 'Flat vs last 30 days';
  return `${pct > 0 ? '+' : ''}${pct}% vs last 30 days`;
}

export default function InsightsPage() {
  const [range, setRange] = useState<'6m' | 'all'>('6m');
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const pagePadding = isMobile ? '16px' : breakpoint === 'tablet' ? '20px' : '28px';

  const { data: closets = [], isLoading: closetsLoading } = useQuery({ queryKey: ['closets'], queryFn: getClosets });
  const closetId = closets[0]?.id ?? '';
  const noCloset = !closetsLoading && closets.length === 0;

  const { data: stats } = useQuery({
    queryKey: ['closetStats', closetId],
    queryFn: () => getClosetStats(closetId),
    enabled: !!closetId,
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', closetId, range],
    queryFn: () => getInsights(closetId, range),
    enabled: !!closetId,
  });

  const qc = useQueryClient();
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const [errorItemId, setErrorItemId] = useState<string | null>(null);
  const [suggestItemId, setSuggestItemId] = useState<string | null>(null);
  const addToCapsuleMutation = useMutation({
    mutationFn: ({ capsuleId, itemId }: { capsuleId: string; itemId: string }) =>
      addItemToCapsule(capsuleId, itemId),
    onMutate: ({ itemId }) => {
      setErrorItemId((prev) => (prev === itemId ? null : prev));
    },
    onSuccess: (_data, { itemId }) => {
      setAddedItemIds((prev) => new Set(prev).add(itemId));
      qc.invalidateQueries({ queryKey: ['insights', closetId, range] });
    },
    onError: (_err, { itemId }) => {
      setErrorItemId(itemId);
    },
  });

  const statCells: Stat[] = stats
    ? [
        { key: 'Worn this month', value: `${stats.wornThisMonth}`, sub: `of ${stats.totalItems} items` },
        { key: 'Closet utilisation', value: formatPct(stats.closetUtilisation), sub: formatDelta(stats.closetUtilisationDelta) },
        { key: 'Dormant 90+ days', value: `${stats.dormantCount}`, sub: stats.dormantCoolCount > 0 ? `${stats.dormantCoolCount} are cool-weather` : 'None cool-weather' },
        { key: 'Avg cost per wear', value: stats.avgCostPerWear != null ? `$${stats.avgCostPerWear.toFixed(2)}` : '—', sub: stats.avgCostPerWear != null ? 'across priced items' : 'no prices logged yet' },
      ]
    : [];

  const maxWorn = insights?.mostWorn[0]?.wearCount ?? 1;

  if (noCloset) {
    return (
      <div style={{ padding: pagePadding, maxWidth: '1280px', margin: '0 auto' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}>
          Create a closet first — <Link to="/">head back to your closet</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: pagePadding, maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="eyebrow">
            {insights ? `${insights.loggedWears} logged wears · ${insights.unloggedDays} unlogged days` : '—'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }}>
            Insights
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['6m', 'all'] as const).map((r) => (
            <button key={r} className={`chip${range === r ? ' selected' : ''}`} onClick={() => setRange(r)}>
              {r === '6m' ? 'Last 6 months' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {stats && <div style={{ marginBottom: '30px' }}><StatStrip stats={statCells} /></div>}

      <div style={{ display: 'grid', gridTemplateColumns: panelGridColumns, gap: '26px' }}>
        <div>
          <div className="section-label" style={{ marginBottom: '12px' }}>Most worn</div>
          {(insights?.mostWorn.length ?? 0) === 0 ? (
            <p style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>No wears logged in this range yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {insights!.mostWorn.map((row) => (
                <div key={row.itemId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '52px', borderRadius: '6px', flexShrink: 0,
                      border: '1px solid var(--line-strong)',
                      background: row.photoUrl ? `center/cover no-repeat url(${row.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)', flexShrink: 0, marginLeft: '8px' }}>{row.wearCount}</span>
                      </div>
                      <div style={{ height: '3px', borderRadius: '2px', background: '#E8E3DA', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((row.wearCount / maxWorn) * 100)}%`, background: 'var(--accent-green)' }} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '4px' }}>
                        {row.costPerWear != null ? `$${row.costPerWear.toFixed(2)} / wear` : 'no price logged'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: '12px' }}>Sitting idle</div>
          <div style={{ border: '1px solid var(--line-soft)', borderRadius: '11px', overflow: 'hidden', marginBottom: '26px' }}>
            {(insights?.sittingIdle.length ?? 0) === 0 ? (
              <p style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>Nothing sitting idle right now.</p>
            ) : (
              insights!.sittingIdle.map((row, i) => {
                const buttonStyle = { minHeight: isMobile ? '44px' : '30px', height: isMobile ? undefined : '30px', padding: '0 12px', fontSize: '12px', flexShrink: 0 } as const;
                const added = addedItemIds.has(row.itemId);
                const isPending = addToCapsuleMutation.isPending && addToCapsuleMutation.variables?.itemId === row.itemId;
                const hasError = errorItemId === row.itemId;

                let actionNode;
                if (row.action.kind === 'suggest-outfit') {
                  actionNode = (
                    <button
                      className="btn-secondary"
                      style={buttonStyle}
                      onClick={() => setSuggestItemId(row.itemId)}
                    >
                      {row.actionLabel}
                    </button>
                  );
                } else if (added) {
                  actionNode = (
                    <span style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', fontSize: '12px' }}>
                      Added to {row.action.capsuleName}
                    </span>
                  );
                } else {
                  const { capsuleId, capsuleName } = row.action;
                  actionNode = (
                    <button
                      className="btn-secondary"
                      style={buttonStyle}
                      disabled={isPending}
                      onClick={() => addToCapsuleMutation.mutate({ capsuleId, itemId: row.itemId })}
                    >
                      {isPending ? 'Adding…' : hasError ? 'Retry' : row.actionLabel}
                    </button>
                  );
                }

                return (
                  <div key={row.itemId} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-hairline)',
                  }}>
                    <div style={{
                      width: '40px', height: '48px', borderRadius: '6px', flexShrink: 0,
                      border: '1px solid var(--line-strong)',
                      background: row.photoUrl ? `center/cover no-repeat url(${row.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>{row.name}</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--accent-amber)' }}>{row.reason}</div>
                      {hasError && !added && (
                        <div style={{ fontSize: '11.5px', color: '#B3261E', marginTop: '2px' }}>
                          Couldn&apos;t add — try again.
                        </div>
                      )}
                    </div>
                    {actionNode}
                  </div>
                );
              })
            )}
          </div>

          <div className="section-label" style={{ marginBottom: '12px' }}>Capsule efficiency</div>
          {(insights?.capsuleEfficiency.length ?? 0) === 0 ? (
            <p style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>No capsules yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '10px' }}>
              {insights!.capsuleEfficiency.map((c) =>
                isMobile ? (
                  <div key={c.capsuleId}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'right', color: 'var(--ink-tertiary)', flexShrink: 0 }}>{c.efficiency}</span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '2px', background: '#E8E3DA', overflow: 'hidden', marginTop: '6px', width: '100%' }}>
                      <div style={{ height: '100%', width: `${c.efficiency}%`, background: 'var(--accent-green)' }} />
                    </div>
                  </div>
                ) : (
                  <div key={c.capsuleId} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 26px', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <div style={{ height: '3px', borderRadius: '2px', background: '#E8E3DA', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${c.efficiency}%`, background: 'var(--accent-green)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'right', color: 'var(--ink-tertiary)' }}>{c.efficiency}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {suggestItemId && (
        <OutfitSuggestionPanel
          isOpen={!!suggestItemId}
          onClose={() => setSuggestItemId(null)}
          itemId={suggestItemId}
          closetId={closetId}
          range={range}
        />
      )}
    </div>
  );
}
