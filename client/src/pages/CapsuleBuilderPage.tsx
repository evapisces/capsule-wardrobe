import { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCapsuleBoard, getCapsuleDrawer, getClosets,
  placeBoardItem, removeBoardItem, createOutfit, deleteOutfit,
  addItemToOutfit, removeItemFromOutfit,
} from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import { useIsMobile } from '../lib/useIsMobile';
import BoardChip from '../components/BoardChip';
import BottomSheet from '../components/BottomSheet';
import { CHIP_WIDTH, CHIP_HEIGHT, outfitPixelRect, rectsOverlap, pointInRect, type PixelRect } from '../lib/boardGeometry';
import type { BoardItem, BoardOutfit, ItemCategory } from '@capsule/shared';

const DRAWER_CATEGORIES: { key: ItemCategory; label: string }[] = [
  { key: 'tops', label: 'Tops' },
  { key: 'bottoms', label: 'Bottoms' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'outerwear', label: 'Layers' },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function CapsuleBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const boardRef = useRef<HTMLDivElement>(null);

  const [drawerCategory, setDrawerCategory] = useState<ItemCategory | null>(null);
  const [drawerAllClimates, setDrawerAllClimates] = useState(false);
  const [drawerSheetOpen, setDrawerSheetOpen] = useState(false); // mobile

  const [lasso, setLasso] = useState<PixelRect | null>(null);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [namingPopover, setNamingPopover] = useState<{ itemIds: string[]; x: number; y: number } | null>(null);
  const [outfitName, setOutfitName] = useState('');

  const { data: closets = [] } = useQuery({ queryKey: ['closets'], queryFn: getClosets });
  const closetId = closets[0]?.id ?? '';

  const { data: board, isLoading } = useQuery({
    queryKey: ['capsuleBoard', id],
    queryFn: () => getCapsuleBoard(id!),
    enabled: !!id,
  });

  const { data: drawerItems = [] } = useQuery({
    queryKey: ['capsuleDrawer', id, closetId, drawerCategory],
    queryFn: () => getCapsuleDrawer(id!, closetId, drawerCategory ?? undefined),
    enabled: !!id && !!closetId,
  });

  useTopBarActions(
    <button className="btn-secondary" onClick={() => navigate('/capsules')}>Done</button>
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['capsuleBoard', id] });
    qc.invalidateQueries({ queryKey: ['capsuleDrawer', id] });
  };

  const placeMutation = useMutation({
    mutationFn: ({ itemId, x, y }: { itemId: string; x: number; y: number }) => placeBoardItem(id!, itemId, x, y),
  });
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeBoardItem(id!, itemId),
    onSuccess: invalidate,
  });
  const createOutfitMutation = useMutation({
    mutationFn: ({ name, itemIds }: { name: string; itemIds: string[] }) => createOutfit(id!, name, itemIds),
    onSuccess: invalidate,
  });
  const deleteOutfitMutation = useMutation({
    mutationFn: (outfitId: string) => deleteOutfit(outfitId),
    onSuccess: invalidate,
  });
  const addToOutfitMutation = useMutation({
    mutationFn: ({ outfitId, itemId }: { outfitId: string; itemId: string }) => addItemToOutfit(outfitId, itemId),
  });
  const removeFromOutfitMutation = useMutation({
    mutationFn: ({ outfitId, itemId }: { outfitId: string; itemId: string }) => removeItemFromOutfit(outfitId, itemId),
  });

  if (isLoading || !board) {
    return <p style={{ padding: '28px', color: 'var(--ink-tertiary)', fontSize: '13px' }}>Loading…</p>;
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleBoardDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1 - CHIP_WIDTH / rect.width);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1 - CHIP_HEIGHT / rect.height);

    const boardWidth = rect.width;
    const boardHeight = rect.height;
    const existing = board.items.find((i) => i.id === itemId);
    const currentOutfitId = existing?.outfitId ?? null;

    await placeMutation.mutateAsync({ itemId, x, y });

    // Auto add/remove from an outfit based on whether the drop point now
    // lands inside (or outside) that outfit's bounding rectangle.
    const pointPx = { x: x * boardWidth, y: y * boardHeight };
    let landedOutfit: BoardOutfit | undefined;
    for (const outfit of board.outfits) {
      const otherMembers = board.items.filter((i) => outfit.itemIds.includes(i.id) && i.id !== itemId);
      if (otherMembers.length === 0) continue;
      const r = outfitPixelRect(outfit, otherMembers, boardWidth, boardHeight);
      if (r && pointInRect(pointPx.x, pointPx.y, r)) { landedOutfit = outfit; break; }
    }

    if (landedOutfit && landedOutfit.id !== currentOutfitId) {
      if (currentOutfitId) await removeFromOutfitMutation.mutateAsync({ outfitId: currentOutfitId, itemId });
      await addToOutfitMutation.mutateAsync({ outfitId: landedOutfit.id, itemId });
    } else if (!landedOutfit && currentOutfitId) {
      await removeFromOutfitMutation.mutateAsync({ outfitId: currentOutfitId, itemId });
    }

    invalidate();
  };

  const handleBoardMouseDown = (e: React.MouseEvent) => {
    if (e.target !== boardRef.current) return; // clicked a chip, not empty canvas
    const rect = boardRef.current!.getBoundingClientRect();
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setLassoStart(start);
    setLasso({ left: start.x, top: start.y, right: start.x, bottom: start.y });
    setNamingPopover(null);
  };

  const handleBoardMouseMove = (e: React.MouseEvent) => {
    if (!lassoStart || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const cur = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setLasso({
      left: Math.min(lassoStart.x, cur.x),
      top: Math.min(lassoStart.y, cur.y),
      right: Math.max(lassoStart.x, cur.x),
      bottom: Math.max(lassoStart.y, cur.y),
    });
  };

  const handleBoardMouseUp = () => {
    if (!lasso || !boardRef.current) { setLassoStart(null); return; }
    const rect = boardRef.current.getBoundingClientRect();
    const selected = board.items.filter((item) => {
      const chipRect: PixelRect = {
        left: (item.x ?? 0) * rect.width,
        top: (item.y ?? 0) * rect.height,
        right: (item.x ?? 0) * rect.width + CHIP_WIDTH,
        bottom: (item.y ?? 0) * rect.height + CHIP_HEIGHT,
      };
      return rectsOverlap(lasso, chipRect);
    });

    if (selected.length > 0) {
      setNamingPopover({ itemIds: selected.map((i) => i.id), x: lasso.right, y: lasso.top });
      setOutfitName('');
    }
    setLasso(null);
    setLassoStart(null);
  };

  const handleCreateOutfit = () => {
    if (!namingPopover || !outfitName.trim()) return;
    createOutfitMutation.mutate({ name: outfitName.trim(), itemIds: namingPopover.itemIds });
    setNamingPopover(null);
  };

  const climatePill = board.climateLabel && (
    <span className="pill-green">{board.climateLabel}</span>
  );
  const offClimatePill = board.offClimateCount > 0 && (
    <span className="pill-amber">{board.offClimateCount} item{board.offClimateCount === 1 ? '' : 's'} off-climate</span>
  );

  const drawer = (
    <div>
      <div className="section-label">Closet drawer</div>
      <div style={{ fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '4px', marginBottom: '14px' }}>
        {drawerAllClimates ? 'Showing all climates' : `Filtered to ${board.climateLabel ?? 'this capsule’s climate'}`}
        {board.climate && (
          <button
            onClick={() => setDrawerAllClimates((v) => !v)}
            style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--accent-green)', fontSize: '12px', padding: 0, cursor: 'pointer' }}
          >
            {drawerAllClimates ? 'Filter to climate' : 'Show all'}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {DRAWER_CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`chip${drawerCategory === c.key ? ' selected' : ''}`}
            style={{ height: '28px', padding: '0 12px', fontSize: '12px' }}
            onClick={() => setDrawerCategory((cur) => (cur === c.key ? null : c.key))}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {drawerItems
          .filter((item) => drawerAllClimates || item.matchesClimate)
          .map((item) => (
            <div
              key={item.id}
              draggable={!isMobile}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={() => {
                if (!isMobile) return;
                placeMutation.mutate({ itemId: item.id, x: 0.1, y: 0.1 }, { onSuccess: () => { invalidate(); setDrawerSheetOpen(false); } });
              }}
              style={{ cursor: isMobile ? 'pointer' : 'grab' }}
            >
              <div style={{
                height: '96px', borderRadius: '8px', border: '1px solid var(--line-strong)',
                background: item.photoUrl ? `center/cover no-repeat url(${item.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>
                {!item.photoUrl && '👕'}
              </div>
              <div style={{ fontSize: '11.5px', marginTop: '5px', color: 'var(--ink-primary)' }}>{item.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)' }}>
                {item.wearCount === 0 ? 'Never worn' : `${item.wearCount} wears`}
              </div>
            </div>
          ))}
      </div>
      {drawerItems.length === 0 && (
        <p style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>Nothing left to add here.</p>
      )}
    </div>
  );

  return (
    <div style={{ padding: '26px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      <Link to="/capsules" style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>Capsules</Link>
      <div className="eyebrow" style={{ marginTop: '10px' }}>{board.tripLabel}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--ink-primary)' }}>
          {board.name}
        </h1>
        {climatePill}
        {offClimatePill}
      </div>
      <p style={{ fontSize: '13px', color: 'var(--ink-tertiary)', marginTop: '6px', marginBottom: '18px' }}>
        {isMobile
          ? 'Tap "Add item" to bring garments into an outfit.'
          : 'Drag any garment onto the board. Lasso a group to name it as an outfit. Off-climate items are marked amber.'}
      </p>

      {isMobile ? (
        <div>
          {board.outfits.map((outfit) => (
            <div key={outfit.id} style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="section-label">{outfit.name}</span>
                <button
                  onClick={() => deleteOutfitMutation.mutate(outfit.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--ink-tertiary)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Ungroup
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {board.items.filter((i) => outfit.itemIds.includes(i.id)).map((item) => (
                  <MobileChip key={item.id} item={item} onRemove={() => removeMutation.mutate(item.id)} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginBottom: '18px' }}>
            <span className="section-label">Unsorted</span>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '8px' }}>
              {board.items.filter((i) => !i.outfitId).map((item) => (
                <MobileChip key={item.id} item={item} onRemove={() => removeMutation.mutate(item.id)} />
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={() => setDrawerSheetOpen(true)}>Add item</button>
          <BottomSheet isOpen={drawerSheetOpen} onClose={() => setDrawerSheetOpen(false)} title="Closet drawer">
            {drawer}
          </BottomSheet>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 0, borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ paddingTop: '20px', paddingRight: '26px' }}>
            <div
              ref={boardRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleBoardDrop}
              onMouseDown={handleBoardMouseDown}
              onMouseMove={handleBoardMouseMove}
              onMouseUp={handleBoardMouseUp}
              style={{
                position: 'relative',
                height: '452px',
                borderRadius: '12px',
                border: '1px dashed var(--line-dashed)',
                background: 'var(--bg-raised)',
                backgroundImage: 'radial-gradient(var(--board-dot) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                overflow: 'hidden',
              }}
            >
              {board.outfits.map((outfit) => {
                const members = board.items.filter((i) => outfit.itemIds.includes(i.id));
                const r = boardRef.current
                  ? outfitPixelRect(outfit, members, boardRef.current.clientWidth, boardRef.current.clientHeight)
                  : null;
                if (!r) return null;
                return (
                  <div key={outfit.id} style={{
                    position: 'absolute', left: r.left, top: r.top, width: r.right - r.left, height: r.bottom - r.top,
                    border: '1.5px solid var(--accent-green)', borderRadius: '12px', background: 'rgba(27,77,62,0.04)',
                    pointerEvents: 'none', // purely decorative — must not intercept drags/drops meant for the board
                  }}>
                    <span style={{
                      position: 'absolute', top: '-10px', left: '14px', background: 'var(--bg-raised)', padding: '0 6px',
                      fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-green)',
                      cursor: 'pointer',
                      pointerEvents: 'auto', // ...except the label itself, which is clickable (ungroup)
                    }}
                      onClick={() => deleteOutfitMutation.mutate(outfit.id)}
                      title="Click to ungroup"
                    >
                      Outfit · {outfit.name}
                    </span>
                  </div>
                );
              })}

              {board.items.map((item) => (
                <BoardChip
                  key={item.id}
                  item={item}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onRemove={() => removeMutation.mutate(item.id)}
                  style={{ left: (item.x ?? 0) * (boardRef.current?.clientWidth ?? 900), top: (item.y ?? 0) * (boardRef.current?.clientHeight ?? 452) }}
                />
              ))}

              {lasso && (
                <div style={{
                  position: 'absolute', left: lasso.left, top: lasso.top,
                  width: lasso.right - lasso.left, height: lasso.bottom - lasso.top,
                  border: '1px dashed var(--accent-green)', background: 'rgba(27,77,62,0.06)', pointerEvents: 'none',
                }} />
              )}

              {board.items.length === 0 && (
                <div style={{
                  position: 'absolute', inset: '20px', border: '1.5px dashed var(--line-dashed-strong)', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12.5px', color: 'var(--ink-tertiary)',
                }}>
                  Drag garments here from the drawer to start building outfits.
                </div>
              )}

              {namingPopover && (
                <div style={{
                  position: 'absolute', left: clamp(namingPopover.x, 8, (boardRef.current?.clientWidth ?? 900) - 220), top: namingPopover.y,
                  background: '#fff', border: '1px solid var(--line-strong)', borderRadius: '10px', padding: '10px',
                  boxShadow: 'var(--shadow-frame)', display: 'flex', gap: '6px', zIndex: 10,
                }}>
                  <input
                    autoFocus
                    placeholder="Name this outfit"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateOutfit(); if (e.key === 'Escape') setNamingPopover(null); }}
                    style={{ height: '32px', padding: '0 10px', borderRadius: '7px', border: '1px solid var(--line-default)', fontSize: '13px', width: '150px' }}
                  />
                  <button className="btn-primary" style={{ height: '32px', padding: '0 12px', fontSize: '12px' }} onClick={handleCreateOutfit}>
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--line-soft)', paddingTop: '20px', paddingLeft: '20px' }}>
            {drawer}
            <div style={{ background: 'var(--bg-muted)', borderRadius: '10px', padding: '12px', marginTop: '18px', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
              Drag a garment onto the board to add it to this capsule. Lasso two or more chips to group them into an outfit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileChip({ item, onRemove }: { item: BoardItem; onRemove: () => void }) {
  return (
    <div style={{ flexShrink: 0, width: '80px' }}>
      <div style={{
        position: 'relative', width: '80px', height: '92px', borderRadius: '8px',
        border: `1.5px solid ${item.offClimate ? 'var(--accent-amber-line)' : 'var(--line-strong)'}`,
        background: item.photoUrl ? `center/cover no-repeat url(${item.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
      }}>
        {!item.photoUrl && '👕'}
        <button onClick={onRemove} style={{
          position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%',
          background: 'var(--ink-primary)', color: '#fff', border: 'none', fontSize: '10px', lineHeight: 1, cursor: 'pointer',
        }}>×</button>
      </div>
      <div style={{ fontSize: '11px', marginTop: '4px', textAlign: 'center' }}>{item.offClimate ? 'off-climate' : item.name}</div>
    </div>
  );
}
