"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { fetchPayoutSettings, patchPayoutPos, type PayoutSettings } from "@/lib/api";

/** C-06.03 payout + POS stub */
export function SettingsPayoutPanel({ embedded = false }: { embedded?: boolean }) {
  const { restaurantId, loading: ctxLoading } = useCrmRestaurant();
  const [data, setData] = useState<PayoutSettings | null>(null);
  const [petpooja, setPetpooja] = useState("");
  const [restroworks, setRestroworks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    void fetchPayoutSettings(restaurantId)
      .then((p) => {
        setData(p);
        setPetpooja(p.pos.petpoojaOutletId ?? "");
        setRestroworks(p.pos.restroworksLocationId ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [restaurantId]);

  async function onSave() {
    if (!restaurantId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await patchPayoutPos(restaurantId, {
        petpoojaOutletId: petpooja.trim() || null,
        restroworksLocationId: restroworks.trim() || null,
      });
      setData(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading) return <p className="text-sm text-foreground/60">Loading…</p>;
  if (!restaurantId) {
    return <p className="text-sm text-red-700">Log in as owner to manage payout settings.</p>;
  }

  return (
    <section
      className={
        embedded
          ? "space-y-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm"
          : "mt-8 space-y-4 rounded-xl border border-border bg-background p-4 shadow-sm"
      }
    >
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">
          Payout &amp; POS
        </h2>
        <p className="text-xs text-on-surface-variant">
          Razorpay Route status is read-only in dev; POS IDs are stored for future sync.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div
        data-testid="payout-razorpay-status"
        className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm"
      >
        <p className="text-xs font-semibold uppercase text-foreground/50">Razorpay linked account</p>
        <p className="mt-1 font-medium">{data?.razorpay.kycLabel ?? "…"}</p>
        {data?.razorpay.linkedAccountId ? (
          <p className="mt-0.5 font-mono text-xs text-foreground/60">{data.razorpay.linkedAccountId}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold text-foreground/70">Petpooja outlet ID</span>
          <input
            data-testid="payout-petpooja-input"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            value={petpooja}
            onChange={(e) => setPetpooja(e.target.value)}
            placeholder="e.g. PP-OUTLET-001"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-foreground/70">Restroworks location ID</span>
          <input
            data-testid="payout-restroworks-input"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            value={restroworks}
            onChange={(e) => setRestroworks(e.target.value)}
            placeholder="e.g. RW-LOC-001"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={saving} data-testid="payout-pos-save" onClick={() => void onSave()}>
          {saving ? "Saving…" : "Save POS IDs"}
        </Button>
        {saved && (
          <span className="text-xs font-semibold text-emerald-800" data-testid="payout-pos-saved">
            Saved
          </span>
        )}
      </div>
    </section>
  );
}
