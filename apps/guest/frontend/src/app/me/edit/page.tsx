"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { fetchMe, saveGuestProfile } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

/** Guest profile edit — name for WhatsApp / orders */
export default function MeEditPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getGuestToken();
    if (!token) {
      setLoading(false);
      setError("Sign in from WhatsApp to edit your profile.");
      return;
    }
    void fetchMe(token)
      .then((me) => setName(me.name ?? ""))
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getGuestToken();
    if (!token) {
      setError("Sign in from WhatsApp to edit your profile.");
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Enter a name (at least 2 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveGuestProfile(token, trimmed);
      router.replace("/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-surface-container-low pb-10">
      <div className="relative bg-gradient-to-b from-primary to-[#92001c] px-4 pb-10 pt-safe">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/me"
            className="pressable flex h-11 w-11 items-center justify-center text-white"
            aria-label="Back to profile"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <h1 className="font-display text-[18px] font-bold text-white">Edit profile</h1>
          <span className="w-11" aria-hidden />
        </div>
      </div>

      <div className="-mt-6 rounded-t-[1.75rem] bg-[#fafafa] px-4 pt-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">Loading…</p>
        ) : (
          <form onSubmit={(e) => void onSave(e)} className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <label className="block text-[13px] font-semibold text-on-surface-variant">
                Display name
                <input
                  className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-[15px] font-semibold text-foreground outline-none focus:border-primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  maxLength={80}
                  disabled={saving}
                  data-testid="profile-edit-name"
                />
              </label>
              <p className="mt-2 text-[12px] text-on-surface-variant">
                Shown on orders and WhatsApp confirmations.
              </p>
            </div>

            {error ? (
              <p className="text-center text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving || loading}
              className="pressable flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-on-primary disabled:opacity-60"
              data-testid="profile-edit-save"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            <Link
              href="/me"
              className="pressable mx-auto block py-2 text-center text-[14px] font-semibold text-on-surface-variant"
            >
              Cancel
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
