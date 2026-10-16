import { GuestErrorView } from "@/components/guest-error-view";
import { PAYMENT_FAILED_COPY } from "@/lib/guest-error-copy";
import { formatInr } from "@/lib/api";

/** G-11 — payment failed / retry */
export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{
    restaurantId?: string;
    totalPaise?: string;
    reason?: string;
  }>;
}) {
  const { restaurantId, totalPaise, reason } = await searchParams;
  const total = totalPaise ? Number(totalPaise) : NaN;
  const hasAmount = !Number.isNaN(total) && total > 0;

  const primaryHref = restaurantId
    ? `/r/${restaurantId}/checkout`
    : PAYMENT_FAILED_COPY.primaryCta.href;

  const content = {
    ...PAYMENT_FAILED_COPY,
    primaryCta: { label: "Try payment again", href: primaryHref },
    secondaryCta: restaurantId
      ? { label: "Back to menu", href: `/r/${restaurantId}/menu` }
      : { label: "Your orders", href: "/orders" },
  };

  return (
    <GuestErrorView content={content}>
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
        {hasAmount && (
          <div className="flex items-center justify-between pb-2">
            <span className="text-foreground/60">Attempted amount</span>
            <span className="font-bold tabular-nums text-primary">{formatInr(total)}</span>
          </div>
        )}
        {reason && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-red-900">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-800/80">Failure reason</p>
            <p className="mt-0.5 text-sm font-medium">{reason}</p>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-border bg-background p-4 text-left text-sm text-foreground/70">
        <p className="font-semibold text-foreground">Quick tips</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Check mobile data or Wi‑Fi</li>
          <li>Confirm UPI limits with your bank</li>
          <li>Wait a few minutes if your bank shows “pending”</li>
        </ul>
      </div>
    </GuestErrorView>
  );
}
