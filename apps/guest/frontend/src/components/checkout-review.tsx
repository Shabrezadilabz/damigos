"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { loadRazorpayCheckoutScript, openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { CheckoutDelivery } from "@/components/checkout-delivery";

import {

  applyCartClaim,

  fetchCart,

  fetchRewardClaims,

  formatInr,

  confirmStubCheckout,
  fetchCheckoutConfig,
  mockPay,
  prepareCheckout,
  verifyRazorpayCheckout,
  type CartResponse,

  type RewardClaimOption,

} from "@/lib/api";



export function CheckoutReview({ restaurantId }: { restaurantId: string }) {

  const router = useRouter();

  const [cart, setCart] = useState<CartResponse | null>(null);

  const [claims, setClaims] = useState<RewardClaimOption[]>([]);

  const [error, setError] = useState<string | null>(null);

  const [paying, setPaying] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"mock" | "stub" | "razorpay">("mock");
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
  const [deliveryPayAllowed, setDeliveryPayAllowed] = useState(true);



  const load = useCallback(async () => {

    try {

      const [cartData, claimRows] = await Promise.all([

        fetchCart(restaurantId),

        fetchRewardClaims(restaurantId).catch(() => [] as RewardClaimOption[]),

      ]);

      setCart(cartData);

      setClaims(claimRows);

      setError(null);

    } catch (e) {

      setError(e instanceof Error ? e.message : "Load cart failed");

    }

  }, [restaurantId]);

  const onDeliveryQuoted = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void load();
    void fetchCheckoutConfig()
      .then((c) => {
        setPaymentMode(c.paymentMode);
        setRazorpayKeyId(c.razorpayKeyId);
      })
      .catch(() => setPaymentMode("mock"));
  }, [load]);



  async function onSelectClaim(claimId: string | null) {

    setError(null);

    try {

      await applyCartClaim(restaurantId, claimId);

      await load();

    } catch (e) {

      setError(e instanceof Error ? e.message : "Could not apply offer");

    }

  }



  async function onPay() {
    setPaying(true);
    setError(null);
    try {
      if (paymentMode === "stub") {
        const prepared = await prepareCheckout(restaurantId);
        const confirmed = await confirmStubCheckout(prepared.orderId);
        router.push(confirmed.trackPath);
        return;
      }
      if (paymentMode === "razorpay") {
        if (!razorpayKeyId) {
          setError("Razorpay keys missing on server (RAZORPAY_KEY_ID / SECRET).");
          return;
        }
        const prepared = await prepareCheckout(restaurantId);
        await loadRazorpayCheckoutScript();
        setPaying(false);
        await new Promise<void>((resolve, reject) => {
          openRazorpayCheckout({
            keyId: razorpayKeyId,
            amountPaise: prepared.totalPaise,
            orderId: prepared.razorpayOrderId,
            onDismiss: () => resolve(),
            onSuccess: (response) => {
              void (async () => {
                try {
                  setPaying(true);
                  const verified = await verifyRazorpayCheckout({
                    orderId: prepared.orderId,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  });
                  router.push(verified.trackPath);
                  resolve();
                } catch (err) {
                  reject(err);
                }
              })();
            },
          });
        });
        return;
      }
      const res = await mockPay(restaurantId);
      router.push(res.trackPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pay failed";
      const q = new URLSearchParams({
        restaurantId,
        reason: msg,
        totalPaise: String(totalPaise),
      });
      router.push(`/payment-failed?${q}`);
      return;
    } finally {
      setPaying(false);
    }
  }



  const applied = cart?.appliedClaim;

  const discountPaise = cart?.discountPaise ?? 0;

  const totalPaise = cart?.totalPaise ?? 0;

  const conveniencePaise = cart?.convenienceFeePaise ?? 200;



  return (

    <div className="space-y-4">

      <ul className="divide-y divide-border rounded-xl border border-border">

        {cart?.items.map((line) => (

          <li key={line.id} className="flex justify-between gap-2 p-3 text-sm">

            <span>

              {line.name} × {line.quantity}

            </span>

            <span className="tabular-nums font-medium">

              {formatInr(line.quantity * line.unitPricePaise)}

            </span>

          </li>

        ))}

        {!cart?.items.length && (

          <li className="p-4 text-sm text-foreground/60">Cart is empty.</li>

        )}

      </ul>



      {claims.length > 0 && (

        <div className="rounded-xl border border-border p-3">

          <p className="text-xs font-bold uppercase tracking-wide text-primary">Your rewards</p>

          <ul className="mt-2 space-y-2">

            {claims.map((c) => {

              const selected = applied?.claimId === c.claimId;

              return (

                <li key={c.claimId} className="flex items-start gap-2 text-sm">

                  <input

                    type="radio"

                    name="claim"

                    checked={selected}

                    onChange={() => void onSelectClaim(c.claimId)}

                    className="mt-1"

                  />

                  <div>

                    <p className="font-medium">{c.title}</p>

                    {c.minOrderPaise > 0 && (

                      <p className="text-xs text-foreground/60">

                        Min order {formatInr(c.minOrderPaise)}

                      </p>

                    )}

                  </div>

                </li>

              );

            })}

            {applied && (

              <li>

                <button

                  type="button"

                  className="text-xs text-foreground/60 underline"

                  onClick={() => void onSelectClaim(null)}

                >

                  Remove offer

                </button>

              </li>

            )}

          </ul>

          {applied && !applied.eligible && (

            <p className="mt-2 text-xs text-amber-800">

              Add more items to reach {formatInr(applied.minOrderPaise)} for this offer.

            </p>

          )}

        </div>

      )}

      <CheckoutDelivery
        restaurantId={restaurantId}
        onQuoted={onDeliveryQuoted}
        onPayAllowedChange={setDeliveryPayAllowed}
      />

      <div className="space-y-1 text-sm">

        <div className="flex justify-between">

          <span>Subtotal</span>

          <span className="tabular-nums">{formatInr(cart?.subtotalPaise ?? 0)}</span>

        </div>

        {discountPaise > 0 && (

          <div className="flex justify-between text-emerald-800">

            <span>Reward discount{applied ? ` (${applied.title})` : ""}</span>

            <span className="tabular-nums">−{formatInr(discountPaise)}</span>

          </div>

        )}

        {(cart?.deliveryFeePaise ?? 0) > 0 && (
          <div className="flex justify-between text-foreground/70">
            <span>Delivery (Shiprocket + ₹5)</span>
            <span className="tabular-nums">{formatInr(cart!.deliveryFeePaise!)}</span>
          </div>
        )}

        <div className="flex justify-between text-foreground/70">

          <span>Convenience fee</span>

          <span className="tabular-nums">{formatInr(conveniencePaise)}</span>

        </div>

        <div className="flex justify-between border-t border-border pt-2 font-bold">

          <span>Total</span>

          <span className="tabular-nums">{formatInr(totalPaise)}</span>

        </div>

      </div>



      <p className="text-xs text-foreground/60">
        Payment: {paymentMode === "mock" ? "mock UPI (P0)" : paymentMode === "stub" ? "Razorpay stub + webhook" : "Razorpay live"}
      </p>



      {error && <p className="text-sm text-red-700">{error}</p>}

      {!deliveryPayAllowed && cart?.items.length ? (
        <p className="text-sm text-amber-800">Fix delivery pincode before paying.</p>
      ) : null}

      <Button

        className="w-full"

        disabled={paying || !cart?.items.length || !deliveryPayAllowed}

        onClick={() => void onPay()}

      >

        {paying
          ? "Processing…"
          : paymentMode === "stub"
            ? "Pay with UPI (test)"
            : paymentMode === "razorpay"
              ? "Pay with UPI"
              : "Pay (mock UPI)"}

      </Button>



      <Button variant="outline" asChild className="w-full">

        <Link href={`/r/${restaurantId}/menu`}>Back to menu</Link>

      </Button>

    </div>

  );

}


