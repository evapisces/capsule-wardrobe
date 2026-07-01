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
  createdAt: string;
  capsuleCount?: number;
}

export interface Capsule {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  items?: ClosetItem[];
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  capsules?: Capsule[];
  createdAt: string;
}

export interface UploadResponse {
  key: string;
  url: string;
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
