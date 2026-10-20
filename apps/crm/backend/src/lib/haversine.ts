const EARTH_KM = 6371;

/** Great-circle distance in km (Haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Cross-By rider rule: ≤ 1.0 km → single multi-pickup rider */
export const CROSS_BY_SINGLE_RIDER_KM = 1.0;

export function riderModeForDistanceKm(distanceKm: number): "SINGLE" | "SPLIT" {
  return distanceKm <= CROSS_BY_SINGLE_RIDER_KM ? "SINGLE" : "SPLIT";
}
