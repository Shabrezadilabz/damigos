import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { GuestErrorContent } from "@/lib/guest-error-copy";

type Props = {
  content: GuestErrorContent;
  restaurantName?: string;
  detail?: string;
  variant?: "error" | "warning" | "neutral";
  /** Extra cards (payment details, etc.) */
  children?: ReactNode;
};

export function GuestErrorView({
  content,
  restaurantName,
  detail,
  variant = "error",
  children,
}: Props) {
  const ring =
    variant === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : variant === "neutral"
        ? "border-border bg-muted/40"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-10">
      <div className="flex flex-col items-center text-center">
        <div
          className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 ${ring}`}
        >
          <span className="text-2xl font-bold" aria-hidden>
            !
          </span>
        </div>
        {content.badge && (
          <span className="mb-2 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {content.badge}
          </span>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
          {content.errId}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">{content.title}</h1>
        {restaurantName && (
          <p className="mt-1 text-sm font-medium text-primary">{restaurantName}</p>
        )}
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/70">{content.body}</p>
        {detail && <p className="mt-2 text-xs text-foreground/50">{detail}</p>}
      </div>

      {children ? <div className="mt-6 w-full space-y-3">{children}</div> : null}

      <div className="mt-8 flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href={content.primaryCta.href}>{content.primaryCta.label}</Link>
        </Button>
        {content.secondaryCta && (
          <Button variant="outline" asChild className="w-full">
            <Link href={content.secondaryCta.href}>{content.secondaryCta.label}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
