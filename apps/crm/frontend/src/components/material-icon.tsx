import { cn } from "@/lib/utils";

/** Google Material Symbols (loaded in root layout). */
export function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("material-symbols-outlined leading-none", className)} aria-hidden>
      {name}
    </span>
  );
}
