"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { fetchMe, saveGuestProfile } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

/** Soft profile edit — name + extras; phone change keeps previous number. Addresses stay on /me/addresses. */
export default function MeEditPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dietary, setDietary] = useState("");
  const [dob, setDob] = useState("");
  const [phoneLast4, setPhoneLast4] = useState<string | null>(null);
  const [prevLast4, setPrevLast4] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
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
      .then((me) => {
        setName(me.name ?? "");
        setEmail(me.email ?? "");
        setGender(me.gender ?? "");
        setDietary(me.dietaryPref ?? "");
        setDob(me.dateOfBirth?.slice(0, 10) ?? "");
        setPhoneLast4(me.phoneLast4 ?? null);
        setPrevLast4(me.previousPhoneLast4 ?? null);
      })
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
      const digits = newPhone.replace(/\D/g, "");
      await saveGuestProfile(token, {
        name: trimmed,
        email: email.trim() || null,
        gender: gender.trim() || null,
        dietaryPref: dietary.trim() || null,
        dateOfBirth: dob.trim() || null,
        ...(digits.length >= 10 ? { newPhoneE164: digits } : {}),
      });
      router.replace("/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-surface-container-low pb-10">
      <div className="relative border-b border-[#E4E4E7] bg-[#FAFAFA] px-4 pb-8 pt-safe">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/me"
            className="pressable flex h-11 w-11 items-center justify-center rounded-full text-[#171717] hover:bg-neutral-900/5"
            aria-label="Back to profile"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <h1 className="font-display text-[18px] font-medium tracking-tight text-[#171717]">Edit profile</h1>
          <span className="w-11" aria-hidden />
        </div>
      </div>

      <div className="-mt-6 rounded-t-[1.75rem] bg-background px-4 pt-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">Loading…</p>
        ) : (
          <form onSubmit={(e) => void onSave(e)} className="space-y-4">
            <div className="space-y-3 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
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

              <label className="block text-[13px] font-semibold text-on-surface-variant">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-[15px] outline-none focus:border-primary"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  disabled={saving}
                />
              </label>

              <label className="block text-[13px] font-semibold text-on-surface-variant">
                Gender
                <select
                  className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-[15px] outline-none focus:border-primary"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block text-[13px] font-semibold text-on-surface-variant">
                Date of birth
                <input
                  className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-[15px] outline-none focus:border-primary"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={saving}
                />
              </label>

              <label className="block text-[13px] font-semibold text-on-surface-variant">
                Dietary preference
                <select
                  className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-[15px] outline-none focus:border-primary"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  disabled={saving}
                >
                  <option value="">No preference</option>
                  <option value="veg">Vegetarian</option>
                  <option value="pure_veg">Pure veg</option>
                  <option value="non_veg">Non-veg</option>
                  <option value="eggetarian">Eggetarian</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
              <p className="text-[13px] font-bold">Phone (soft update)</p>
              <p className="mt-1 text-[12px] text-on-surface-variant">
                Current ···{phoneLast4 ?? "————"}
                {prevLast4 ? ` · previous ···${prevLast4}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Changing WhatsApp number keeps the old number on file. Login identity stays the same
                until you re-verify OTP.
              </p>
              <label className="mt-3 block text-[13px] font-semibold text-on-surface-variant">
                New WhatsApp number (optional)
                <input
                  className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-[15px] tracking-wide outline-none focus:border-primary"
                  inputMode="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="91XXXXXXXXXX"
                  disabled={saving}
                />
              </label>
              <Link
                href="/me/addresses"
                className="pressable mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-primary"
              >
                Manage delivery addresses separately
                <MaterialIcon name="chevron_right" className="text-[18px]" />
              </Link>
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
