import prisma from './prisma';
import { getWearStatsForItems } from './wearStats';
import { signPhotoUrls } from './r2';

export interface PackingRow {
  itemId: string;
  name: string;
  category: string;
  photoUrl: string | null;
  packed: boolean;
  quantity: number;
  neededByOutfits: string[];
}

export interface PackingSuggestion {
  itemId: string;
  name: string;
  reason: string;
  action: 'pack' | 'leave';
}

/**
 * The packing list for a trip: every item across the trip's linked capsules,
 * with a PackingItem row materialized (packed=false, a derived quantity) the
 * first time it's requested, so the checkbox column never has to skip rows.
 */
export async function getTripPacking(tripId: string): Promise<PackingRow[]> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      capsules: {
        include: {
          capsule: {
            include: {
              items: { include: { closetItem: true } },
              outfits: { include: { items: true } },
            },
          },
        },
      },
    },
  });
  if (!trip) return [];

  const itemsById = new Map<string, { id: string; name: string; category: string; photoUrl: string | null }>();
  const outfitNamesByItem = new Map<string, string[]>();

  for (const { capsule } of trip.capsules) {
    for (const { closetItem } of capsule.items) {
      itemsById.set(closetItem.id, closetItem);
    }
    for (const outfit of capsule.outfits) {
      for (const oi of outfit.items) {
        const list = outfitNamesByItem.get(oi.closetItemId) ?? [];
        list.push(outfit.name);
        outfitNamesByItem.set(oi.closetItemId, list);
      }
    }
  }

  const existing = await prisma.packingItem.findMany({ where: { tripId } });
  const existingByItem = new Map(existing.map((p) => [p.closetItemId, p]));

  const missing = [...itemsById.keys()].filter((id) => !existingByItem.has(id));
  if (missing.length > 0) {
    await prisma.packingItem.createMany({
      data: missing.map((closetItemId) => ({
        tripId,
        closetItemId,
        quantity: Math.max(1, outfitNamesByItem.get(closetItemId)?.length ?? 1),
      })),
      skipDuplicates: true,
    });
  }

  const rows = await prisma.packingItem.findMany({ where: { tripId } });
  const result = rows
    .map((row) => {
      const item = itemsById.get(row.closetItemId);
      if (!item) return null;
      return {
        itemId: item.id,
        name: item.name,
        category: item.category,
        photoUrl: item.photoUrl,
        packed: row.packed,
        quantity: row.quantity,
        neededByOutfits: outfitNamesByItem.get(item.id) ?? [],
      };
    })
    .filter((r): r is PackingRow => r !== null);
  return signPhotoUrls(result);
}

/**
 * Packing suggestions from actual wear history — not from what was packed
 * before, since past packing state isn't retained per-trip. Frequently-worn
 * items not yet on this list are worth adding; items that have literally
 * never been worn are worth reconsidering.
 */
export async function getPackingSuggestions(tripId: string, currentItemIds: Set<string>): Promise<PackingSuggestion[]> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { capsules: { include: { capsule: { include: { items: { include: { closetItem: true } } } } } } },
  });
  if (!trip) return [];

  const closetId = trip.capsules[0]?.capsule.items[0]?.closetItem.closetId;
  if (!closetId) return [];

  const closetItems = await prisma.closetItem.findMany({ where: { closetId } });
  const wearStats = await getWearStatsForItems(closetItems.map((i) => i.id));

  const suggestions: PackingSuggestion[] = [];
  for (const item of closetItems) {
    const stats = wearStats.get(item.id);
    if (!stats) continue;
    if (!currentItemIds.has(item.id) && stats.wearCount >= 5) {
      suggestions.push({ itemId: item.id, name: item.name, reason: `Worn ${stats.wearCount} times overall`, action: 'pack' });
    } else if (currentItemIds.has(item.id) && stats.wearCount === 0) {
      suggestions.push({ itemId: item.id, name: item.name, reason: 'Never worn — leave it', action: 'leave' });
    }
  }
  return suggestions.slice(0, 5);
}
