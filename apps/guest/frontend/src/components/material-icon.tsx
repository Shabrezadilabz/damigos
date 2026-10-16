import { cn } from "@/lib/utils";

export function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("material-symbols-outlined leading-none", className)} aria-hidden>
      {name}
    </span>
  );
}
