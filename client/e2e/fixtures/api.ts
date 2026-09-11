import type { Page } from '@playwright/test';
import type {
  Capsule,
  Closet,
  ClosetItem,
  ClosetStats,
  InsightsSummary,
  PackingRow,
  PackingSuggestion,
  Trip,
  TripDay,
  TripWeather,
} from '@capsule/shared';

/**
 * Minimal, backend-free API fixtures. Every page renders its empty / populated
 * state from these so the overflow tests never need Postgres or the Express
 * server. Pass `overrides` keyed by the path *after* `/api` to change a single
 * response (e.g. `{ '/capsules': [] }`).
 */

export const CLOSET_ID = 'closet-e2e';
export const TRIP_ID = 'trip-e2e';

const CLOSET: Closet = {
  id: CLOSET_ID,
  userId: 'user-e2e',
  name: 'Everyday Capsule Closet With A Deliberately Long Name',
  description: null,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const STATS: ClosetStats = {
  wornThisMonth: 12,
  totalItems: 48,
  closetUtilisation: 0.62,
  closetUtilisationDelta: -0.04,
  dormantCount: 7,
  dormantCoolCount: 3,
  dormantThresholdDays: 90,
  avgCostPerWear: 2.4,
};

const CAPSULES: Capsule[] = [
  {
    id: 'capsule-e2e-1',
    userId: 'user-e2e',
    name: 'Shoulder-Season City Break Capsule',
    description:
      'A long description that would push a narrow bottom sheet wider than the viewport if any child had a fixed width.',
    kind: 'standing',
    climate: 'temperate',
    createdAt: '2024-02-01T00:00:00.000Z',
    itemCount: 14,
    outfitCount: 6,
  },
  {
    id: 'capsule-e2e-2',
    userId: 'user-e2e',
    name: 'Tropical Long-Haul Capsule',
    description: 'Second linkable capsule for the trip sheet.',
    kind: 'standing',
    climate: 'tropical',
    createdAt: '2024-02-02T00:00:00.000Z',
    itemCount: 9,
    outfitCount: 4,
  },
];

const TRIP: Trip = {
  id: TRIP_ID,
  userId: 'user-e2e',
  name: 'Lisbon & The Algarve Coast',
  destination: 'Lisbon, Portugal',
  startDate: '2025-05-10T00:00:00.000Z',
  endDate: '2025-05-18T00:00:00.000Z',
  autoLogEnabled: true,
  capsules: [],
  createdAt: '2025-01-01T00:00:00.000Z',
};

const WEATHER: TripWeather = {
  source: 'forecast',
  resolvedLocation: 'Lisbon, Lisbon District, Portugal',
  avgHighF: 74,
  avgLowF: 58,
  predictedClimate: 'temperate',
  capsuleSuitability: [],
};

const INSIGHTS: InsightsSummary = {
  loggedWears: 214,
  unloggedDays: 33,
  mostWorn: [
    { itemId: 'i1', name: 'White Oxford Shirt', photoUrl: null, wearCount: 41, costPerWear: 1.2 },
    { itemId: 'i2', name: 'Indigo Straight Jeans', photoUrl: null, wearCount: 33, costPerWear: 2.1 },
  ],
  sittingIdle: [
    {
      itemId: 'i3',
      name: 'Emerald Silk Slip Dress That Nobody Has Worn Since The Wedding',
      photoUrl: null,
      reason: 'Not worn in 240 days',
      actionLabel: 'Plan a wear',
    },
  ],
  capsuleEfficiency: [
    { capsuleId: 'capsule-e2e-1', name: 'Shoulder-Season City Break Capsule', efficiency: 72 },
    { capsuleId: 'capsule-e2e-2', name: 'Tropical Long-Haul Capsule', efficiency: 44 },
  ],
};

// List endpoints. Kept empty on purpose — the overflow suite asserts the
// empty-state layout of these routes — but still annotated with the real
// element type from `@capsule/shared` so `test:e2e:typecheck` catches a shape
// drift here the same way it does for the populated fixtures above (issue #17).
const CLOSET_ITEMS: ClosetItem[] = [];
const TRIPS: Trip[] = [];
const TRIP_DAYS: TripDay[] = [];
const PACKING_ROWS: PackingRow[] = [];
const PACKING_SUGGESTIONS: PackingSuggestion[] = [];

// Fallback for any other collection an untested page might poll. Every such
// endpoint in this app answers with a JSON array; the element type is nominal
// (the overflow suite only cares that it's an empty, iterable payload).
const OTHER_COLLECTION: ClosetItem[] = [];

type FixtureBody =
  | Closet[]
  | ClosetItem[]
  | ClosetStats
  | InsightsSummary
  | Capsule[]
  | Trip[]
  | Trip
  | TripWeather
  | TripDay[]
  | PackingRow[]
  | PackingSuggestion[];

function bodyFor(pathAfterApi: string): FixtureBody {
  if (pathAfterApi === '/closets') return [CLOSET];
  if (/^\/closets\/[^/]+\/items$/.test(pathAfterApi)) return CLOSET_ITEMS;
  if (/^\/closets\/[^/]+\/stats$/.test(pathAfterApi)) return STATS;
  if (/^\/closets\/[^/]+\/insights$/.test(pathAfterApi)) return INSIGHTS;
  if (pathAfterApi === '/capsules') return CAPSULES;
  if (pathAfterApi === '/trips') return TRIPS;
  if (/^\/trips\/[^/]+\/weather$/.test(pathAfterApi)) return WEATHER;
  if (/^\/trips\/[^/]+\/days$/.test(pathAfterApi)) return TRIP_DAYS;
  if (/^\/trips\/[^/]+\/packing$/.test(pathAfterApi)) return PACKING_ROWS;
  if (/^\/trips\/[^/]+\/packing-suggestions$/.test(pathAfterApi)) return PACKING_SUGGESTIONS;
  if (/^\/trips\/[^/]+$/.test(pathAfterApi)) return TRIP;
  // Anything else the pages might poll: an empty collection is a safe default.
  return OTHER_COLLECTION;
}

export async function stubApi(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname.replace(/^\/api/, '');
    const body = key in overrides ? overrides[key] : bodyFor(key);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body ?? null),
    });
  });
}
