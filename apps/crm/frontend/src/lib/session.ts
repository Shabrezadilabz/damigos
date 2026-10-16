const TOKEN_KEY = "damigos_crm_token";
const SESSION_KEY = "damigos_crm_session";

export type CrmSession = {
  restaurantId: string | null;
  roles: string[];
};

export function getCrmToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setCrmToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getCrmSession(): CrmSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CrmSession;
  } catch {
    return null;
  }
}

export function setCrmSession(session: CrmSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCrmSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function crmAuthHeaders(): HeadersInit {
  const token = getCrmToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
