export type ItemCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'shoes'
  | 'accessories'
  | 'outerwear';

export type Climate = 'tropical' | 'temperate' | 'cold' | 'layering';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// The shape returned by GET /api/auth/me.
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Closet {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ClosetItem {
  id: string;
  closetId: string;
  name: string;
  photoUrl: string | null;
  category: ItemCategory;
  color: string | null;
  climate: Climate | null;
  size: string | null;
  brand: string | null;
  notes: string | null;
  pricePaid: number | null;
  createdAt: string;
  capsuleCount?: number;
  wearCount?: number;
  lastWornAt?: string | null;
  costPerWear?: number | null;
  dormant?: boolean;
}

export type WearSource = 'manual' | 'trip_auto';

export interface WearHistoryEntry {
  id: string;
  date: string;
  outfitName: string | null;
  context: string | null;
  source: WearSource;
  corrected: boolean;
}

export interface ClosetWearEventItem {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface ClosetWearEvent {
  id: string;
  outfitName: string | null;
  context: string | null;
  source: WearSource;
  corrected: boolean;
  items: ClosetWearEventItem[];
}

export interface ClosetWearDay {
  date: string;
  events: ClosetWearEvent[];
}

export interface BoardItem {
  id: string;
  name: string;
  photoUrl: string | null;
  climate: Climate | null;
  wearCount: number;
  onBoard: boolean;
  x: number | null;
  y: number | null;
  outfitId: string | null;
  offClimate: boolean;
}

export interface BoardOutfit {
  id: string;
  name: string;
  itemIds: string[];
}

export interface CapsuleBoard {
  id: string;
  name: string;
  climate: Climate | null;
  tempHighF: number | null;
  tempLowF: number | null;
  climateLabel: string | null;
  tripLabel: string;
  offClimateCount: number;
  items: BoardItem[];
  outfits: BoardOutfit[];
}

export interface DrawerItem {
  id: string;
  name: string;
  photoUrl: string | null;
  category: ItemCategory;
  climate: Climate | null;
  wearCount: number;
  matchesClimate: boolean;
}

export interface ItemCapsuleMembership {
  id: string;
  name: string;
  kind: 'trip' | 'standing';
  itemCount: number;
  tripLabel: string;
  suitable: boolean;
}

export type TripDayState = 'auto' | 'corrected' | 'today' | 'future';

export interface TripDay {
  date: string;
  dayNumber: number;
  state: TripDayState;
  outfitId: string | null;
  outfitName: string | null;
}

export interface PackingRow {
  itemId: string;
  name: string;
  category: ItemCategory;
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

export interface ClosetStats {
  wornThisMonth: number;
  totalItems: number;
  closetUtilisation: number;
  closetUtilisationDelta: number;
  dormantCount: number;
  dormantCoolCount: number;
  dormantThresholdDays: number;
  avgCostPerWear: number | null;
}

export type CapsuleKind = 'trip' | 'standing';

export interface CapsuleThumbnail {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface Capsule {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  kind?: CapsuleKind;
  climate?: Climate | null;
  tempHighF?: number | null;
  tempLowF?: number | null;
  items?: ClosetItem[];
  outfits?: { id: string; name: string }[];
  createdAt: string;
  archivedAt?: string | null;
  // Present on the list endpoint (GET /api/capsules) only:
  thumbnails?: CapsuleThumbnail[];
  itemCount?: number;
  outfitCount?: number;
  tripLabel?: string;
  climateLabel?: string | null;
  climateSuitable?: boolean;
  efficiency?: number;
  efficiencyReason?: string;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  autoLogEnabled?: boolean;
  capsules?: Capsule[];
  createdAt: string;
}

export interface UploadResponse {
  key: string;
  url: string;
}

// Response shape for POST /api/items/suggest. `suggestionsAvailable: false`
// means the vision feature is disabled (missing key/flag) — every other
// field is undefined in that case. When enabled, a per-image failure,
// timeout, or low-confidence result still comes back `suggestionsAvailable:
// true` with `suggestion: null` and a human-readable `reason`, so the
// client can flag the item for manual entry without aborting the batch.
export interface ItemSuggestion {
  name: string | null;
  category: ItemCategory | null;
  color: string | null;
  brand: string | null;
  climate: Climate | null;
  confidence: number;
}

export interface ItemSuggestResponse {
  suggestionsAvailable: boolean;
  suggestion?: ItemSuggestion | null;
  reason?: string;
}

export interface CapsuleSuitability {
  capsuleId: string;
  capsuleName: string;
  suitable: boolean;
  itemClimates: Climate[];
}

export interface TripWeather {
  source: 'forecast' | 'historical-average';
  resolvedLocation: string;
  avgHighF: number;
  avgLowF: number;
  predictedClimate: Climate;
  capsuleSuitability: CapsuleSuitability[];
}
