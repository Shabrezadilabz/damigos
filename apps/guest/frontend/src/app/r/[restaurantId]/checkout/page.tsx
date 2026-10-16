import { CheckoutGate } from "@/components/checkout-gate";
import { CheckoutReview } from "@/components/checkout-review";

/** G-S3 + mock pay P0 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return (
    <CheckoutGate>
      <main className="mx-auto min-h-dvh max-w-lg p-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Checkout</h1>
        <div className="mt-4">
          <CheckoutReview restaurantId={restaurantId} />
        </div>
      </main>
    </CheckoutGate>
  );
}
