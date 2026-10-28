"use client";

import Link from "next/link";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";

export default function MeAboutPage() {
  return (
    <MeSubpageShell title="About D'aMigo's">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-container-lowest p-5 shadow-sm">
          <p className="font-display text-[22px] font-extrabold tracking-tight">Direct packaging delivery</p>
          <p className="mt-2 text-[14px] leading-relaxed text-on-surface-variant">
            D&apos;aMigo&apos;s connects you to neighbourhood kitchens over WhatsApp — scan the packaging
            QR, order direct, and keep restaurant rewards without marketplace markups.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface-container-lowest shadow-sm">
          {[
            { icon: "verified", title: "WhatsApp-first", sub: "Order in the chat you already use." },
            { icon: "qr_code_2", title: "Packaging QR", sub: "Every box can unlock a kitchen perk." },
            { icon: "savings", title: "Direct perks", sub: "Loyalty stays with the kitchen you love." },
          ].map((row, i) => (
            <div
              key={row.title}
              className={`flex items-start gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <MaterialIcon name={row.icon} className="mt-0.5 text-[22px] text-primary" />
              <div>
                <p className="text-[15px] font-semibold">{row.title}</p>
                <p className="text-[13px] text-on-surface-variant">{row.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-on-surface-variant">
          App build · guest web · © {new Date().getFullYear()} D&apos;aMigo&apos;s
        </p>

        <Link href="/me/feedback" className="pressable block text-center text-[14px] font-bold text-primary">
          Send feedback or rate the app
        </Link>
      </div>
    </MeSubpageShell>
  );
}
