/** Local saved delivery areas for guest profile (hub + checkout). */

export type GuestSavedAddress = {
  id: string;
  label: string;
  pincode: string;
  area?: string;
  updatedAt: string;
};

const KEY = "damigos_guest_addresses";
const ACTIVE_KEY = "damigos_guest_address_active";
export const GUEST_ADDRESS_CHANGED = "damigos:guest-address-changed";

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GUEST_ADDRESS_CHANGED));
}

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
  emitChanged();
}

export function getActiveAddressId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveAddressId(id: string | null) {
  if (typeof window === "undefined") return;
  if (!id) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, id);
  emitChanged();
}

/** Most recently chosen address, else newest saved. */
export function getActiveAddress(): GuestSavedAddress | null {
  const rows = readGuestAddresses();
  if (!rows.length) return null;
  const activeId = getActiveAddressId();
  const match = activeId ? rows.find((r) => r.id === activeId) : null;
  return match ?? rows[0] ?? null;
}

export function formatAddressHeadline(addr: GuestSavedAddress | null, fallback = "Set delivery area"): string {
  if (!addr) return fallback;
  const place = addr.area?.trim() || addr.label;
  return place.length > 28 ? `${place.slice(0, 27)}…` : place;
}

export function formatAddressSubline(addr: GuestSavedAddress | null): string {
  if (!addr) return "Add an address in Profile";
  const bits = [addr.label, addr.pincode ? `PIN ${addr.pincode}` : null].filter(Boolean);
  return bits.join(" · ");
}

export function upsertGuestAddress(input: {
  label: string;
  pincode: string;
  area?: string;
  makeActive?: boolean;
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
  if (input.makeActive !== false) setActiveAddressId(next.id);
  return merged;
}

export function removeGuestAddress(id: string): GuestSavedAddress[] {
  const next = readGuestAddresses().filter((r) => r.id !== id);
  writeGuestAddresses(next);
  if (getActiveAddressId() === id) {
    setActiveAddressId(next[0]?.id ?? null);
  }
  return next;
}
