/** Local saved delivery areas for guest profile (checkout can append). */

export type GuestSavedAddress = {
  id: string;
  label: string;
  pincode: string;
  area?: string;
  updatedAt: string;
};

const KEY = "damigos_guest_addresses";

export function readGuestAddresses(): GuestSavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestSavedAddress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestAddresses(rows: GuestSavedAddress[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 20)));
}

export function upsertGuestAddress(input: {
  label: string;
  pincode: string;
  area?: string;
}): GuestSavedAddress[] {
  const rows = readGuestAddresses();
  const pin = input.pincode.replace(/\D/g, "").slice(0, 6);
  const next: GuestSavedAddress = {
    id: `addr_${pin}_${Date.now().toString(36)}`,
    label: input.label.trim() || "Home",
    pincode: pin,
    area: input.area?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  const withoutDup = rows.filter((r) => r.pincode !== pin);
  const merged = [next, ...withoutDup];
  writeGuestAddresses(merged);
  return merged;
}

export function removeGuestAddress(id: string): GuestSavedAddress[] {
  const next = readGuestAddresses().filter((r) => r.id !== id);
  writeGuestAddresses(next);
  return next;
}
