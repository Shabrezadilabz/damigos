"use client";

import { useEffect, useMemo, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";

const REMINDERS_KEY = "damigos_guest_offer_reminders";

type OfferCard = {
  id: string;
  title: string;
  when: string;
  kind: "festival" | "weekend" | "platform";
  blurb: string;
};

const UPCOMING: OfferCard[] = [
  {
    id: "weekend-sat",
    title: "Weekend kitchen specials",
    when: "Every Sat–Sun",
    kind: "weekend",
    blurb: "Extra Direct Perks on packaging scans this weekend.",
  },
  {
    id: "festival-diwali",
    title: "Festival feast week",
    when: "Next festival window",
    kind: "festival",
    blurb: "Festive menus + first-order free delivery reminders.",
  },
  {
    id: "platform-midweek",
    title: "Midweek spin boost",
    when: "Wed–Thu",
    kind: "platform",
    blurb: "Higher chance packaging QR spins for kitchen coins.",
  },
];

function readReminders(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReminders(ids: string[]) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(ids));
}

export default function MeOffersPage() {
  const [reminders, setReminders] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setReminders(readReminders());
  }, []);

  const cards = useMemo(() => UPCOMING, []);

  function toggleReminder(id: string, title: string) {
    setReminders((prev) => {
      const on = prev.includes(id);
      const next = on ? prev.filter((x) => x !== id) : [...prev, id];
      writeReminders(next);
      setNote(on ? `Reminder off for ${title}` : `We'll nudge you for ${title}`);
      if (!on && "Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      return next;
    });
  }

  return (
    <MeSubpageShell title="Upcoming offers">
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Festival, weekend, and platform perks — set a reminder so you don&apos;t miss them.
      </p>
      {note ? <p className="mb-3 text-[12px] font-semibold text-success">{note}</p> : null}
      <ul className="space-y-3">
        {cards.map((c) => {
          const on = reminders.includes(c.id);
          return (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-surface-container-lowest p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    {c.kind} · {c.when}
                  </p>
                  <p className="mt-1 text-[16px] font-bold">{c.title}</p>
                  <p className="mt-1 text-[13px] text-on-surface-variant">{c.blurb}</p>
                </div>
                <MaterialIcon
                  name={c.kind === "festival" ? "celebration" : c.kind === "weekend" ? "weekend" : "loyalty"}
                  className="text-[28px] text-primary"
                />
              </div>
              <button
                type="button"
                className={`pressable mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                  on ? "bg-primary text-primary-foreground" : "border border-border bg-surface-container-low"
                }`}
                onClick={() => toggleReminder(c.id, c.title)}
              >
                <MaterialIcon name={on ? "notifications_active" : "notification_add"} className="text-[16px]" />
                {on ? "Reminder on" : "Remind me"}
              </button>
            </li>
          );
        })}
      </ul>
    </MeSubpageShell>
  );
}
