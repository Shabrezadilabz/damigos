"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type HubSort = "relevancy" | "rating" | "eta" | "price";

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

export function HubFiltersProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [sort, setSort] = useState<HubSort>("relevancy");
  const [rating4Plus, setRating4Plus] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);

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
  const [vegOnly, setVegOnly] = useState(false);
  const [sort, setSort] = useState<HubSort>("relevancy");
  const [rating4Plus, setRating4Plus] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);

  if (ctx) return ctx;

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
