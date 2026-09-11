import type {
  Closet,
  ClosetItem,
  Capsule,
  Trip,
  UploadResponse,
  ItemCategory,
  Climate,
  TripWeather,
  ClosetStats,
  WearHistoryEntry,
  ItemCapsuleMembership,
  CapsuleBoard,
  DrawerItem,
  BoardOutfit,
  TripDay,
  PackingRow,
  PackingSuggestion,
  InsightsSummary,
  AuthUser,
} from '@capsule/shared';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

/** Thrown by `request`/`uploadPhoto` for any non-2xx response; carries the HTTP status
 * so callers (in particular the auth provider) can tell a 401 apart from other errors. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Notified whenever any request comes back 401, so the auth provider can flip the
// app to the anonymous state without every call site having to check for it.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.();
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(err.error ?? res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const getMe = () => request<AuthUser>('/auth/me');
export const logout = () => request<void>('/auth/logout', { method: 'POST' });

// Closets
export const getClosets = () => request<Closet[]>('/closets');
export const getCloset = (id: string) => request<Closet>(`/closets/${id}`);
export const createCloset = (data: { name: string; description?: string }) =>
  request<Closet>('/closets', { method: 'POST', body: JSON.stringify(data) });
export const updateCloset = (id: string, data: Partial<Closet>) =>
  request<Closet>(`/closets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCloset = (id: string) =>
  request<void>(`/closets/${id}`, { method: 'DELETE' });

// Closet Items
export const getClosetItems = (
  closetId: string,
  filters?: { category?: ItemCategory; color?: string; climate?: Climate }
) => {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.color) params.set('color', filters.color);
  if (filters?.climate) params.set('climate', filters.climate);
  const qs = params.toString();
  return request<ClosetItem[]>(`/closets/${closetId}/items${qs ? `?${qs}` : ''}`);
};
export const createClosetItem = (closetId: string, data: Partial<ClosetItem>) =>
  request<ClosetItem>(`/closets/${closetId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const getClosetItem = (id: string) => request<ClosetItem>(`/items/${id}`);
export const updateClosetItem = (id: string, data: Partial<ClosetItem>) =>
  request<ClosetItem>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClosetItem = (id: string) =>
  request<void>(`/items/${id}`, { method: 'DELETE' });
export const getClosetStats = (closetId: string) =>
  request<ClosetStats>(`/closets/${closetId}/stats`);
export const getInsights = (closetId: string, range: '6m' | 'all') =>
  request<InsightsSummary>(`/closets/${closetId}/insights?range=${range}`);
export const getItemWearHistory = (itemId: string) =>
  request<WearHistoryEntry[]>(`/items/${itemId}/wear-history`);
export const logItemWear = (itemId: string) =>
  request<{ wearCount: number; lastWornAt: string | null }>(`/items/${itemId}/wear`, {
    method: 'POST',
  });
export const undoItemWear = (itemId: string) =>
  request<{ wearCount: number; lastWornAt: string | null }>(`/items/${itemId}/wear`, {
    method: 'DELETE',
  });
export const getItemCapsules = (itemId: string) =>
  request<ItemCapsuleMembership[]>(`/items/${itemId}/capsules`);

// Photo upload
export const uploadPhoto = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.();
    throw new ApiError('Upload failed', res.status);
  }
  return res.json();
};

// Capsules
export const getCapsules = (archived?: boolean) =>
  request<Capsule[]>(`/capsules${archived ? '?archived=true' : ''}`);
// Active + archived combined. For pickers / membership lists (trip-linking,
// item→capsule selector, closet) that must still see archived capsules even
// though the main Capsules list is now active-only.
export const getAllCapsules = async (): Promise<Capsule[]> => {
  const [activeList, archivedList] = await Promise.all([getCapsules(false), getCapsules(true)]);
  return [...activeList, ...archivedList];
};
export const createCapsule = (data: { name: string; description?: string; climate?: Climate }) =>
  request<Capsule>('/capsules', { method: 'POST', body: JSON.stringify(data) });
export const getCapsule = (id: string) => request<Capsule>(`/capsules/${id}`);
export const updateCapsule = (id: string, data: Partial<Capsule>) =>
  request<Capsule>(`/capsules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCapsule = (id: string) =>
  request<void>(`/capsules/${id}`, { method: 'DELETE' });
export const archiveCapsule = (id: string) =>
  request<Capsule>(`/capsules/${id}/archive`, { method: 'POST' });
export const unarchiveCapsule = (id: string) =>
  request<Capsule>(`/capsules/${id}/archive`, { method: 'DELETE' });
export const addItemToCapsule = (capsuleId: string, closetItemId: string) =>
  request<void>(`/capsules/${capsuleId}/items/${closetItemId}`, { method: 'POST' });
export const removeItemFromCapsule = (capsuleId: string, closetItemId: string) =>
  request<void>(`/capsules/${capsuleId}/items/${closetItemId}`, { method: 'DELETE' });

// Trips
export const getTrips = () => request<Trip[]>('/trips');
export const createTrip = (data: {
  name: string; destination: string; startDate: string; endDate: string;
}) => request<Trip>('/trips', { method: 'POST', body: JSON.stringify(data) });
export const getTrip = (id: string) => request<Trip>(`/trips/${id}`);
export const updateTrip = (id: string, data: Partial<Trip>) =>
  request<Trip>(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTrip = (id: string) =>
  request<void>(`/trips/${id}`, { method: 'DELETE' });
export const linkCapsuleToTrip = (tripId: string, capsuleId: string) =>
  request<void>(`/trips/${tripId}/capsules/${capsuleId}`, { method: 'POST' });
export const unlinkCapsuleFromTrip = (tripId: string, capsuleId: string) =>
  request<void>(`/trips/${tripId}/capsules/${capsuleId}`, { method: 'DELETE' });
export const getTripWeather = (tripId: string) =>
  request<TripWeather>(`/trips/${tripId}/weather`);

// Capsule board (outfit builder)
export const getCapsuleBoard = (capsuleId: string) =>
  request<CapsuleBoard>(`/capsules/${capsuleId}/board`);
export const getCapsuleDrawer = (capsuleId: string, closetId: string, category?: ItemCategory) => {
  const params = new URLSearchParams({ closetId });
  if (category) params.set('category', category);
  return request<DrawerItem[]>(`/capsules/${capsuleId}/drawer?${params.toString()}`);
};
export const placeBoardItem = (capsuleId: string, itemId: string, x: number, y: number) =>
  request<{ x: number; y: number }>(`/capsules/${capsuleId}/board/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ x, y }),
  });
export const removeBoardItem = (capsuleId: string, itemId: string) =>
  request<void>(`/capsules/${capsuleId}/board/${itemId}`, { method: 'DELETE' });
export const createOutfit = (capsuleId: string, name: string, itemIds: string[]) =>
  request<BoardOutfit>(`/capsules/${capsuleId}/outfits`, {
    method: 'POST',
    body: JSON.stringify({ name, itemIds }),
  });
export const renameOutfit = (outfitId: string, name: string) =>
  request<BoardOutfit>(`/outfits/${outfitId}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deleteOutfit = (outfitId: string) =>
  request<void>(`/outfits/${outfitId}`, { method: 'DELETE' });
export const addItemToOutfit = (outfitId: string, itemId: string) =>
  request<void>(`/outfits/${outfitId}/items/${itemId}`, { method: 'POST' });
export const removeItemFromOutfit = (outfitId: string, itemId: string) =>
  request<void>(`/outfits/${outfitId}/items/${itemId}`, { method: 'DELETE' });

// Trip day strip + packing
export const getTripDays = (tripId: string) => request<TripDay[]>(`/trips/${tripId}/days`);
export const setTripDayOutfit = (tripId: string, date: string, outfitId: string) =>
  request<void>(`/trips/${tripId}/days/${date}`, { method: 'PUT', body: JSON.stringify({ outfitId }) });
export const getTripPacking = (tripId: string) => request<PackingRow[]>(`/trips/${tripId}/packing`);
export const setPackingItemPacked = (tripId: string, itemId: string, packed: boolean) =>
  request<void>(`/trips/${tripId}/packing/${itemId}`, { method: 'PUT', body: JSON.stringify({ packed }) });
export const getPackingSuggestions = (tripId: string) =>
  request<PackingSuggestion[]>(`/trips/${tripId}/packing-suggestions`);
