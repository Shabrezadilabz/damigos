"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type HubSort = "relevancy" | "rating" | "eta" | "price";

const VEG_STORAGE_KEY = "damigos.hub.vegOnly";

type HubFilters = {
  search: string;
  setSearch: (v: string) => void;
  vegOnly: boolean;
  setVegOnly: (v: boolean) => void;
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

export function HubFiltersProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnlyState] = useState(false);
  const [sort, setSort] = useState<HubSort>("relevancy");
  const [rating4Plus, setRating4Plus] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);

  useEffect(() => {
    setVegOnlyState(readStoredVeg());
  }, []);

  const setVegOnly = (v: boolean) => {
    setVegOnlyState(v);
    try {
      window.localStorage.setItem(VEG_STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

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
    [search, vegOnly, sort, rating4Plus, lowestPrice],
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

  if (ctx) return ctx;

  const setVegOnly = (v: boolean) => {
    setVegOnlyState(v);
    try {
      window.localStorage.setItem(VEG_STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return {
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
