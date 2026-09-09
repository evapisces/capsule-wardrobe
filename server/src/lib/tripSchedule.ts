import prisma from './prisma';

export type DayState = 'auto' | 'corrected' | 'today' | 'future';

export interface TripDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  state: DayState;
  outfitId: string | null;
  outfitName: string | null;
}

function toDateOnly(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The day strip for a trip. Auto-logging isn't backed by a real scheduled
 * job in this app yet — there's no cron populating WearEvents day by day —
 * so "auto-logged" days deterministically rotate through the trip's
 * capsule outfits (dayIndex % outfitCount) rather than reading a real log.
 * A day the user has actually corrected always wins and is read from a
 * real, persisted WearEvent.
 */
export async function getTripDays(tripId: string): Promise<TripDay[]> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { capsules: { include: { capsule: { include: { outfits: true } } } } },
  });
  if (!trip) return [];

  const outfits = trip.capsules.flatMap((tc) => tc.capsule.outfits);
  const today = toDateOnly(new Date());
  const start = toDateOnly(trip.startDate);
  const end = toDateOnly(trip.endDate);

  const overrides = await prisma.wearEvent.findMany({
    where: {
      date: { gte: start, lte: end },
      outfitId: { in: outfits.map((o) => o.id) },
      corrected: true,
    },
    include: { outfit: true },
  });
  const overrideByDate = new Map(overrides.map((o) => [isoDate(o.date), o]));

  const days: TripDay[] = [];
  let dayNumber = 1;
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000, dayNumber++) {
    const date = new Date(t);
    const key = isoDate(date);
    const override = overrideByDate.get(key);

    if (override) {
      days.push({ date: key, dayNumber, state: 'corrected', outfitId: override.outfitId, outfitName: override.outfit?.name ?? null });
      continue;
    }

    const isToday = date.getTime() === today.getTime();
    const isPastOrToday = date.getTime() <= today.getTime();

    if (!trip.autoLogEnabled || !isPastOrToday) {
      days.push({ date: key, dayNumber, state: isToday ? 'today' : 'future', outfitId: null, outfitName: null });
      continue;
    }

    const rotated = outfits.length > 0 ? outfits[(dayNumber - 1) % outfits.length] : null;
    days.push({
      date: key,
      dayNumber,
      state: isToday ? 'today' : 'auto',
      outfitId: rotated?.id ?? null,
      outfitName: rotated?.name ?? null,
    });
  }

  return days;
}

/** Records the user's choice of outfit for a specific trip day, marking it corrected. */
export async function setTripDayOutfit(tripId: string, dateStr: string, outfitId: string) {
  const date = toDateOnly(new Date(dateStr));
  const tripOutfits = await prisma.outfit.findMany({
    where: { capsule: { trips: { some: { tripId } } } },
    select: { id: true },
  });

  const existing = await prisma.wearEvent.findFirst({
    where: { date, outfitId: { in: tripOutfits.map((o) => o.id) } },
  });

  if (existing) {
    return prisma.wearEvent.update({
      where: { id: existing.id },
      data: { outfitId, corrected: true, source: 'manual' },
    });
  }
  return prisma.wearEvent.create({
    data: { date, outfitId, corrected: true, source: 'manual' },
  });
}
