import type { Climate } from '@capsule/shared';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  resolvedLocation: string;
}

interface DailyTemps {
  highs: number[];
  lows: number[];
}

const FORECAST_HORIZON_DAYS = 15;
const HISTORICAL_YEARS_BACK = [1, 2, 3];

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

export async function geocodeDestination(destination: string): Promise<GeocodeResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`);
  const data = await res.json() as {
    results?: { latitude: number; longitude: number; name: string; country?: string; admin1?: string }[];
  };
  const match = data.results?.[0];
  if (!match) throw new Error(`Could not resolve location: ${destination}`);
  const parts = [match.name, match.admin1, match.country].filter(Boolean);
  return {
    latitude: match.latitude,
    longitude: match.longitude,
    resolvedLocation: parts.join(', '),
  };
}

async function fetchDailyTemps(
  baseUrl: string,
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<DailyTemps> {
  const url = `${baseUrl}?latitude=${latitude}&longitude=${longitude}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  const data = await res.json() as {
    daily?: { temperature_2m_max: number[]; temperature_2m_min: number[] };
  };
  return {
    highs: data.daily?.temperature_2m_max ?? [],
    lows: data.daily?.temperature_2m_min ?? [],
  };
}

function average(nums: number[]): number {
  if (nums.length === 0) return NaN;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export function classifyClimate(avgHighF: number, avgLowF: number): Climate {
  const swing = avgHighF - avgLowF;
  if (avgHighF >= 80) return 'tropical';
  if (avgHighF <= 45 || avgLowF <= 32) return 'cold';
  if (swing >= 25) return 'layering';
  return 'temperate';
}

export async function fetchTripTemps(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<{ source: 'forecast' | 'historical-average'; avgHighF: number; avgLowF: number }> {
  const today = new Date();
  const daysUntilStart = daysBetween(today, startDate);
  const daysUntilEnd = daysBetween(today, endDate);

  if (daysUntilEnd < 0) {
    const temps = await fetchDailyTemps(
      'https://archive-api.open-meteo.com/v1/archive',
      latitude, longitude,
      toDateOnly(startDate), toDateOnly(endDate)
    );
    return { source: 'historical-average', avgHighF: average(temps.highs), avgLowF: average(temps.lows) };
  }

  if (daysUntilStart <= FORECAST_HORIZON_DAYS) {
    const clampedEnd = daysUntilEnd <= FORECAST_HORIZON_DAYS ? endDate : new Date(today.getTime() + FORECAST_HORIZON_DAYS * 86400000);
    const temps = await fetchDailyTemps(
      'https://api.open-meteo.com/v1/forecast',
      latitude, longitude,
      toDateOnly(startDate), toDateOnly(clampedEnd)
    );
    return { source: 'forecast', avgHighF: average(temps.highs), avgLowF: average(temps.lows) };
  }

  const yearlyTemps = await Promise.all(
    HISTORICAL_YEARS_BACK.map((yearsBack) => {
      const pastStart = new Date(startDate);
      pastStart.setFullYear(pastStart.getFullYear() - yearsBack);
      const pastEnd = new Date(endDate);
      pastEnd.setFullYear(pastEnd.getFullYear() - yearsBack);
      return fetchDailyTemps(
        'https://archive-api.open-meteo.com/v1/archive',
        latitude, longitude,
        toDateOnly(pastStart), toDateOnly(pastEnd)
      );
    })
  );

  const allHighs = yearlyTemps.flatMap((t) => t.highs);
  const allLows = yearlyTemps.flatMap((t) => t.lows);
  return { source: 'historical-average', avgHighF: average(allHighs), avgLowF: average(allLows) };
}
