"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type HubSort = "relevancy" | "rating" | "eta" | "price";

const VEG_STORAGE_KEY = "damigos.hub.vegOnly";

type HubFilters = {
  search: string;
  setSearch: (v: string) => void;
  vegOnly: boolean;
  setVegOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  sort: HubSort;
  setSort: (v: HubSort) => void;
  rating4Plus: boolean;
  setRating4Plus: (v: boolean) => void;
  lowestPrice: boolean;
  setLowestPrice: (v: boolean) => void;
};

const Ctx = createContext<HubFilters | null>(null);

function readStoredVeg(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VEG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Public read of persisted Pure Veg preference (search / deep links). */
export function readHubVegPreference(): boolean {
  return readStoredVeg();
}

function persistVeg(v: boolean) {
  try {
    window.localStorage.setItem(VEG_STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function HubFiltersProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnlyState] = useState(false);
  const [sort, setSort] = useState<HubSort>("relevancy");
  const [rating4Plus, setRating4Plus] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);

  useEffect(() => {
    setVegOnlyState(readStoredVeg());
  }, []);

  const setVegOnly = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setVegOnlyState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      persistVeg(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      vegOnly,
      setVegOnly,
      sort,
      setSort,
      rating4Plus,
      setRating4Plus,
      lowestPrice,
      setLowestPrice,
    }),
    [search, vegOnly, setVegOnly, sort, rating4Plus, lowestPrice],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHubFilters(): HubFilters {
  const ctx = useContext(Ctx);
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnlyState] = useState(false);
  const [sort, setSort] = useState<HubSort>("relevancy");
  const [rating4Plus, setRating4Plus] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);

  useEffect(() => {
    if (!ctx) setVegOnlyState(readStoredVeg());
  }, [ctx]);

  const setVegOnlyFallback = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setVegOnlyState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      persistVeg(next);
      return next;
    });
  }, []);

  if (ctx) return ctx;

  return {
    search,
    setSearch,
    vegOnly,
    setVegOnly: setVegOnlyFallback,
    sort,
    setSort,
    rating4Plus,
    setRating4Plus,
    lowestPrice,
    setLowestPrice,
  };
}

/** Appends `?veg=1` when hub veg mode is on */
export function withVegQuery(path: string, vegOnly: boolean): string {
  if (!vegOnly) return path;
  if (/[?&]veg=/.test(path)) return path;
  return `${path}${path.includes("?") ? "&" : "?"}veg=1`;
}

/** Titles/names that clearly imply non-veg — hide when veg mode is on */
export function looksNonVegCopy(...parts: Array<string | null | undefined>): boolean {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text.trim()) return false;
  return /\b(non[\s-]?veg|chicken|mutton|fish|prawn|shrimp|egg|eggs|meat|beef|pork|lamb|keema|kebab|kabab|shawarma|grill|bbq|barbecue|biryani|fish fry|butter chicken|tandoori chicken)\b/i.test(
    text,
  );
}
