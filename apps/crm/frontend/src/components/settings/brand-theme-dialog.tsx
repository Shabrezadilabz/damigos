"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { fetchCrmBrandKit, patchCrmBrandKit } from "@/lib/api";
import { applyCrmTheme, storeCrmTheme } from "@/lib/crm-theme";

const PRESETS = [
  { name: "QA Ink", primary: "#171717", background: "#FAFAFA", accent: "#EAFF81" },
  { name: "Crimson", primary: "#B7122A", background: "#FCF9F8", accent: "#775600" },
  { name: "Forest", primary: "#1B4332", background: "#F4F7F5", accent: "#95D5B2" },
  { name: "Indigo", primary: "#312E81", background: "#F8F7FC", accent: "#A5B4FC" },
  { name: "Amber", primary: "#B45309", background: "#FFFBEB", accent: "#78350F" },
  { name: "Slate", primary: "#334155", background: "#F8FAFC", accent: "#64748B" },
] as const;

export function BrandThemeDialog({
  open,
  onClose,
  restaurantId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  onSaved?: (primary: string) => void;
}) {
  const [primary, setPrimary] = useState("#171717");
  const [background, setBackground] = useState("#FAFAFA");
  const [accent, setAccent] = useState("#EAFF81");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetchCrmBrandKit(restaurantId)
      .then((kit) => {
        setPrimary(kit.primaryColor);
        setBackground(kit.backgroundColor);
        setAccent(kit.accentColor);
        setLogoDataUrl(kit.logoDataUrl ?? null);
      })
      .catch(() => undefined);
  }, [open, restaurantId]);

  if (!open) return null;

  function previewLocal() {
    applyCrmTheme({ primaryColor: primary, backgroundColor: background, accentColor: accent });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const kit = await patchCrmBrandKit(restaurantId, {
        primaryColor: primary,
        backgroundColor: background,
        accentColor: accent,
        logoDataUrl,
      });
      const theme = {
        primaryColor: kit.primaryColor,
        backgroundColor: kit.backgroundColor,
        accentColor: kit.accentColor,
      };
      storeCrmTheme(theme);
      applyCrmTheme(theme);
      onSaved?.(kit.primaryColor);
      setMessage("Theme saved for the full CRM.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="brand-theme-dialog"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Brand &amp; theme</h2>
            <p className="text-xs text-on-surface-variant">
              Colors apply across CRM chrome, buttons, and accents for this kitchen.
            </p>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-surface-container-high" onClick={onClose}>
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <form onSubmit={(e) => void onSave(e)} className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="flex items-center gap-2 rounded-lg border border-outline-variant/40 px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-container-low"
                onClick={() => {
                  setPrimary(p.primary);
                  setBackground(p.background);
                  setAccent(p.accent);
                  applyCrmTheme({
                    primaryColor: p.primary,
                    backgroundColor: p.background,
                    accentColor: p.accent,
                  });
                }}
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.primary }} />
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="font-semibold">Primary</span>
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-outline-variant/40 bg-transparent"
                value={primary}
                onChange={(e) => {
                  setPrimary(e.target.value.toUpperCase());
                  previewLocal();
                }}
              />
              <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">{primary}</span>
            </label>
            <label className="text-sm">
              <span className="font-semibold">Background</span>
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-outline-variant/40 bg-transparent"
                value={background}
                onChange={(e) => {
                  setBackground(e.target.value.toUpperCase());
                  previewLocal();
                }}
              />
              <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">{background}</span>
            </label>
            <label className="text-sm">
              <span className="font-semibold">Accent</span>
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-outline-variant/40 bg-transparent"
                value={accent}
                onChange={(e) => {
                  setAccent(e.target.value.toUpperCase());
                  previewLocal();
                }}
              />
              <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">{accent}</span>
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-semibold">Kitchen logo (optional)</span>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">
              Shown on the guest hub card. PNG/JPG/WebP · under ~800KB.
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-2 block w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 900_000) {
                  setError("Logo too large — keep under 900KB");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setLogoDataUrl(typeof reader.result === "string" ? reader.result : null);
                  setError(null);
                };
                reader.readAsDataURL(file);
              }}
            />
            {logoDataUrl ? (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoDataUrl}
                  alt="Kitchen logo preview"
                  className="h-14 w-14 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-primary underline"
                  onClick={() => setLogoDataUrl(null)}
                >
                  Remove logo
                </button>
              </div>
            ) : null}
          </label>

          <div className="rounded-xl border border-outline-variant/40 p-4" style={{ backgroundColor: background }}>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Live preview</p>
            <button
              type="button"
              className="mt-2 rounded-lg px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              Primary button
            </button>
            <p className="mt-2 text-xs font-semibold" style={{ color: accent }}>
              Accent · SLA / tertiary labels
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save CRM theme"}
            </Button>
          </div>
          {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
