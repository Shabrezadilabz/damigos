const KEY = "damigos_guest_token";

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setGuestToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearGuestToken() {
  localStorage.removeItem(KEY);
}

export function authHeaders(): HeadersInit {
  const token = getGuestToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
