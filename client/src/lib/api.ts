import type {
  Closet,
  ClosetItem,
  Capsule,
  Trip,
  UploadResponse,
  ItemCategory,
  Climate,
  TripWeather,
} from '@capsule/shared';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

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

// Photo upload
export const uploadPhoto = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

// Capsules
export const getCapsules = () => request<Capsule[]>('/capsules');
export const createCapsule = (data: { name: string; description?: string }) =>
  request<Capsule>('/capsules', { method: 'POST', body: JSON.stringify(data) });
export const getCapsule = (id: string) => request<Capsule>(`/capsules/${id}`);
export const updateCapsule = (id: string, data: Partial<Capsule>) =>
  request<Capsule>(`/capsules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCapsule = (id: string) =>
  request<void>(`/capsules/${id}`, { method: 'DELETE' });
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
