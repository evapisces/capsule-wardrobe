import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrip, getCapsules, linkCapsuleToTrip,
  unlinkCapsuleFromTrip, deleteTrip, getTripWeather,
} from '../lib/api';
import BottomSheet from '../components/BottomSheet';
import type { Capsule, ClosetItem } from '@capsule/shared';

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

  const toggleExpand = (capsuleId: string) => {
    setExpandedCapsuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(capsuleId)) next.delete(capsuleId);
      else next.add(capsuleId);
      return next;
    });
  };

  if (isLoading || !trip) return <p style={{ padding: '24px', color: '#aaa' }}>Loading…</p>;

  const linkedCapsuleIds = new Set((trip.capsules ?? []).map((c) => c.id));
  const unlinkableCapsules = allCapsules.filter((c) => !linkedCapsuleIds.has(c.id));

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)}
        style={{ marginBottom: '16px', background: 'none', border: 'none', color: '#0bcddb', fontWeight: 600 }}>
        ← Back
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>{trip.name}</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          {trip.destination} · {new Date(trip.startDate).toLocaleDateString()} → {new Date(trip.endDate).toLocaleDateString()}
        </p>
      </div>

      <div style={{
        border: '1px solid #e0d8cc', borderRadius: '10px', background: '#fff',
        padding: '14px 16px', marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Expected Weather</h2>
        {weatherLoading && <p style={{ color: '#aaa', fontSize: '13px' }}>Checking forecast…</p>}
        {weatherError && (
          <p style={{ color: '#aaa', fontSize: '13px' }}>
            Couldn't find weather data for "{trip.destination}".
          </p>
        )}
        {weather && (
          <p style={{ fontSize: '13px', color: '#555' }}>
            {weather.resolvedLocation} · {Math.round(weather.avgHighF)}°F / {Math.round(weather.avgLowF)}°F ·{' '}
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{weather.predictedClimate}</span>
            <span style={{ color: '#aaa' }}>
              {' '}({weather.source === 'forecast' ? 'forecast' : 'historical average'})
            </span>
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Capsules</h2>
        <button
          onClick={() => setSheetOpen(true)}
          style={{ padding: '6px 14px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}
        >
          + Link Capsule
        </button>
      </div>

      {(trip.capsules ?? []).length === 0 && (
        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
          No capsules linked yet.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {(trip.capsules ?? []).map((capsule: Capsule) => {
          const isExpanded = expandedCapsuleIds.has(capsule.id);
          const items: ClosetItem[] = capsule.items ?? [];
          const suitability = weather?.capsuleSuitability.find((c) => c.capsuleId === capsule.id);
          return (
            <div key={capsule.id}
              style={{ border: '1px solid #e0d8cc', borderRadius: '10px', background: '#fff', overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => toggleExpand(capsule.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{capsule.name}</span>
                    {suitability && suitability.itemClimates.length > 0 && weather && (
                      <span
                        title={suitability.suitable
                          ? `This capsule's items are tagged for ${suitability.itemClimates.join(', ')} weather, which matches the ${weather.predictedClimate} conditions expected for this trip.`
                          : `This capsule's items are tagged for ${suitability.itemClimates.join(', ')} weather, but this trip is expected to be ${weather.predictedClimate}. You may want to swap in different items.`}
                        style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                          background: suitability.suitable ? '#e3f7ee' : '#fdf0e3',
                          color: suitability.suitable ? '#1b9e6b' : '#c47f1a',
                          cursor: 'help',
                        }}
                      >
                        {suitability.suitable ? '✓ Good fit' : '⚠ Mismatch'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); unlinkMutation.mutate(capsule.id); }}
                    style={{ padding: '4px 10px', fontSize: '12px', color: '#e63946',
                      border: '1px solid #e63946', borderRadius: '4px', background: '#fff' }}
                  >
                    Unlink
                  </button>
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f0ebe3' }}>
                  {items.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '13px', paddingTop: '10px' }}>No items in this capsule.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px' }}>
                      {items.map((item: ClosetItem) => (
                        <div key={item.id}
                          style={{ width: '52px', height: '52px', borderRadius: '8px',
                            background: '#e0d8cc', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}
                          title={item.name}
                        >
                          {item.photoUrl
                            ? <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '👕'
                          }
                        </div>
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
        style={{ padding: '8px 18px', background: '#e63946', color: '#fff',
          border: 'none', borderRadius: '6px', fontWeight: 600 }}
      >
        {deleteMutation.isPending ? 'Deleting…' : 'Delete Trip'}
      </button>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Link a Capsule"
      >
        {unlinkableCapsules.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '14px' }}>All capsules are already linked.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unlinkableCapsules.map((capsule: Capsule) => (
              <button
                key={capsule.id}
                onClick={() => linkMutation.mutate(capsule.id)}
                disabled={linkMutation.isPending}
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '8px',
                  border: '1px solid #e0d8cc', background: '#fff', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700 }}>{capsule.name}</div>
                {capsule.description && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{capsule.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
