import { CheckoutGate } from "@/components/checkout-gate";
import { CheckoutReview } from "@/components/checkout-review";
import { WaChrome } from "@/components/wa-chrome";

/** G-S3 checkout — Ownly honest bill + Razorpay */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return (
    <CheckoutGate>
      <WaChrome title="Checkout" subtitle="Secure UPI · Direct D2C" profileHref="/me" />
      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-[7.25rem]">
        <h1 className="font-display text-[24px] font-bold tracking-tight">Bill summary</h1>
        <p className="mt-1 text-[13px] text-on-surface-variant">
          Transparent fees · Packaging delivery
        </p>
        <div className="mt-4">
          <CheckoutReview restaurantId={restaurantId} />
        </div>
      </main>
    </CheckoutGate>
  );
}
