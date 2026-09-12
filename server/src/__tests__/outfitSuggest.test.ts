import { suggestOutfitItems, climatesCompatible, type OutfitCandidateItem } from '../lib/outfitSuggest';

function item(id: string, category: OutfitCandidateItem['category'], climate: OutfitCandidateItem['climate'], wearCount = 0): OutfitCandidateItem {
  return { id, category, climate, wearCount };
}

describe('climatesCompatible', () => {
  it('treats matching climates as compatible', () => {
    expect(climatesCompatible('cold', 'cold')).toBe(true);
  });

  it('treats mismatched non-layering climates as incompatible', () => {
    expect(climatesCompatible('cold', 'tropical')).toBe(false);
  });

  it('treats layering as universally compatible on either side', () => {
    expect(climatesCompatible('layering', 'tropical')).toBe(true);
    expect(climatesCompatible('cold', 'layering')).toBe(true);
  });

  it('treats null climate as universally compatible on either side', () => {
    expect(climatesCompatible(null, 'tropical')).toBe(true);
    expect(climatesCompatible('cold', null)).toBe(true);
    expect(climatesCompatible(null, null)).toBe(true);
  });
});

describe('suggestOutfitItems — climate rule', () => {
  it('excludes candidates with a conflicting climate', () => {
    const seed = item('seed', 'tops', 'cold');
    const candidates = [
      item('b1', 'bottoms', 'tropical'), // conflicts
      item('s1', 'shoes', 'cold'), // matches
    ];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result.map((r) => r.itemId)).toEqual(['s1']);
  });

  it('includes layering and null-climate candidates regardless of seed climate', () => {
    const seed = item('seed', 'tops', 'cold');
    const candidates = [item('b1', 'bottoms', 'layering'), item('s1', 'shoes', null)];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result.map((r) => r.itemId).sort()).toEqual(['b1', 's1']);
  });
});

describe('suggestOutfitItems — category complementarity', () => {
  it('a tops seed pulls bottoms + shoes, never another top', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [
      item('t2', 'tops', null, 10), // should never be suggested
      item('b1', 'bottoms', null),
      item('s1', 'shoes', null),
    ];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result.map((r) => r.category)).not.toContain('tops');
    expect(result.map((r) => r.itemId).sort()).toEqual(['b1', 's1']);
  });

  it('a bottoms seed pulls tops + shoes, never another bottom', () => {
    const seed = item('seed', 'bottoms', null);
    const candidates = [item('b2', 'bottoms', null), item('t1', 'tops', null), item('s1', 'shoes', null)];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result.map((r) => r.category)).not.toContain('bottoms');
    expect(result.map((r) => r.itemId).sort()).toEqual(['s1', 't1']);
  });

  it('a dresses seed pulls shoes + outerwear/accessories, and never tops or bottoms', () => {
    const seed = item('seed', 'dresses', null);
    const candidates = [
      item('t1', 'tops', null),
      item('b1', 'bottoms', null),
      item('s1', 'shoes', null),
      item('o1', 'outerwear', null),
      item('a1', 'accessories', null),
    ];
    const result = suggestOutfitItems(seed, candidates, []);
    const categories = result.map((r) => r.category);
    expect(categories).not.toContain('tops');
    expect(categories).not.toContain('bottoms');
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((r) => ['shoes', 'outerwear', 'accessories'].includes(r.category))).toBe(true);
  });

  it('caps suggestions at 3 even with many eligible candidates', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [
      item('b1', 'bottoms', null),
      item('s1', 'shoes', null),
      item('o1', 'outerwear', null),
      item('a1', 'accessories', null),
    ];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result.length).toBe(3);
  });
});

describe('suggestOutfitItems — not-already-grouped rule', () => {
  it('excludes candidates already grouped with the seed in an existing Outfit', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [item('b1', 'bottoms', null), item('b2', 'bottoms', null, 5), item('s1', 'shoes', null)];
    const result = suggestOutfitItems(seed, candidates, [{ itemIds: ['seed', 'b1'] }]);
    expect(result.map((r) => r.itemId)).not.toContain('b1');
    expect(result.map((r) => r.itemId)).toContain('b2');
  });

  it('does not exclude a candidate grouped with the seed only via a different, unrelated outfit membership pattern', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [item('b1', 'bottoms', null)];
    // b1 and some other item are grouped together, but not with the seed.
    const result = suggestOutfitItems(seed, candidates, [{ itemIds: ['other1', 'b1'] }]);
    expect(result.map((r) => r.itemId)).toContain('b1');
  });
});

describe('suggestOutfitItems — deterministic ranking', () => {
  it('prefers higher wear count within a category, tie-broken by id', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [item('b-low', 'bottoms', null, 1), item('b-high', 'bottoms', null, 9), item('s1', 'shoes', null)];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result[0].itemId).toBe('b-high');
  });

  it('returns identical output across repeated calls with the same input', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [
      item('b1', 'bottoms', null, 3),
      item('b2', 'bottoms', null, 3),
      item('s1', 'shoes', null, 3),
      item('s2', 'shoes', null, 3),
    ];
    const first = suggestOutfitItems(seed, candidates, []);
    const second = suggestOutfitItems(seed, candidates, []);
    expect(second).toEqual(first);
  });

  it('breaks a wear-count tie by id ascending', () => {
    const seed = item('seed', 'tops', null);
    const candidates = [item('b-zeta', 'bottoms', null, 3), item('b-alpha', 'bottoms', null, 3), item('s1', 'shoes', null)];
    const result = suggestOutfitItems(seed, candidates, []);
    expect(result.find((r) => r.category === 'bottoms')?.itemId).toBe('b-alpha');
  });
});

describe('suggestOutfitItems — sparse closet', () => {
  it('returns fewer than 2 suggestions (or none) when there are not enough compatible candidates', () => {
    const seed = item('seed', 'tops', null);
    const result = suggestOutfitItems(seed, [], []);
    expect(result).toEqual([]);
  });
});
