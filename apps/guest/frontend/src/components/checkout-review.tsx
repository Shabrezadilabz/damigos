"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { loadRazorpayCheckoutScript, openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { CheckoutDelivery } from "@/components/checkout-delivery";
import { CrossByNearbyStrip } from "@/components/cross-by-nearby-strip";

import {
  applyCartClaim,
  applyCartLoyalty,
  fetchCart,
  fetchRewardClaims,
  formatInr,
  confirmStubCheckout,
  confirmStubCheckoutGroup,
  fetchCheckoutConfig,
  fetchCheckoutGroupPreview,
  mockPay,
  mockPayCheckoutGroup,
  prepareCheckout,
  prepareCheckoutGroup,
  verifyRazorpayCheckout,
  verifyRazorpayCheckoutGroup,
  type CartResponse,
  type CheckoutGroupPreview,
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
  const [groupPreview, setGroupPreview] = useState<CheckoutGroupPreview | null>(null);

  const load = useCallback(async () => {

    try {

      const [cartData, claimRows, group] = await Promise.all([

        fetchCart(restaurantId),

        fetchRewardClaims(restaurantId).catch(() => [] as RewardClaimOption[]),
        fetchCheckoutGroupPreview().catch(() => null),

      ]);

      setCart(cartData);

      setClaims(claimRows);
      setGroupPreview(group && group.legs.length > 1 ? group : null);

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

  async function onToggleLoyalty(apply: boolean) {
    setError(null);
    try {
      await applyCartLoyalty(restaurantId, apply);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update loyalty");
    }
  }



  function goTrack(path: string, checkoutGroupId?: string | null) {
    const base =
      checkoutGroupId && !path.includes("/orders/group/")
        ? `/orders/group/${checkoutGroupId}`
        : path;
    const sep = base.includes("?") ? "&" : "?";
    router.push(`${base}${sep}confirmed=1`);
  }

  async function onPay() {
    setPaying(true);
    setError(null);
    const isCrossBy = Boolean(groupPreview && groupPreview.legs.length > 1);
    try {
      if (paymentMode === "stub") {
        if (isCrossBy) {
          const prepared = await prepareCheckoutGroup();
          const confirmed = await confirmStubCheckoutGroup(prepared.checkoutGroupId);
          goTrack(confirmed.trackPath, prepared.checkoutGroupId);
          return;
        }
        const prepared = await prepareCheckout(restaurantId);
        const confirmed = await confirmStubCheckout(prepared.orderId);
        goTrack(confirmed.trackPath);
        return;
      }
      if (paymentMode === "razorpay") {
        if (!razorpayKeyId) {
          setError("Razorpay keys missing on server (RAZORPAY_KEY_ID / SECRET).");
          return;
        }
        if (isCrossBy) {
          const prepared = await prepareCheckoutGroup();
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
                    const verified = await verifyRazorpayCheckoutGroup({
                      checkoutGroupId: prepared.checkoutGroupId,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    });
                    goTrack(verified.trackPath, prepared.checkoutGroupId);
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
                  goTrack(verified.trackPath);
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
      if (isCrossBy) {
        const res = await mockPayCheckoutGroup();
        goTrack(res.trackPath, res.checkoutGroupId);
        return;
      }
      const res = await mockPay(restaurantId);
      goTrack(res.trackPath);
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
  const loyaltyAvailable = cart?.loyaltyAvailablePaise ?? 0;
  const loyaltyApplied = cart?.loyaltyAppliedPaise ?? 0;
  const totalPaise = groupPreview?.totalPaise ?? cart?.totalPaise ?? 0;
  const conveniencePaise = groupPreview?.convenienceFeePaise ?? cart?.convenienceFeePaise ?? 200;
  const otherLegs = groupPreview?.legs.filter((l) => l.restaurantId !== restaurantId) ?? [];
  const isCrossByPreview = Boolean(groupPreview && groupPreview.legs.length > 1);



  return (

    <div className="space-y-4">

      <div className="rounded-2xl bg-primary px-4 py-3 text-center text-[14px] font-bold text-primary-foreground shadow-sm">
        No confusing fees. No hidden charges.
      </div>

      {loyaltyAvailable > 0 ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Kitchen loyalty
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-foreground">
                {formatInr(loyaltyAvailable)} available
              </p>
              <p className="mt-0.5 text-[12px] text-on-surface-variant">
                Optional — add credits from this kitchen if you want.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onToggleLoyalty(loyaltyApplied <= 0)}
              className={
                loyaltyApplied > 0
                  ? "shrink-0 rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-primary-foreground"
                  : "shrink-0 rounded-xl border border-primary px-3 py-2 text-[12px] font-bold text-primary"
              }
            >
              {loyaltyApplied > 0 ? "Remove" : "Add"}
            </button>
          </div>
          {loyaltyApplied > 0 ? (
            <p className="mt-2 text-[12px] font-semibold text-success">
              −{formatInr(loyaltyApplied)} applied on this bill
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface-container-lowest">

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

      <CrossByNearbyStrip restaurantId={restaurantId} />

      {otherLegs.map((leg) => (
        <div
          key={leg.restaurantId}
          className="rounded-2xl border border-border bg-surface-container-lowest p-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Cross-By · Kitchen {leg.legIndex}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold">{leg.restaurantName}</p>
          <ul className="mt-2 divide-y divide-border text-sm">
            {leg.lines.map((line, i) => (
              <li key={`${leg.restaurantId}-${i}`} className="flex justify-between gap-2 py-1.5">
                <span>
                  {line.name} × {line.quantity}
                </span>
                <span className="tabular-nums font-medium">
                  {formatInr(line.quantity * line.unitPricePaise)}
                </span>
              </li>
            ))}
          </ul>
          {leg.discountPaise > 0 ? (
            <p className="mt-2 flex justify-between text-[12px] font-semibold text-success">
              <span>
                {leg.appliedClaimBillLabel ?? "Reward"}
                {leg.appliedClaimTitle ? ` · ${leg.appliedClaimTitle}` : ""}
              </span>
              <span>−{formatInr(leg.discountPaise)}</span>
            </p>
          ) : null}
          {(leg.loyaltyAppliedPaise ?? 0) > 0 ? (
            <p className="mt-1 flex justify-between text-[12px] font-semibold text-success">
              <span>Kitchen loyalty</span>
              <span>−{formatInr(leg.loyaltyAppliedPaise ?? 0)}</span>
            </p>
          ) : null}
        </div>
      ))}

      {groupPreview && groupPreview.legs.length > 1 ? (
        <div className="rounded-xl bg-surface-container-low px-3 py-2 text-[12px] text-on-surface-variant">
          Rider:{" "}
          <strong className="text-foreground">
            {groupPreview.crossBy.riderMode === "SINGLE"
              ? "Single multi-pickup"
              : "2 separate riders"}
          </strong>
          {groupPreview.crossBy.distanceMeters != null
            ? ` · ${groupPreview.crossBy.distanceMeters} m apart`
            : null}
          {" · "}
          delivery {formatInr(groupPreview.deliveryFeePaise)}
        </div>
      ) : null}

      {(claims.length > 0 || applied) && (
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Your rewards</p>
            {applied ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                Auto-applied
              </span>
            ) : null}
          </div>
          {applied ? (
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{applied.title}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {applied.billLabel ??
                    (applied.scope === "PLATFORM_WIDE"
                      ? "D'aMigo Platform Offer"
                      : "Restaurant scoped reward")}
                </p>
                {applied.eligible ? (
                  <p className="mt-1 text-[12px] font-semibold text-success">
                    −{formatInr(applied.discountPaise)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-800">
                    Add more items to reach {formatInr(applied.minOrderPaise)} for this offer.
                  </p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-on-surface-variant underline"
                onClick={() => void onSelectClaim(null)}
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-on-surface-variant">
              No reward on this cart yet. Pick one below if you have claims.
            </p>
          )}
          {claims.length > 1 || (claims.length > 0 && !applied) ? (
            <ul className="mt-3 space-y-2 border-t border-border pt-3">
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
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {c.billLabel ??
                          (c.scope === "PLATFORM_WIDE"
                            ? "D'aMigo Platform Offer"
                            : "Restaurant scoped reward")}
                      </p>
                      {c.minOrderPaise > 0 ? (
                        <p className="text-xs text-foreground/60">
                          Min order {formatInr(c.minOrderPaise)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {isCrossByPreview ? (
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Cross-By: each kitchen keeps its own restaurant reward; a platform offer applies once.
            </p>
          ) : null}
        </div>
      )}

      <CheckoutDelivery
        restaurantId={restaurantId}
        onQuoted={onDeliveryQuoted}
        onPayAllowedChange={setDeliveryPayAllowed}
      />

      <div className="overflow-hidden rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5">
        <div className="bg-primary px-4 py-2.5 text-center text-[13px] font-bold text-white">
          No confusing fees. No hidden charges.
        </div>
        <div className="space-y-2.5 bg-[#f8f8f8] p-4">

        <div className="flex justify-between">

          <span>Cart total</span>

          <span className="tabular font-medium">{formatInr(cart?.subtotalPaise ?? 0)}</span>

        </div>

        {discountPaise > 0 && (
          <div className="flex justify-between text-success">
            <span>
              {applied?.billLabel ??
                (applied?.scope === "PLATFORM_WIDE"
                  ? "D'aMigo Platform Offer"
                  : "Restaurant scoped reward")}
              {applied ? ` (${applied.title})` : ""}
            </span>
            <span className="tabular font-semibold">−{formatInr(discountPaise)}</span>
          </div>
        )}

        {loyaltyApplied > 0 && (
          <div className="flex justify-between text-success">
            <span>Kitchen loyalty</span>
            <span className="tabular font-semibold">−{formatInr(loyaltyApplied)}</span>
          </div>
        )}

        {isCrossByPreview
          ? otherLegs.map((leg) => (
              <div key={`bill-${leg.restaurantId}`} className="space-y-1 border-t border-dashed border-border pt-2">
                <div className="flex justify-between text-foreground/70">
                  <span>{leg.restaurantName}</span>
                  <span className="tabular">{formatInr(leg.subtotalPaise)}</span>
                </div>
                {leg.discountPaise > 0 ? (
                  <div className="flex justify-between text-success">
                    <span className="text-[12px]">
                      {leg.appliedClaimBillLabel ?? "Reward"}
                      {leg.appliedClaimTitle ? ` (${leg.appliedClaimTitle})` : ""}
                    </span>
                    <span className="tabular font-semibold">−{formatInr(leg.discountPaise)}</span>
                  </div>
                ) : null}
                {(leg.loyaltyAppliedPaise ?? 0) > 0 ? (
                  <div className="flex justify-between text-success">
                    <span className="text-[12px]">Kitchen loyalty</span>
                    <span className="tabular font-semibold">
                      −{formatInr(leg.loyaltyAppliedPaise ?? 0)}
                    </span>
                  </div>
                ) : null}
              </div>
            ))
          : null}

        {(() => {
          const fee = groupPreview?.deliveryFeePaise ?? cart?.deliveryFeePaise ?? 0;
          const free =
            groupPreview?.firstOrderFree ||
            (fee === 0 && (cart?.deliveryPincode != null || groupPreview != null));
          const gross = groupPreview?.grossDeliveryFeePaise;
          if (fee > 0) {
            return (
              <div className="flex justify-between text-foreground/70">
                <span>Delivery (Shiprocket + ₹5)</span>
                <span className="tabular">{formatInr(fee)}</span>
              </div>
            );
          }
          if (free) {
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="tabular">
                    {gross != null && gross > 0 ? (
                      <span className="mr-1 text-on-surface-variant line-through">
                        {formatInr(gross)}
                      </span>
                    ) : null}
                    <span className="font-bold text-success">FREE</span>
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-primary">
                  {groupPreview?.subsidyLabel ??
                    "First-Order FREE Delivery · Sponsored by D'aMigo's"}
                </p>
              </div>
            );
          }
          return (
            <div className="flex justify-between text-foreground/70">
              <span>Delivery</span>
              <span className="tabular">{formatInr(0)}</span>
            </div>
          );
        })()}

        <div className="flex justify-between text-foreground/70">

          <span>Convenience fee</span>

          <span className="tabular">{formatInr(conveniencePaise)}</span>

        </div>

        <div className="flex justify-between text-on-surface-variant">
          <span className="line-through">Platform markup</span>
          <span className="italic">We&apos;re not those guys</span>
        </div>

        <div className="flex justify-between text-on-surface-variant">
          <span className="line-through">Packaging fees</span>
          <span className="italic">Seriously? Nope</span>
        </div>

        <div className="flex justify-between border-t border-dashed border-border pt-3 font-bold">

          <span>Total Payable</span>

          <span className="tabular text-[18px]">{formatInr(totalPaise)}</span>

        </div>

        <div className="flex items-end justify-between gap-3 pt-2">
          <p className="max-w-[12rem] text-[11px] leading-snug text-on-surface-variant">
            No surprises. No fine print. Just good food · Direct D2C.
          </p>
          <div
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center bg-primary text-center text-[7px] font-black uppercase leading-tight text-white"
            style={{
              clipPath:
                "polygon(50% 0%, 63% 12%, 80% 10%, 88% 25%, 100% 35%, 92% 50%, 100% 65%, 88% 75%, 80% 90%, 63% 88%, 50% 100%, 37% 88%, 20% 90%, 12% 75%, 0% 65%, 8% 50%, 0% 35%, 12% 25%, 20% 10%, 37% 12%)",
            }}
          >
            Direct
            <br />
            D2C
            <span className="mt-0.5 text-[10px]">✓</span>
          </div>
        </div>

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


