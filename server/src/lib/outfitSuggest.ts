import type { ItemCategory, Climate } from '@capsule/shared';

// Pure, DB-free outfit suggestion logic (issue #33). Given one dormant "seed"
// item and the rest of a closet, propose 2-3 complementary items to build an
// outfit around it. Rule-based only — no AI/ML, no color/formality modeling.

export interface OutfitCandidateItem {
  id: string;
  category: ItemCategory;
  climate: Climate | null;
  wearCount: number;
}

// One row per existing `Outfit` grouping, so we don't propose a set the user
// has already built.
export interface ExistingOutfitGroup {
  itemIds: string[];
}

export interface RankedOutfitSuggestion {
  itemId: string;
  category: ItemCategory;
  reason: string;
}

// The complementary categories a seed of a given category should pull from,
// most-important slot first. A category never appears in its own list, and
// `dresses` deliberately omits `tops`/`bottoms` entirely (AC 3).
const COMPLEMENT_PRIORITY: Record<ItemCategory, ItemCategory[]> = {
  tops: ['bottoms', 'shoes', 'outerwear', 'accessories'],
  bottoms: ['tops', 'shoes', 'outerwear', 'accessories'],
  dresses: ['shoes', 'outerwear', 'accessories'],
  shoes: ['tops', 'bottoms', 'outerwear', 'accessories'],
  outerwear: ['tops', 'bottoms', 'shoes', 'accessories'],
  accessories: ['tops', 'bottoms', 'shoes', 'outerwear'],
};

const MAX_SUGGESTIONS = 3;

// `layering` and unset (`null`) climates are treated as universally
// compatible; otherwise the two climates must match exactly (AC 2).
export function climatesCompatible(a: Climate | null, b: Climate | null): boolean {
  if (a == null || a === 'layering') return true;
  if (b == null || b === 'layering') return true;
  return a === b;
}

function reasonFor(category: ItemCategory, climate: Climate | null, seedClimate: Climate | null): string {
  const label = category === 'outerwear' ? 'a layer' : category === 'accessories' ? 'an accessory' : `a ${category.slice(0, -1)}`;
  const climateNote =
    climate && seedClimate && climate === seedClimate
      ? ` in the same ${climate} climate`
      : climate === 'layering' || seedClimate === 'layering'
        ? ' that layers with anything'
        : '';
  return `Rounds out the outfit with ${label}${climateNote}`;
}

/**
 * Given a seed item, the rest of the closet, and any existing `Outfit`
 * groupings, return a deterministic, ranked list of 2-3 complementary items.
 */
export function suggestOutfitItems(
  seed: OutfitCandidateItem,
  candidates: OutfitCandidateItem[],
  existingOutfits: ExistingOutfitGroup[]
): RankedOutfitSuggestion[] {
  // Any set of items already grouped together with the seed in an Outfit is
  // off the table — we're not proposing a copy of something that exists.
  const alreadyGroupedWithSeed = new Set<string>();
  for (const group of existingOutfits) {
    if (group.itemIds.includes(seed.id)) {
      for (const id of group.itemIds) {
        if (id !== seed.id) alreadyGroupedWithSeed.add(id);
      }
    }
  }

  const priorityCategories = COMPLEMENT_PRIORITY[seed.category];

  const eligible = candidates.filter(
    (c) =>
      c.id !== seed.id &&
      priorityCategories.includes(c.category) &&
      climatesCompatible(seed.climate, c.climate) &&
      !alreadyGroupedWithSeed.has(c.id)
  );

  // Deterministic tie-break: most-worn first, then id, so results never
  // depend on incidental array/DB ordering.
  const sortCandidates = (a: OutfitCandidateItem, b: OutfitCandidateItem) =>
    b.wearCount - a.wearCount || a.id.localeCompare(b.id);

  const byCategory = new Map<ItemCategory, OutfitCandidateItem[]>();
  for (const category of priorityCategories) {
    byCategory.set(
      category,
      eligible.filter((c) => c.category === category).sort(sortCandidates)
    );
  }

  const chosen: RankedOutfitSuggestion[] = [];
  const usedIds = new Set<string>();

  // First pass: fill one slot per priority category, in priority order.
  for (const category of priorityCategories) {
    if (chosen.length >= MAX_SUGGESTIONS) break;
    const pick = (byCategory.get(category) ?? []).find((c) => !usedIds.has(c.id));
    if (pick) {
      chosen.push({ itemId: pick.id, category: pick.category, reason: reasonFor(pick.category, pick.climate, seed.climate) });
      usedIds.add(pick.id);
    }
  }

  // Second pass: if we still have room (e.g. only two priority categories
  // had any candidates), fill remaining slots with the next-best candidates
  // from any priority category, still in priority + wear-count order.
  if (chosen.length < MAX_SUGGESTIONS) {
    for (const category of priorityCategories) {
      if (chosen.length >= MAX_SUGGESTIONS) break;
      for (const candidate of byCategory.get(category) ?? []) {
        if (chosen.length >= MAX_SUGGESTIONS) break;
        if (usedIds.has(candidate.id)) continue;
        chosen.push({
          itemId: candidate.id,
          category: candidate.category,
          reason: reasonFor(candidate.category, candidate.climate, seed.climate),
        });
        usedIds.add(candidate.id);
      }
    }
  }

  return chosen;
}
