"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type CrmShellContextValue = {
  navOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
};

const CrmShellContext = createContext<CrmShellContextValue | null>(null);

export function CrmShellProvider({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const closeNav = useCallback(() => setNavOpen(false), []);
  const openNav = useCallback(() => setNavOpen(true), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  // Close drawer after navigation on mobile
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Escape closes drawer
  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  const value = useMemo(
    () => ({ navOpen, openNav, closeNav, toggleNav }),
    [navOpen, openNav, closeNav, toggleNav],
  );

  return <CrmShellContext.Provider value={value}>{children}</CrmShellContext.Provider>;
}

export function useCrmShell() {
  const ctx = useContext(CrmShellContext);
  if (!ctx) {
    throw new Error("useCrmShell must be used within CrmShellProvider");
  }
  return ctx;
}
