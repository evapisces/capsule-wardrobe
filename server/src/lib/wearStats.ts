import prisma from './prisma';

export interface ItemWearStats {
  wearCount: number;
  lastWornAt: string | null;
}

/**
 * Wear counts + last-worn date for a set of closet items, derived from
 * WearEventItem rows (an item "inherits" a wear whenever it's part of a
 * logged wear event, whether manual or via an outfit/trip auto-log).
 */
export async function getWearStatsForItems(
  closetItemIds: string[]
): Promise<Map<string, ItemWearStats>> {
  const stats = new Map<string, ItemWearStats>();
  if (closetItemIds.length === 0) return stats;

  const rows = await prisma.wearEventItem.findMany({
    where: { closetItemId: { in: closetItemIds } },
    include: { wearEvent: { select: { date: true } } },
  });

  for (const id of closetItemIds) stats.set(id, { wearCount: 0, lastWornAt: null });

  for (const row of rows) {
    const entry = stats.get(row.closetItemId)!;
    entry.wearCount += 1;
    const date = row.wearEvent.date.toISOString();
    if (!entry.lastWornAt || date > entry.lastWornAt) entry.lastWornAt = date;
  }

  return stats;
}

export function costPerWear(pricePaid: number | null, wearCount: number): number | null {
  if (pricePaid == null || wearCount === 0) return null;
  return pricePaid / wearCount;
}

export function daysSince(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const ms = Date.now() - new Date(dateIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export const DORMANT_THRESHOLD_DAYS = 90;

export function isDormant(lastWornAt: string | null): boolean {
  const days = daysSince(lastWornAt);
  return days === null || days >= DORMANT_THRESHOLD_DAYS;
}

/**
 * Logs a wear for today against a single item (the "Wore it today" action
 * with no outfit context). Idempotent per calendar day: a second call the
 * same day returns the existing event instead of creating a duplicate.
 */
export async function logManualItemWear(closetItemId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.wearEvent.findFirst({
    where: {
      date: today,
      source: 'manual',
      outfitId: null,
      items: { some: { closetItemId } },
    },
  });
  if (existing) return existing;

  return prisma.wearEvent.create({
    data: {
      date: today,
      source: 'manual',
      items: { create: [{ closetItemId }] },
    },
  });
}

/** Undo today's manual wear log for an item, if one exists. */
export async function undoManualItemWear(closetItemId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.wearEvent.findFirst({
    where: {
      date: today,
      source: 'manual',
      outfitId: null,
      items: { some: { closetItemId } },
    },
  });
  if (!existing) return false;

  await prisma.wearEvent.delete({ where: { id: existing.id } });
  return true;
}
