import type { Climate } from '@capsule/shared';

export interface EfficiencyResult {
  score: number;
  reason: string;
}

/**
 * Efficiency = how much of the capsule is doing work, driven by how many
 * distinct outfits each item participates in. 0-100, plus one plain-
 * language reason — never a formula, per the design spec.
 */
export function computeEfficiency(
  itemIds: string[],
  outfitItemPairs: { closetItemId: string; outfitId: string }[]
): EfficiencyResult {
  if (itemIds.length === 0) return { score: 0, reason: 'No items in this capsule yet.' };

  const outfitsPerItem = new Map<string, Set<string>>();
  for (const id of itemIds) outfitsPerItem.set(id, new Set());
  for (const pair of outfitItemPairs) {
    outfitsPerItem.get(pair.closetItemId)?.add(pair.outfitId);
  }

  const wellUsed = itemIds.filter((id) => (outfitsPerItem.get(id)?.size ?? 0) >= 2).length;
  const singleUse = itemIds.filter((id) => (outfitsPerItem.get(id)?.size ?? 0) === 1).length;
  const unused = itemIds.filter((id) => (outfitsPerItem.get(id)?.size ?? 0) === 0).length;
  const score = Math.round((wellUsed / itemIds.length) * 100);

  let reason: string;
  if (wellUsed === itemIds.length) {
    reason = 'Every item in 2+ outfits';
  } else if (unused > 0 && unused >= singleUse) {
    reason = `${unused} item${unused === 1 ? '' : 's'} not used in any outfit`;
  } else {
    reason = `${singleUse} item${singleUse === 1 ? '' : 's'} appear${singleUse === 1 ? 's' : ''} in one outfit only`;
  }

  return { score, reason };
}

const CLIMATE_LABEL: Record<Climate, string> = {
  tropical: 'Hot & humid',
  temperate: 'Mild',
  cold: 'Cold & wet',
  layering: 'Layering weather',
};

export function climateLabel(climate: Climate | null, tempHighF: number | null, tempLowF: number | null): string | null {
  if (!climate) return null;
  const base = CLIMATE_LABEL[climate];
  if (tempHighF != null && tempLowF != null) return `${base} · ${tempHighF}° / ${tempLowF}°`;
  return base;
}

/** Whether every item's climate band is compatible with the capsule's own band. */
export function isCapsuleClimateSuitable(capsuleClimate: Climate | null, itemClimates: (Climate | null)[]): boolean {
  if (!capsuleClimate) return true;
  return itemClimates.every((c) => c === null || c === capsuleClimate);
}
