"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import { fetchMe, saveGuestConsents } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

const PREFS_KEY = "damigos_guest_app_prefs";

type AppPrefs = {
  pushHints: boolean;
  locationHints: boolean;
  marketingEmail: boolean;
};

function readPrefs(): AppPrefs {
  if (typeof window === "undefined") {
    return { pushHints: true, locationHints: true, marketingEmail: false };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { pushHints: true, locationHints: true, marketingEmail: false };
    return { ...{ pushHints: true, locationHints: true, marketingEmail: false }, ...JSON.parse(raw) };
  } catch {
    return { pushHints: true, locationHints: true, marketingEmail: false };
  }
}

function writePrefs(p: AppPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export default function MeSettingsPage() {
  const [prefs, setPrefs] = useState<AppPrefs>({
    pushHints: true,
    locationHints: true,
    marketingEmail: false,
  });
  const [tx, setTx] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [game, setGame] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    const token = getGuestToken();
    if (!token) return;
    void fetchMe(token)
      .then((me) => {
        setTx(me.consents.transactional);
        setMarketing(me.consents.marketing);
        setGame(me.consents.game);
      })
      .catch(() => undefined);
  }, []);

  function patchPrefs(next: Partial<AppPrefs>) {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      writePrefs(merged);
      return merged;
    });
  }

  async function requestBrowserPermission(kind: "notifications" | "geolocation") {
    setNote(null);
    setError(null);
    try {
      if (kind === "notifications") {
        if (!("Notification" in window)) {
          setError("Notifications are not supported in this browser.");
          return;
        }
        const result = await Notification.requestPermission();
        setNote(`Notification permission: ${result}`);
        patchPrefs({ pushHints: result === "granted" });
      } else {
        if (!navigator.geolocation) {
          setError("Location is not supported in this browser.");
          return;
        }
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              setNote("Location permission granted.");
              patchPrefs({ locationHints: true });
              resolve();
            },
            (err) => {
              setError(
                err.code === err.PERMISSION_DENIED
                  ? "Location permission denied. Enable it in browser site settings."
                  : "Could not read location.",
              );
              patchPrefs({ locationHints: false });
              resolve();
            },
            { timeout: 10000 },
          );
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permission request failed");
    }
  }

  async function saveConsents() {
    const token = getGuestToken();
    if (!token) {
      setError("Sign in to save WhatsApp consent preferences.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveGuestConsents(token, {
        transactional: tx,
        marketing,
        game,
      });
      setNote("Consent preferences saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save consents");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MeSubpageShell title="App settings">
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Permissions, notifications, and marketing preferences. Profile name lives under Edit;
        addresses are separate.
      </p>

      <section className="mb-3 overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-border">
        <p className="border-b border-border/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          Device permissions
        </p>
        <button
          type="button"
          className="pressable flex w-full items-center gap-3 px-4 py-3.5 text-left"
          onClick={() => void requestBrowserPermission("notifications")}
        >
          <MaterialIcon name="notifications" className="text-[22px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Notifications</span>
            <span className="block text-[12px] text-on-surface-variant">
              Order updates &amp; offer alerts
            </span>
          </span>
          <MaterialIcon name="chevron_right" className="text-[20px] text-on-surface-variant" />
        </button>
        <button
          type="button"
          className="pressable flex w-full items-center gap-3 border-t border-border/60 px-4 py-3.5 text-left"
          onClick={() => void requestBrowserPermission("geolocation")}
        >
          <MaterialIcon name="my_location" className="text-[22px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Location</span>
            <span className="block text-[12px] text-on-surface-variant">
              Checkout GPS &amp; delivery accuracy
            </span>
          </span>
          <MaterialIcon name="chevron_right" className="text-[20px] text-on-surface-variant" />
        </button>
      </section>

      <section className="mb-3 space-y-3 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          In-app preferences
        </p>
        {(
          [
            ["pushHints", "Show push / order tips", prefs.pushHints],
            ["locationHints", "Prefer GPS at checkout", prefs.locationHints],
            ["marketingEmail", "Email me kitchen offers", prefs.marketingEmail],
          ] as const
        ).map(([key, label, on]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-[14px] font-semibold">
            {label}
            <button
              type="button"
              role="switch"
              aria-checked={on}
              className={`pressable relative h-6 w-11 rounded-full transition-colors ${
                on ? "bg-success" : "bg-surface-container-high"
              }`}
              onClick={() => patchPrefs({ [key]: !on })}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-[left] ${
                  on ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
        ))}
      </section>

      <section className="mb-3 space-y-3 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          WhatsApp consents
        </p>
        {(
          [
            ["tx", "Order & delivery messages", tx, setTx, true],
            ["mkt", "Marketing offers", marketing, setMarketing, false],
            ["game", "Spark games & rewards", game, setGame, false],
          ] as const
        ).map(([key, label, on, setOn, locked]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-[14px] font-semibold">
            {label}
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={locked && on}
              className={`pressable relative h-6 w-11 rounded-full transition-colors disabled:opacity-70 ${
                on ? "bg-success" : "bg-surface-container-high"
              }`}
              onClick={() => {
                if (locked) return;
                setOn(!on);
              }}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-[left] ${
                  on ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
        ))}
        <button
          type="button"
          disabled={saving}
          className="pressable flex h-11 w-full items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-on-primary disabled:opacity-60"
          onClick={() => void saveConsents()}
        >
          {saving ? "Saving…" : "Save WhatsApp consents"}
        </button>
      </section>

      <div className="mb-3 overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-border">
        <Link href="/me/edit" className="pressable flex items-center gap-3 px-4 py-3.5">
          <MaterialIcon name="person" className="text-[22px]" />
          <span className="flex-1 text-[15px] font-semibold">Edit profile details</span>
          <MaterialIcon name="chevron_right" className="text-[20px] text-on-surface-variant" />
        </Link>
        <Link
          href="/me/addresses"
          className="pressable flex items-center gap-3 border-t border-border/60 px-4 py-3.5"
        >
          <MaterialIcon name="location_on" className="text-[22px]" />
          <span className="flex-1 text-[15px] font-semibold">Delivery addresses</span>
          <MaterialIcon name="chevron_right" className="text-[20px] text-on-surface-variant" />
        </Link>
      </div>

      {note ? <p className="text-center text-[13px] font-semibold text-success">{note}</p> : null}
      {error ? <p className="text-center text-sm text-red-700">{error}</p> : null}
    </MeSubpageShell>
  );
}
