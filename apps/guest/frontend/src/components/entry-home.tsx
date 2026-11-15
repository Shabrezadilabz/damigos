"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EntryIntro } from "@/components/entry-intro";
import { YummLogo } from "@/components/yumm-logo";
import {
  fetchHubPerks,
  fetchHubRestaurants,
  type HubPerkRailItem,
  type HubRestaurant,
} from "@/lib/api";
import { FOOD } from "@/lib/hub-media";

const CATEGORIES = [
  { title: "Biryani", href: "/hub/search?q=biryani", image: FOOD.biryani },
  { title: "South Indian", href: "/hub/search?q=dosa", image: FOOD.dosa },
  { title: "Grill", href: "/hub/search?q=grill", image: FOOD.grill },
  { title: "Bowls", href: "/hub/search?q=bowl", image: FOOD.bowl },
  { title: "Desserts", href: "/hub/search?q=dessert", image: FOOD.dessert },
  { title: "Shawarma", href: "/hub/search?q=shawarma", image: FOOD.shawarma },
] as const;

export function EntryHome() {
  const [offers, setOffers] = useState<HubPerkRailItem[]>([]);
  const [kitchens, setKitchens] = useState<HubRestaurant[]>([]);
  const [offersState, setOffersState] = useState<"loading" | "ready" | "error">("loading");
  const [kitchensState, setKitchensState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    void fetchHubPerks()
      .then((row) => {
        setOffers(row.rail);
        setOffersState("ready");
      })
      .catch(() => setOffersState("error"));
    void fetchHubRestaurants()
      .then((rows) => {
        setKitchens(rows.slice(0, 6));
        setKitchensState("ready");
      })
      .catch(() => setKitchensState("error"));
  }, []);

  return (
    <div className="min-h-dvh bg-[#FFF9F2] text-[#261522]">
      <EntryIntro offers={offers} />
      <header className="yumm-frame flex items-center justify-between px-4 py-4">
        <YummLogo className="w-[120px]" priority />
        <Link href="/hub" className="pressable inline-flex min-h-11 items-center rounded-full bg-[#381932] px-5 text-[14px] font-bold text-[#FFF3E6]">
          BOOK NOW
        </Link>
      </header>

      <main>
        <section className="yumm-frame grid items-center gap-8 px-4 pb-12 lg:grid-cols-2">
          <div className="yumm-reveal">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D9A441]">Direct from the kitchen</p>
            <h1 className="mt-3 font-[family-name:var(--font-jakarta)] text-[40px] font-extrabold leading-[0.95] tracking-tight sm:text-[56px]">
              Good food. Great mood.
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#806D7B]">
              YUMM lists neighbourhood kitchens that are open for direct orders. Browse a menu, send the order, and follow packaging delivery.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/hub" className="pressable inline-flex min-h-12 items-center rounded-full bg-[#381932] px-6 text-[15px] font-extrabold text-[#FFF3E6]">
                BOOK NOW
              </Link>
              <Link href="#kitchens" className="pressable inline-flex min-h-12 items-center rounded-full border border-[#381932] px-6 text-[15px] font-bold text-[#381932]">
                Explore Kitchens
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOOD.biryani} alt="Biryani" className="col-span-2 aspect-[16/10] w-full rounded-[28px] object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOOD.thali} alt="" className="aspect-square w-full rounded-[24px] object-cover" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOOD.bowl} alt="" className="aspect-square w-full rounded-[24px] object-cover" loading="lazy" />
          </div>
        </section>

        <section className="yumm-frame px-4 pb-12">
          <h2 className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold">Why YUMM?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Discover kitchens", "Open the hub and see kitchens that are accepting direct orders."],
              ["Explore the menu", "Each kitchen page shows the dishes it is actually selling."],
              ["Order in the app", "Add dishes, confirm the address, and continue to checkout."],
              ["Follow delivery", "Active orders show the kitchen status through to delivery."],
              ["Published offers", "A perk appears only when that kitchen has configured it."],
            ].map(([title, body]) => (
              <article key={title} className="bento-card p-5">
                <h3 className="text-[16px] font-extrabold">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#806D7B]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="yumm-frame px-4 pb-12">
          <h2 className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold">Today&apos;s Offers</h2>
          {offersState === "loading" ? <p className="mt-3 text-[14px] text-[#806D7B]">Loading published offers…</p> : null}
          {offersState === "error" ? <p className="mt-3 text-[14px] font-semibold text-[#D94B55]">Offers could not be loaded.</p> : null}
          {offersState === "ready" && offers.length === 0 ? (
            <p className="mt-3 text-[14px] text-[#806D7B]">No offers are published right now.</p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 6).map((offer) => (
              <Link key={offer.id} href={offer.href || "/hub"} className="bento-card bento-interactive p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D9A441]">{offer.badge}</p>
                <p className="mt-2 text-[18px] font-extrabold">{offer.title}</p>
                <p className="mt-1 text-[13px] text-[#806D7B]">{offer.kitchenName}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="yumm-frame px-4 pb-12">
          <h2 className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold">Popular food categories</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat) => (
              <Link key={cat.title} href={cat.href} className="bento-card bento-interactive overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cat.image} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                <p className="px-3 py-3 text-[14px] font-bold">{cat.title}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="kitchens" className="yumm-frame scroll-mt-6 px-4 pb-12">
          <h2 className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold">Featured kitchens</h2>
          {kitchensState === "loading" ? <p className="mt-3 text-[14px] text-[#806D7B]">Loading kitchens…</p> : null}
          {kitchensState === "error" ? <p className="mt-3 text-[14px] font-semibold text-[#D94B55]">Kitchens could not be loaded.</p> : null}
          {kitchensState === "ready" && kitchens.length === 0 ? (
            <p className="mt-3 text-[14px] text-[#806D7B]">No kitchens are listed right now.</p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kitchens.map((kitchen) => (
              <Link key={kitchen.id} href={kitchen.menuPath || `/r/${kitchen.id}/menu`} className="bento-card bento-interactive p-5">
                <p className="text-[18px] font-extrabold">{kitchen.name}</p>
                <p className="mt-1 text-[13px] text-[#806D7B]">{kitchen.city || "Direct kitchen"}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="yumm-frame px-4 pb-12">
          <h2 className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold">How YUMM works</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["1", "Explore", "Open the kitchens that are taking orders."],
              ["2", "Choose", "Pick dishes from that kitchen’s menu."],
              ["3", "Order", "Confirm the address and place the order."],
              ["4", "Enjoy", "Follow the kitchen until the food arrives."],
            ].map(([n, title, body]) => (
              <li key={n} className="bento-card p-5">
                <p className="text-[12px] font-bold text-[#D9A441]">{n}</p>
                <p className="mt-2 text-[16px] font-extrabold">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#806D7B]">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="yumm-frame px-4 pb-16">
          <div className="rounded-[32px] bg-[#381932] px-6 py-10 text-center text-[#FFF3E6] sm:px-10">
            <h2 className="font-[family-name:var(--font-jakarta)] text-[32px] font-extrabold leading-tight">
              Ready to satisfy your cravings?
            </h2>
            <Link href="/hub" className="pressable mt-6 inline-flex min-h-12 items-center rounded-full bg-[#D9A441] px-6 text-[15px] font-extrabold text-[#381932]">
              BOOK NOW
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
