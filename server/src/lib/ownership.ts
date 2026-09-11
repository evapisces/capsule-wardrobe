import prisma from './prisma';
import type { Closet, ClosetItem, Capsule, Outfit, Trip } from '@prisma/client';

// Centralized single-owner authorization lookups. Every resource router
// should confirm ownership through one of these before reading or mutating
// a record, rather than re-deriving the join condition inline. Each helper
// resolves to `null` when the record doesn't exist *or* belongs to a
// different user, so callers can uniformly respond 404 (never 403) and
// avoid leaking whether the id exists at all.

export async function findOwnedCloset(closetId: string, userId: string): Promise<Closet | null> {
  return prisma.closet.findFirst({ where: { id: closetId, userId } });
}

// ClosetItem has no userId column of its own — ownership is derived through
// the closet it belongs to.
export async function findOwnedClosetItem(itemId: string, userId: string): Promise<ClosetItem | null> {
  return prisma.closetItem.findFirst({ where: { id: itemId, closet: { userId } } });
}

export async function findOwnedCapsule(capsuleId: string, userId: string): Promise<Capsule | null> {
  return prisma.capsule.findFirst({ where: { id: capsuleId, userId } });
}

// Outfit has no userId column of its own — ownership is derived through the
// capsule it belongs to.
export async function findOwnedOutfit(outfitId: string, userId: string): Promise<Outfit | null> {
  return prisma.outfit.findFirst({ where: { id: outfitId, capsule: { userId } } });
}

export async function findOwnedTrip(tripId: string, userId: string): Promise<Trip | null> {
  return prisma.trip.findFirst({ where: { id: tripId, userId } });
}
