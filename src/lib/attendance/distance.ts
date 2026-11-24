// Distances are STORED in meters (database, geofence math, env BO_COFFEE_GEOFENCE_RADIUS_METERS).
// People SEE and TYPE them in kilometers. These helpers are the only conversion points.

/** Meters -> "0.1 km", "0.25 km", "2.5 km"; anything under 10 m reads "< 0.01 km". */
export function formatKm(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters > 0 && meters < 10) return "< 0.01 km";
  return `${Number((meters / 1000).toFixed(2)).toLocaleString("en-PH", { maximumFractionDigits: 2 })} km`;
}

/** Stored meters -> the value shown in a km input ("" when unset). */
export function metersToKmInput(meters: number | null | undefined): string {
  return meters === null || meters === undefined ? "" : String(Number((meters / 1000).toFixed(3)));
}

/** A km form value -> whole meters for storage; "" stays "" and invalid input is passed through so validation rejects it. */
export function kmInputToMeters(value: FormDataEntryValue | null | undefined): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  const km = Number(text);
  return Number.isFinite(km) ? String(Math.round(km * 1000)) : text;
}

/** Allowed geofence radius range, in km, for form hints (storage limits are 20–5000 m). */
export const GEOFENCE_KM_LIMITS = { min: 0.02, max: 5, step: 0.01 } as const;
