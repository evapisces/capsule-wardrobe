import prisma from './prisma';
import { costPerWear, isDormant } from './wearStats';
import { computeEfficiency } from './capsuleStats';

export type InsightsRange = '6m' | 'all';

export interface MostWornRow {
  itemId: string;
  name: string;
  photoUrl: string | null;
  wearCount: number;
  costPerWear: number | null;
}

export interface SittingIdleRow {
  itemId: string;
  name: string;
  photoUrl: string | null;
  reason: string;
  actionLabel: string;
}

export interface CapsuleEfficiencyRow {
  capsuleId: string;
  name: string;
  efficiency: number;
}

export interface InsightsSummary {
  loggedWears: number;
  unloggedDays: number;
  mostWorn: MostWornRow[];
  sittingIdle: SittingIdleRow[];
  capsuleEfficiency: CapsuleEfficiencyRow[];
}

function rangeStart(range: InsightsRange): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getInsights(closetId: string, range: InsightsRange): Promise<InsightsSummary> {
  const closet = await prisma.closet.findUnique({ where: { id: closetId } });
  if (!closet) throw Object.assign(new Error('Closet not found'), { statusCode: 404 });

  const items = await prisma.closetItem.findMany({ where: { closetId } });
  const itemIds = items.map((i) => i.id);
  const start = rangeStart(range);

  const wearRows = itemIds.length
    ? await prisma.wearEventItem.findMany({
        where: { closetItemId: { in: itemIds }, ...(start ? { wearEvent: { date: { gte: start } } } : {}) },
        include: { wearEvent: { select: { id: true, date: true } } },
      })
    : [];

  const wearCountByItem = new Map<string, number>();
  const lastWornByItem = new Map<string, string>();
  const distinctWearEventIds = new Set<string>();
  for (const row of wearRows) {
    wearCountByItem.set(row.closetItemId, (wearCountByItem.get(row.closetItemId) ?? 0) + 1);
    distinctWearEventIds.add(row.wearEvent.id);
    const iso = row.wearEvent.date.toISOString();
    if (!lastWornByItem.has(row.closetItemId) || iso > lastWornByItem.get(row.closetItemId)!) {
      lastWornByItem.set(row.closetItemId, iso);
    }
  }

  // All-time last-worn (independent of range) drives dormancy — a 6-month
  // view shouldn't call something "never worn" just because it was worn 7
  // months ago.
  const allTimeWearRows = itemIds.length
    ? await prisma.wearEventItem.findMany({
        where: { closetItemId: { in: itemIds } },
        include: { wearEvent: { select: { date: true } } },
      })
    : [];
  const allTimeLastWorn = new Map<string, string>();
  const allTimeWearCount = new Map<string, number>();
  for (const row of allTimeWearRows) {
    allTimeWearCount.set(row.closetItemId, (allTimeWearCount.get(row.closetItemId) ?? 0) + 1);
    const iso = row.wearEvent.date.toISOString();
    if (!allTimeLastWorn.has(row.closetItemId) || iso > allTimeLastWorn.get(row.closetItemId)!) {
      allTimeLastWorn.set(row.closetItemId, iso);
    }
  }

  const daysInRange = start ? Math.ceil((Date.now() - start.getTime()) / 86400000) : null;
  const wornDates = new Set(wearRows.map((r) => r.wearEvent.date.toISOString().slice(0, 10)));
  const unloggedDays = daysInRange != null ? Math.max(0, daysInRange - wornDates.size) : null;

  const mostWorn: MostWornRow[] = items
    .map((item) => ({
      itemId: item.id,
      name: item.name,
      photoUrl: item.photoUrl,
      wearCount: wearCountByItem.get(item.id) ?? 0,
      costPerWear: costPerWear(item.pricePaid, allTimeWearCount.get(item.id) ?? 0),
    }))
    .filter((r) => r.wearCount > 0)
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 6);

  // Find one real standing capsule per climate band, to name in a
  // suggestion rather than inventing a generic "add to a capsule" CTA.
  const standingCapsules = await prisma.capsule.findMany({
    where: { userId: closet.userId, kind: 'standing' },
    select: { id: true, name: true, climate: true },
  });
  const capsuleForClimate = new Map(standingCapsules.filter((c) => c.climate).map((c) => [c.climate, c.name]));

  const sittingIdle: SittingIdleRow[] = items
    .filter((item) => isDormant(allTimeLastWorn.get(item.id) ?? null))
    .map((item) => {
      const wearCount = allTimeWearCount.get(item.id) ?? 0;
      const lastWorn = allTimeLastWorn.get(item.id);
      const cpw = costPerWear(item.pricePaid, wearCount);
      const reason = !lastWorn
        ? `Never worn · added ${new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        : `Not worn in ${Math.floor((Date.now() - new Date(lastWorn).getTime()) / 86400000)} days${cpw != null ? ` · $${cpw.toFixed(0)}/wear` : ''}`;
      const matchingCapsule = item.climate ? capsuleForClimate.get(item.climate) : undefined;
      const actionLabel = matchingCapsule ? `Add to ${matchingCapsule}` : 'Suggest an outfit';
      return { itemId: item.id, name: item.name, photoUrl: item.photoUrl, reason, actionLabel };
    })
    .sort((a, b) => (allTimeWearCount.get(a.itemId) ?? 0) - (allTimeWearCount.get(b.itemId) ?? 0))
    .slice(0, 6);

  const capsules = await prisma.capsule.findMany({
    where: { userId: closet.userId },
    include: { items: true, outfits: { include: { items: true } } },
  });
  const capsuleEfficiency: CapsuleEfficiencyRow[] = capsules.map((c) => {
    const eff = computeEfficiency(c.items.map((i) => i.closetItemId), c.outfits.flatMap((o) => o.items));
    return { capsuleId: c.id, name: c.name, efficiency: eff.score };
  });

  return {
    loggedWears: distinctWearEventIds.size,
    unloggedDays: unloggedDays ?? 0,
    mostWorn,
    sittingIdle,
    capsuleEfficiency,
  };
}
