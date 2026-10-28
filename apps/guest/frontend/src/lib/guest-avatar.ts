const KEY = "damigos_guest_avatar_data_url";

export function readGuestAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeGuestAvatar(dataUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!dataUrl) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, dataUrl);
  } catch {
    /* ignore quota */
  }
}
