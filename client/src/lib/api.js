const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;
async function request(path, options) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
// Closets
export const getClosets = () => request('/closets');
export const getCloset = (id) => request(`/closets/${id}`);
export const createCloset = (data) => request('/closets', { method: 'POST', body: JSON.stringify(data) });
export const updateCloset = (id, data) => request(`/closets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCloset = (id) => request(`/closets/${id}`, { method: 'DELETE' });
// Closet Items
export const getClosetItems = (closetId, filters) => {
    const params = new URLSearchParams();
    if (filters?.category)
        params.set('category', filters.category);
    if (filters?.color)
        params.set('color', filters.color);
    if (filters?.climate)
        params.set('climate', filters.climate);
    const qs = params.toString();
    return request(`/closets/${closetId}/items${qs ? `?${qs}` : ''}`);
};
export const createClosetItem = (closetId, data) => request(`/closets/${closetId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
});
export const getClosetItem = (id) => request(`/items/${id}`);
export const updateClosetItem = (id, data) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClosetItem = (id) => request(`/items/${id}`, { method: 'DELETE' });
export const getClosetStats = (closetId) => request(`/closets/${closetId}/stats`);
export const getInsights = (closetId, range) => request(`/closets/${closetId}/insights?range=${range}`);
export const getItemWearHistory = (itemId) => request(`/items/${itemId}/wear-history`);
export const logItemWear = (itemId) => request(`/items/${itemId}/wear`, {
    method: 'POST',
});
export const undoItemWear = (itemId) => request(`/items/${itemId}/wear`, {
    method: 'DELETE',
});
export const getItemCapsules = (itemId) => request(`/items/${itemId}/capsules`);
// Photo upload
export const uploadPhoto = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
    if (!res.ok)
        throw new Error('Upload failed');
    return res.json();
};
// Capsules
export const getCapsules = (archived) => request(`/capsules${archived ? '?archived=true' : ''}`);
// Active + archived combined. For pickers / membership lists (trip-linking,
// item→capsule selector, closet) that must still see archived capsules even
// though the main Capsules list is now active-only.
export const getAllCapsules = async () => {
    const [activeList, archivedList] = await Promise.all([getCapsules(false), getCapsules(true)]);
    return [...activeList, ...archivedList];
};
export const createCapsule = (data) => request('/capsules', { method: 'POST', body: JSON.stringify(data) });
export const getCapsule = (id) => request(`/capsules/${id}`);
export const updateCapsule = (id, data) => request(`/capsules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCapsule = (id) => request(`/capsules/${id}`, { method: 'DELETE' });
export const archiveCapsule = (id) => request(`/capsules/${id}/archive`, { method: 'POST' });
export const unarchiveCapsule = (id) => request(`/capsules/${id}/archive`, { method: 'DELETE' });
export const addItemToCapsule = (capsuleId, closetItemId) => request(`/capsules/${capsuleId}/items/${closetItemId}`, { method: 'POST' });
export const removeItemFromCapsule = (capsuleId, closetItemId) => request(`/capsules/${capsuleId}/items/${closetItemId}`, { method: 'DELETE' });
// Trips
export const getTrips = () => request('/trips');
export const createTrip = (data) => request('/trips', { method: 'POST', body: JSON.stringify(data) });
export const getTrip = (id) => request(`/trips/${id}`);
export const updateTrip = (id, data) => request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTrip = (id) => request(`/trips/${id}`, { method: 'DELETE' });
export const linkCapsuleToTrip = (tripId, capsuleId) => request(`/trips/${tripId}/capsules/${capsuleId}`, { method: 'POST' });
export const unlinkCapsuleFromTrip = (tripId, capsuleId) => request(`/trips/${tripId}/capsules/${capsuleId}`, { method: 'DELETE' });
export const getTripWeather = (tripId) => request(`/trips/${tripId}/weather`);
// Capsule board (outfit builder)
export const getCapsuleBoard = (capsuleId) => request(`/capsules/${capsuleId}/board`);
export const getCapsuleDrawer = (capsuleId, closetId, category) => {
    const params = new URLSearchParams({ closetId });
    if (category)
        params.set('category', category);
    return request(`/capsules/${capsuleId}/drawer?${params.toString()}`);
};
export const placeBoardItem = (capsuleId, itemId, x, y) => request(`/capsules/${capsuleId}/board/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ x, y }),
});
export const removeBoardItem = (capsuleId, itemId) => request(`/capsules/${capsuleId}/board/${itemId}`, { method: 'DELETE' });
export const createOutfit = (capsuleId, name, itemIds) => request(`/capsules/${capsuleId}/outfits`, {
    method: 'POST',
    body: JSON.stringify({ name, itemIds }),
});
export const renameOutfit = (outfitId, name) => request(`/outfits/${outfitId}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deleteOutfit = (outfitId) => request(`/outfits/${outfitId}`, { method: 'DELETE' });
export const addItemToOutfit = (outfitId, itemId) => request(`/outfits/${outfitId}/items/${itemId}`, { method: 'POST' });
export const removeItemFromOutfit = (outfitId, itemId) => request(`/outfits/${outfitId}/items/${itemId}`, { method: 'DELETE' });
// Trip day strip + packing
export const getTripDays = (tripId) => request(`/trips/${tripId}/days`);
export const setTripDayOutfit = (tripId, date, outfitId) => request(`/trips/${tripId}/days/${date}`, { method: 'PUT', body: JSON.stringify({ outfitId }) });
export const getTripPacking = (tripId) => request(`/trips/${tripId}/packing`);
export const setPackingItemPacked = (tripId, itemId, packed) => request(`/trips/${tripId}/packing/${itemId}`, { method: 'PUT', body: JSON.stringify({ packed }) });
export const getPackingSuggestions = (tripId) => request(`/trips/${tripId}/packing-suggestions`);
