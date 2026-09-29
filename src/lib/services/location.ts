import { storage } from './storage';

// Roughly where this voter is, from their IP, via GeoJS (free, no key). Only the country code and
// city are kept; the IP itself is never stored or sent to Convex. Cached for a day.

export type Location = { country?: string; city?: string };

const DAY_MS = 86_400_000;
const TIMEOUT_MS = 3000;

let pending: Promise<Location> | undefined;

async function lookup(): Promise<Location> {
  const cached = storage.getJSON<(Location & { at: number }) | null>('location', null);
  if (cached && Date.now() - cached.at < DAY_MS) return { country: cached.country, city: cached.city };
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const geo = await res.json();
    const location = {
      country: typeof geo.country_code === 'string' ? geo.country_code.slice(0, 2) : undefined,
      city: typeof geo.city === 'string' && geo.city ? geo.city.slice(0, 80) : undefined
    };
    storage.setJSON('location', { ...location, at: Date.now() });
    return location;
  } catch {
    // Blocked or offline: vote without a location.
    return {};
  }
}

/** This voter's location, looked up once per page load. Never rejects; empty when unknown. */
export function location() {
  return (pending ??= lookup());
}
