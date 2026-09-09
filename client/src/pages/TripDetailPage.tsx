import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrip, getCapsules, linkCapsuleToTrip,
  unlinkCapsuleFromTrip, deleteTrip, getTripWeather,
  getTripDays, setTripDayOutfit, getTripPacking, setPackingItemPacked, getPackingSuggestions,
} from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import BottomSheet from '../components/BottomSheet';
import Tooltip from '../components/Tooltip';
import DayStrip from '../components/DayStrip';
import PackingList from '../components/PackingList';
import type { Capsule, ClosetItem, Climate } from '@capsule/shared';

function describeItem(item: ClosetItem): string {
  const details = [item.brand, item.category, item.size, item.color, item.climate]
    .filter((v): v is string => Boolean(v));
  return details.length ? `${item.name} — ${details.join(' · ')}` : item.name;
}

const CLIMATE_THEME: Record<Climate, { icon: string; gradient: string; accent: string }> = {
  tropical: { icon: '☀️', gradient: 'linear-gradient(135deg, #fff1d6, #ffd98a)', accent: '#b8710f' },
  temperate: { icon: '⛅', gradient: 'linear-gradient(135deg, #dff5ea, #b8e6d1)', accent: '#1b9e6b' },
  cold: { icon: '❄️', gradient: 'linear-gradient(135deg, #e3f1fc, #b8dcf5)', accent: '#2274a5' },
  layering: { icon: '🌦️', gradient: 'linear-gradient(135deg, #efe6fc, #d9c8f5)', accent: '#7952b3' },
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedCapsuleIds, setExpandedCapsuleIds] = useState<Set<string>>(new Set());

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTrip(id!),
    enabled: !!id,
  });

  const { data: allCapsules = [] } = useQuery({
    queryKey: ['capsules'],
    queryFn: getCapsules,
    enabled: sheetOpen,
  });

  const { data: weather, isLoading: weatherLoading, isError: weatherError } = useQuery({
    queryKey: ['tripWeather', id],
    queryFn: () => getTripWeather(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: days = [] } = useQuery({
    queryKey: ['tripDays', id],
    queryFn: () => getTripDays(id!),
    enabled: !!id,
  });

  const { data: packing = [] } = useQuery({
    queryKey: ['tripPacking', id],
    queryFn: () => getTripPacking(id!),
    enabled: !!id,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['tripPackingSuggestions', id],
    queryFn: () => getPackingSuggestions(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['trip', id] });
    qc.invalidateQueries({ queryKey: ['tripWeather', id] });
  };

  const linkMutation = useMutation({
    mutationFn: (capsuleId: string) => linkCapsuleToTrip(id!, capsuleId),
    onSuccess: () => { invalidate(); setSheetOpen(false); },
  });

  const unlinkMutation = useMutation({
    mutationFn: (capsuleId: string) => unlinkCapsuleFromTrip(id!, capsuleId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(id!),
    onSuccess: () => navigate('/trips'),
  });

  const dayPickMutation = useMutation({
    mutationFn: ({ date, outfitId }: { date: string; outfitId: string }) => setTripDayOutfit(id!, date, outfitId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tripDays', id] }),
  });

  const packToggleMutation = useMutation({
    mutationFn: ({ itemId, packed }: { itemId: string; packed: boolean }) => setPackingItemPacked(id!, itemId, packed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tripPacking', id] }),
  });

  useTopBarActions(
    <>
      <button className="btn-secondary" onClick={() => window.print()}>Print list</button>
      <button className="btn-primary" onClick={() => navigate(-1)}>Done</button>
    </>
  );

  const toggleExpand = (capsuleId: string) => {
    setExpandedCapsuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(capsuleId)) next.delete(capsuleId);
      else next.add(capsuleId);
      return next;
    });
  };

  if (isLoading || !trip) return <p style={{ padding: '28px', color: 'var(--ink-tertiary)', fontSize: '13px' }}>Loading…</p>;

  const linkedCapsuleIds = new Set((trip.capsules ?? []).map((c) => c.id));
  const unlinkableCapsules = allCapsules.filter((c) => !linkedCapsuleIds.has(c.id));
  const outfitOptions = (trip.capsules ?? []).flatMap((c) => c.outfits ?? []);
  const offClimateCapsuleCount = weather?.capsuleSuitability.filter((s) => !s.suitable).length ?? 0;
  const today = new Date();
  const dayOfTrip = Math.min(
    days.length,
    Math.max(1, Math.floor((today.getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1)
  );

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      <Link to="/trips" style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>Trips</Link>
      <div className="eyebrow" style={{ marginTop: '10px' }}>Trip · day {dayOfTrip} of {days.length || '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }}>
          {trip.name}
        </h1>
        {weather && <span className="pill-green">{weather.predictedClimate} · {Math.round(weather.avgHighF)}° / {Math.round(weather.avgLowF)}°</span>}
        {offClimateCapsuleCount > 0 && <span className="pill-amber">{offClimateCapsuleCount} capsule{offClimateCapsuleCount === 1 ? '' : 's'} off-climate</span>}
      </div>
      <p style={{ fontSize: '14px', color: 'var(--ink-tertiary)', marginTop: '4px', marginBottom: '22px' }}>
        {trip.destination} · {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
      </p>

      <div style={{
        borderRadius: '14px', marginBottom: '24px', padding: '16px 20px',
        background: weather ? CLIMATE_THEME[weather.predictedClimate].gradient : '#fff',
        border: weather ? 'none' : '1px solid var(--line-strong)',
      }}>
        <h2 style={{
          fontSize: '11px', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.05em',
          textTransform: 'uppercase', color: weather ? 'rgba(0,0,0,0.5)' : 'var(--ink-tertiary)',
        }}>
          Expected Weather
        </h2>
        {weatherLoading && <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px' }}>☁️ Checking forecast…</p>}
        {weatherError && (
          <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px' }}>
            🤷 Couldn't find weather data for "{trip.destination}".
          </p>
        )}
        {weather && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '38px', lineHeight: 1 }}>{CLIMATE_THEME[weather.predictedClimate].icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#2b2b2b', lineHeight: 1.15 }}>
                {Math.round(weather.avgHighF)}°
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}> / {Math.round(weather.avgLowF)}°F</span>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {weather.resolvedLocation}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.65)', color: CLIMATE_THEME[weather.predictedClimate].accent,
                fontSize: '12px', fontWeight: 700, textTransform: 'capitalize',
              }}>
                {weather.predictedClimate}
              </span>
              <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.45)', marginTop: '5px' }}>
                {weather.source === 'forecast' ? 'Live forecast' : 'Historical avg'}
              </div>
            </div>
          </div>
        )}
      </div>

      {trip.autoLogEnabled && (
        <div style={{
          background: 'var(--accent-green-tint)', borderRadius: '12px', padding: '14px 18px',
          marginBottom: '26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--accent-green-ink)' }}>Auto-logging wears while this trip is active</div>
              <div style={{ fontSize: '12.5px', color: 'var(--accent-green)' }}>Each day's outfit is recorded from your linked capsules. Correct any day in the strip below.</div>
            </div>
          </div>
        </div>
      )}

      {days.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <DayStrip days={days} outfitOptions={outfitOptions} onPick={(date, outfitId) => dayPickMutation.mutate({ date, outfitId })} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '26px', marginBottom: '32px' }}>
        <PackingList rows={packing} onToggle={(itemId, packed) => packToggleMutation.mutate({ itemId, packed })} />
        <div>
          <div className="section-label" style={{ marginBottom: '10px' }}>From your last trips</div>
          <div style={{ border: '1px solid var(--line-soft)', borderRadius: '11px', padding: '16px' }}>
            {suggestions.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>No suggestions yet — wear a few items first.</p>
            ) : (
              suggestions.map((s) => (
                <div key={s.itemId} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--ink-primary)' }}>{s.name}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>{s.reason}</div>
                </div>
              ))
            )}
            <p style={{ fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '10px' }}>
              Built from what you actually wore, not what you packed.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span className="section-label">Capsules</span>
        <button className="btn-secondary" onClick={() => setSheetOpen(true)}>Link capsule</button>
      </div>

      {(trip.capsules ?? []).length === 0 && (
        <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px', marginBottom: '20px' }}>No capsules linked yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {(trip.capsules ?? []).map((capsule: Capsule) => {
          const isExpanded = expandedCapsuleIds.has(capsule.id);
          const items: ClosetItem[] = capsule.items ?? [];
          const suitability = weather?.capsuleSuitability.find((c) => c.capsuleId === capsule.id);
          return (
            <div key={capsule.id} style={{ border: '1px solid var(--line-soft)', borderRadius: '10px', overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => toggleExpand(capsule.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--ink-primary)' }}>{capsule.name}</span>
                    {suitability && suitability.itemClimates.length > 0 && weather && (
                      <Tooltip content={suitability.suitable
                        ? `This capsule's items are tagged for ${suitability.itemClimates.join(', ')} weather, which matches the ${weather.predictedClimate} conditions expected for this trip.`
                        : `This capsule's items are tagged for ${suitability.itemClimates.join(', ')} weather, but this trip is expected to be ${weather.predictedClimate}. You may want to swap in different items.`}
                      >
                        <span className={suitability.suitable ? 'pill-green' : 'pill-amber'} style={{ cursor: 'help' }}>
                          {suitability.suitable ? '✓ Good fit' : '⚠ Mismatch'}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '2px' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); unlinkMutation.mutate(capsule.id); }}
                    className="btn-secondary"
                    style={{ height: '28px', padding: '0 12px', fontSize: '12px' }}
                  >
                    Unlink
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--line-hairline)' }}>
                  {items.length === 0 ? (
                    <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px', paddingTop: '10px' }}>No items in this capsule.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px' }}>
                      {items.map((item: ClosetItem) => (
                        <Tooltip key={item.id} content={describeItem(item)}>
                          <div style={{
                            width: '52px', height: '52px', borderRadius: '8px',
                            background: item.photoUrl ? undefined : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                            border: '1px solid var(--line-strong)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden',
                            cursor: 'help',
                          }}>
                            {item.photoUrl
                              ? <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : '👕'}
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', fontSize: '13px', padding: 0, cursor: 'pointer' }}
      >
        {deleteMutation.isPending ? 'Deleting…' : 'Delete trip'}
      </button>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Link a Capsule">
        {unlinkableCapsules.length === 0 ? (
          <p style={{ color: 'var(--ink-tertiary)', fontSize: '14px' }}>All capsules are already linked.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unlinkableCapsules.map((capsule: Capsule) => (
              <button
                key={capsule.id}
                onClick={() => linkMutation.mutate(capsule.id)}
                disabled={linkMutation.isPending}
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--line-strong)', background: '#fff', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 500 }}>{capsule.name}</div>
                {capsule.description && <div style={{ fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '2px' }}>{capsule.description}</div>}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
