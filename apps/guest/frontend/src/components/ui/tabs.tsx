"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsCtx = { value: string; setValue: (v: string) => void };
const Ctx = React.createContext<TabsCtx | null>(null);

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-full border border-[#E2E5EE] bg-[#EEF0F5] p-1 shadow-inner",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(Ctx);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[13px] font-bold tracking-tight transition-all",
        active
          ? "bg-white text-[#0F1115] shadow-[0_2px_8px_rgba(15,23,42,0.1)]"
          : "text-[#475569] hover:text-[#0F1115]",
        className,
      )}
      onClick={() => ctx?.setValue(value)}
      {...props}
    />
  );
}

export function TabsContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(Ctx);
  if (ctx?.value !== value) return null;
  return <div className={cn("mt-3 focus-visible:outline-none", className)} {...props} />;
}
