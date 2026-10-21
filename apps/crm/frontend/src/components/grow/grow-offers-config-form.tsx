"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  fetchMenuItems,
  saveGrowOffersGame,
  type GrowOffersGamePayload,
  type MenuItemRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  GROW_FIELD_CLASS,
  MIN_ORDER_DROPDOWN,
  OFFER_PRESET_OPTIONS,
  normalizeGrowLoyaltyConfig,
  type GrowLoyaltyConfig,
  type OfferPresetId,
} from "./grow-loyalty-constants";

function Section({
  title,
  icon,
  children,
  description,
}: {
  title: string;
  icon: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-primary">
          <MaterialIcon name={icon} className="text-[20px]" />
        </span>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function OfferSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: OfferPresetId;
  onChange: (id: OfferPresetId) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <select
        className={GROW_FIELD_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value as OfferPresetId)}
      >
        {OFFER_PRESET_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MinOrderSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (paise: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <select
        className={GROW_FIELD_CLASS}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {MIN_ORDER_DROPDOWN.map((o) => (
          <option key={o.paise} value={o.paise}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {sub ? <p className="text-xs text-on-surface-variant">{sub}</p> : null}
      </div>
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

type Props = {
  restaurantId: string;
  initial: GrowOffersGamePayload;
  onSaved: (next: GrowOffersGamePayload) => void;
  onConfigChange?: (config: GrowLoyaltyConfig) => void;
};

export function GrowOffersConfigForm({ restaurantId, initial, onSaved, onConfigChange }: Props) {
  const [config, setConfig] = useState<GrowLoyaltyConfig>(() =>
    normalizeGrowLoyaltyConfig(initial.config),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);

  const weightSum = useMemo(
    () => (config.spinSegments ?? []).reduce((s, x) => s + (x.weight ?? 0), 0),
    [config.spinSegments],
  );

  useEffect(() => {
    let cancelled = false;
    fetchMenuItems(restaurantId, false)
      .then((items) => {
        if (!cancelled) setMenuItems(items.filter((i) => i.available));
      })
      .catch(() => {
        if (!cancelled) setMenuItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const next = await saveGrowOffersGame(restaurantId, config);
      onSaved(next);
      setSavedAt(new Date().toLocaleTimeString("en-IN"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function patch(partial: Partial<GrowLoyaltyConfig>) {
    setConfig((c) => {
      const next = { ...c, ...partial };
      onConfigChange?.(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5" data-testid="grow-offers-config-form">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Step 1 — configure</p>
          <p className="text-sm text-on-surface-variant">
            Set games, payback, dine-in, win-back, order thresholds, and calendar offers before campaigns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedAt ? (
            <span className="text-xs text-[#24963F]">Saved {savedAt}</span>
          ) : null}
          <Button type="button" disabled={busy} onClick={() => void onSave()}>
            {busy ? "Saving…" : "Save loyalty configuration"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Section
        title="Gamification engine"
        icon="tune"
        description="One prize pool. Guests play either spin or scratch (random when both are on) — not two separate games."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            label="Gamification engine live"
            sub="Master switch for packaging QR / table scan rewards"
            checked={config.engineEnabled}
            onChange={(engineEnabled) => patch({ engineEnabled })}
          />
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 text-xs text-on-surface-variant sm:col-span-2">
            Enable one or both game UIs. Same offers apply. If both are on, WhatsApp randomly opens spin{" "}
            <em>or</em> scratch each play.
          </div>
          <ToggleRow
            label="Spin wheel"
            sub="Fortune wheel animation"
            checked={config.spinEnabled !== false}
            onChange={(spinEnabled) => patch({ spinEnabled })}
          />
          <ToggleRow
            label="Scratch card"
            sub="Scratch-to-reveal animation"
            checked={config.scratchEnabled}
            onChange={(scratchEnabled) => patch({ scratchEnabled })}
          />
          <label className="block text-sm">
            <span className="font-semibold">Daily play limit (per guest)</span>
            <input
              type="number"
              min={0}
              max={10}
              className={GROW_FIELD_CLASS}
              value={config.dailySpinLimit}
              onChange={(e) => patch({ dailySpinLimit: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Payback / wallet credit (% of bill)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={GROW_FIELD_CLASS}
              value={config.paybackPercent}
              onChange={(e) => patch({ paybackPercent: Number(e.target.value) })}
            />
          </label>
          <MinOrderSelect
            label="Minimum cart before reward unlocks"
            value={config.minCartPaise}
            onChange={(minCartPaise) => patch({ minCartPaise })}
          />
        </div>
      </Section>

      <Section
        title="Shared prize pool — weights"
        icon="casino"
        description="Used by both spin and scratch. Weights control win chance (must total &gt; 0). Free-item rows pick a menu dish."
      >
        <p className="mb-3 text-xs text-on-surface-variant">
          Weight sum: <strong className="text-foreground">{weightSum}</strong>
          {!initial.weightsValid && weightSum <= 0 ? (
            <span className="ml-2 text-red-700">Invalid — increase weights</span>
          ) : null}
        </p>
        <ul className="space-y-3">
          {(config.spinSegments ?? []).map((seg, idx) => (
            <li
              key={seg.localId}
              className="grid gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 sm:grid-cols-12"
            >
              <input
                className={cn(GROW_FIELD_CLASS, "sm:col-span-4 mt-0")}
                value={seg.title}
                onChange={(e) => {
                  const spinSegments = [...config.spinSegments];
                  spinSegments[idx] = { ...seg, title: e.target.value };
                  patch({ spinSegments });
                }}
                placeholder="Prize label"
              />
              <select
                className={cn(GROW_FIELD_CLASS, "sm:col-span-3 mt-0")}
                value={`${seg.prizeType}:${seg.prizeValue}`}
                onChange={(e) => {
                  const [prizeType, prizeValue] = e.target.value.split(":");
                  const spinSegments = [...config.spinSegments];
                  spinSegments[idx] = {
                    ...seg,
                    prizeType,
                    prizeValue: Number(prizeValue),
                    menuItemId: prizeType === "free_item" ? seg.menuItemId : null,
                    menuItemName: prizeType === "free_item" ? seg.menuItemName : null,
                  };
                  patch({ spinSegments });
                }}
              >
                <option value="percent:10">10% off</option>
                <option value="percent:15">15% off</option>
                <option value="percent:20">20% off</option>
                <option value="flat_off_paise:5000">₹50 off</option>
                <option value="flat_off_paise:10000">₹100 off</option>
                <option value="free_item:0">Free menu item</option>
              </select>
              <label className="sm:col-span-2 text-sm">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Weight</span>
                <input
                  type="number"
                  min={1}
                  className={cn(GROW_FIELD_CLASS, "mt-0")}
                  value={seg.weight}
                  onChange={(e) => {
                    const spinSegments = [...config.spinSegments];
                    spinSegments[idx] = { ...seg, weight: Number(e.target.value) };
                    patch({ spinSegments });
                  }}
                />
              </label>
              <label className="sm:col-span-2 text-sm">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Scope</span>
                <select
                  className={cn(GROW_FIELD_CLASS, "mt-0")}
                  value={seg.scope ?? "RESTAURANT_SCOPED"}
                  onChange={(e) => {
                    const spinSegments = [...config.spinSegments];
                    spinSegments[idx] = {
                      ...seg,
                      scope: e.target.value === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED",
                    };
                    patch({ spinSegments });
                  }}
                >
                  <option value="RESTAURANT_SCOPED">Kitchen only</option>
                  <option value="PLATFORM_WIDE">Platform-wide</option>
                </select>
              </label>
              <button
                type="button"
                className="text-xs text-red-700 sm:col-span-1 sm:self-center"
                onClick={() => {
                  if (config.spinSegments.length <= 1) return;
                  patch({ spinSegments: config.spinSegments.filter((_, i) => i !== idx) });
                }}
              >
                Remove
              </button>
              {seg.prizeType === "free_item" ? (
                <label className="sm:col-span-12 block text-sm">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                    Menu item (live kitchen)
                  </span>
                  <select
                    className={cn(GROW_FIELD_CLASS, "mt-0")}
                    value={seg.menuItemId ?? ""}
                    onChange={(e) => {
                      const item = menuItems.find((m) => m.id === e.target.value);
                      const spinSegments = [...config.spinSegments];
                      spinSegments[idx] = {
                        ...seg,
                        menuItemId: item?.id ?? null,
                        menuItemName: item?.name ?? null,
                        title: item ? `Free ${item.name}` : seg.title,
                      };
                      patch({ spinSegments });
                    }}
                  >
                    <option value="">Select dish…</option>
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · ₹{(m.pricePaise / 100).toFixed(0)}
                      </option>
                    ))}
                  </select>
                  {menuItems.length === 0 ? (
                    <span className="mt-1 block text-[11px] text-amber-800">
                      No live menu items yet — publish dishes in Menu first.
                    </span>
                  ) : null}
                </label>
              ) : null}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={config.spinSegments.length >= 8}
          onClick={() =>
            patch({
              spinSegments: [
                ...config.spinSegments,
                {
                  localId: `s${Date.now()}`,
                  title: "New prize",
                  prizeType: "flat_off_paise",
                  prizeValue: 5000,
                  weight: 10,
                  scope: "RESTAURANT_SCOPED" as const,
                  menuItemId: null,
                  menuItemName: null,
                },
              ],
            })
          }
        >
          Add wheel segment
        </Button>
      </Section>

      <Section
        title="Scratch unlock threshold"
        icon="redeem"
        description="Scratch uses the shared prize pool above (same weights). This only sets when the card unlocks."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <MinOrderSelect
            label="Unlock when order is greater than"
            value={config.scratch.minOrderPaise}
            onChange={(minOrderPaise) =>
              patch({ scratch: { ...config.scratch, minOrderPaise } })
            }
          />
          <p className="self-end text-xs text-on-surface-variant">
            Prize drawn from the shared pool — no separate scratch-only offer.
          </p>
        </div>
      </Section>

      <Section
        title="Packaging channel offers"
        icon="restaurant"
        description="Welcome offer when guest scans packaging QR (Direct D2C)."
      >
        <OfferSelect
          label="Packaging welcome offer"
          value={config.dineIn.offerPresetId}
          onChange={(offerPresetId) => patch({ dineIn: { ...config.dineIn, offerPresetId } })}
        />
        <div className="mt-2">
          <ToggleRow
            label="Packaging welcome offer active"
            checked={config.dineIn.enabled}
            onChange={(enabled) => patch({ dineIn: { ...config.dineIn, enabled } })}
          />
        </div>
      </Section>

      <Section
        title="Win-back (pull-back) guests"
        icon="history"
        description="Re-engage guests who have not ordered for 15 or 30 days — pairs with Campaigns tab later."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-outline-variant/30 p-3">
            <ToggleRow
              label="15-day pullback"
              sub="No order in 15 days"
              checked={config.winback15.enabled}
              onChange={(enabled) => patch({ winback15: { ...config.winback15, enabled } })}
            />
            <OfferSelect
              label="15-day offer"
              value={config.winback15.offerPresetId}
              onChange={(offerPresetId) =>
                patch({ winback15: { ...config.winback15, offerPresetId } })
              }
            />
          </div>
          <div className="space-y-2 rounded-xl border border-outline-variant/30 p-3">
            <ToggleRow
              label="30-day pullback"
              sub="Lapsed 30+ days"
              checked={config.winback30.enabled}
              onChange={(enabled) => patch({ winback30: { ...config.winback30, enabled } })}
            />
            <OfferSelect
              label="30-day offer"
              value={config.winback30.offerPresetId}
              onChange={(offerPresetId) =>
                patch({ winback30: { ...config.winback30, offerPresetId } })
              }
            />
          </div>
        </div>
      </Section>

      <Section
        title="Order value rules"
        icon="shopping_cart"
        description="If order is greater than selected amount, apply the chosen offer (stack with guardrails)."
      >
        <ul className="space-y-3">
          {(config.orderThresholdRules ?? []).map((rule, idx) => (
            <li
              key={idx}
              className="grid gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-2 flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={rule.enabled}
                  onChange={(e) => {
                    const orderThresholdRules = [...config.orderThresholdRules];
                    orderThresholdRules[idx] = { ...rule, enabled: e.target.checked };
                    patch({ orderThresholdRules });
                  }}
                />
              </div>
              <div className="sm:col-span-5">
                <MinOrderSelect
                  label="Order greater than"
                  value={rule.minOrderPaise}
                  onChange={(minOrderPaise) => {
                    const orderThresholdRules = [...config.orderThresholdRules];
                    orderThresholdRules[idx] = { ...rule, minOrderPaise };
                    patch({ orderThresholdRules });
                  }}
                />
              </div>
              <div className="sm:col-span-5">
                <OfferSelect
                  label="Apply offer"
                  value={rule.offerPresetId}
                  onChange={(offerPresetId) => {
                    const orderThresholdRules = [...config.orderThresholdRules];
                    orderThresholdRules[idx] = { ...rule, offerPresetId };
                    patch({ orderThresholdRules });
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={config.orderThresholdRules.length >= 6}
          onClick={() =>
            patch({
              orderThresholdRules: [
                ...config.orderThresholdRules,
                { enabled: true, minOrderPaise: 59900, offerPresetId: "flat_50" },
              ],
            })
          }
        >
          Add order threshold rule
        </Button>
      </Section>

      <Section
        title="Calendar & lifecycle moments"
        icon="event"
        description="Weekend, month-end, festivals, and birthday treats — each with its own offer dropdown."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["weekend", "Weekend boost", "Fri–Sun delivery & dine-in"],
              ["monthend", "Month-end push", "Last 3 days of month"],
              ["festivals", "Festival calendar", "Diwali, Eid, Christmas, IPL, etc."],
              ["birthdays", "Birthday treat", "From guest profile / WhatsApp date"],
            ] as const
          ).map(([key, title, sub]) => {
            const k = key as keyof GrowLoyaltyConfig["calendar"];
            const row = config.calendar[k];
            return (
              <div key={key} className="space-y-2 rounded-xl border border-outline-variant/30 p-3">
                <ToggleRow
                  label={title}
                  sub={sub}
                  checked={row.enabled}
                  onChange={(enabled) =>
                    patch({ calendar: { ...config.calendar, [k]: { ...row, enabled } } })
                  }
                />
                <OfferSelect
                  label="Offer"
                  value={row.offerPresetId}
                  onChange={(offerPresetId) =>
                    patch({ calendar: { ...config.calendar, [k]: { ...row, offerPresetId } } })
                  }
                />
              </div>
            );
          })}
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="button" disabled={busy} onClick={() => void onSave()}>
          {busy ? "Saving…" : "Save loyalty configuration"}
        </Button>
      </div>
    </div>
  );
}
