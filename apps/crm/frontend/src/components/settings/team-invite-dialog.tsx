"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  fetchCrmTeam,
  inviteCrmTeamMember,
  type CrmTeamMember,
} from "@/lib/api";

export function TeamInviteDialog({
  open,
  onClose,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"KITCHEN" | "REDEEM">("KITCHEN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<CrmTeamMember[]>([]);

  useEffect(() => {
    if (!open) return;
    void fetchCrmTeam(restaurantId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [open, restaurantId]);

  if (!open) return null;

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await inviteCrmTeamMember({
        restaurantId,
        phone,
        role,
        displayName: name.trim() || undefined,
      });
      setMessage(
        res.alreadyMember
          ? `••••${res.phoneLast4} already has ${res.role} access.`
          : `Invited ••••${res.phoneLast4} as ${res.role}. ${res.loginHint}`,
      );
      setPhone("");
      setName("");
      setMembers(await fetchCrmTeam(restaurantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="team-invite-dialog"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Invite kitchen team</h2>
            <p className="text-xs text-on-surface-variant">
              Kitchen staff only see Orders (list + kitchen board) — not Menu, Grow, or Settings.
            </p>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-surface-container-high" onClick={onClose}>
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <form onSubmit={(e) => void onInvite(e)} className="space-y-3 p-5">
          <label className="block text-sm">
            <span className="font-semibold">Mobile number</span>
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 font-mono text-sm"
              placeholder="10-digit phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              data-testid="team-invite-phone"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Name (optional)</span>
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm"
              placeholder="Ravi · kitchen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Role</span>
            <select
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "KITCHEN" | "REDEEM")}
            >
              <option value="KITCHEN">Kitchen — orders board only</option>
              <option value="REDEEM">Redeem counter</option>
            </select>
          </label>
          <Button type="submit" className="w-full" disabled={busy || phone.replace(/\D/g, "").length < 10}>
            {busy ? "Inviting…" : "Send invite access"}
          </Button>
          {message ? <p className="text-sm text-[#24963F]">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>

        <div className="border-t border-outline-variant/40 px-5 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Current team
          </p>
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {members.map((m) => (
              <li key={`${m.userId}-${m.role}`} className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {m.displayName ?? "Staff"} · ••••{m.phoneLast4 ?? "????"}
                </span>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase">
                  {m.role.replace(/_/g, " ")}
                </span>
              </li>
            ))}
            {!members.length ? (
              <li className="text-xs text-on-surface-variant">No invited staff yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
