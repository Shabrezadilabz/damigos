/** Bangalore pilot pincodes — mock serviceability */
export function mockServiceable(pincode: string): boolean {
  const p = pincode.trim();
  if (!/^\d{6}$/.test(p)) return false;
  if (p === "000000") return false;
  return p.startsWith("560");
}

export function mockShiprocketRatePaise(pincode: string): number {
  const base = 3500;
  const tail = Number.parseInt(pincode.slice(-2), 10) || 0;
  return base + tail * 10;
}

export function mockEtaMinutes(): number {
  return 35;
}
