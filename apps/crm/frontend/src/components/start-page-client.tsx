"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { OnboardingPendingScreen } from "@/components/onboarding-pending-screen";
import { OnboardingPromoCarousel } from "@/components/onboarding-promo-carousel";
import { OwnerLoginPanel } from "@/components/owner-login-panel";
import {
  fetchOnboardingStatus,
  submitOnboardingApplication,
  verifyFssaiLicense,
  type FssaiVerifyResponse,
} from "@/lib/api";
import { getCrmToken } from "@/lib/session";
import { cn } from "@/lib/utils";

const PENDING_APPLICATION_KEY = "damigos_crm_pending_application";

const CUISINE_TAGS = [
  "Artisanal Italian",
  "Woodfired Sourdough",
  "Craft Gelateria",
  "Antipasti Bar",
] as const;

const ONBOARDING_STEPS = [
  { label: "Entity Baseline", hint: "Legal entity, zone, and how you fulfill orders." },
  { label: "Compliance", hint: "FSSAI and regulatory checks before go-live." },
  { label: "Menu & POS", hint: "Menu import and POS adapter placeholders." },
  { label: "Review", hint: "Confirm details — we will activate your tenant before owner login unlocks." },
] as const;

const POS_ADAPTERS = [
  { id: "petpooja", name: "Petpooja", icon: "point_of_sale", color: "from-orange-100 to-orange-50" },
  { id: "urbanpiper", name: "UrbanPiper", icon: "hub", color: "from-sky-100 to-sky-50" },
  { id: "restroworks", name: "Restroworks", icon: "sync", color: "from-violet-100 to-violet-50" },
] as const;

type FulfillmentMode = "none" | "in_house" | "partner" | "hybrid";

const FULFILLMENT_MODES: { value: FulfillmentMode; label: string; badge: string }[] = [
  { value: "none", label: "No direct delivery", badge: "Pickup / dine-in only" },
  { value: "in_house", label: "In-house fleet", badge: "Own riders" },
  { value: "partner", label: "Partner courier", badge: "Dunzo / 3PL" },
  { value: "hybrid", label: "In-house + partner", badge: "In-house / Dunzo" },
];

const FULFILLMENT_RADIUS_KM = ["3", "5", "6.5", "8", "10", "12", "15"] as const;

type FssaiChoice = "verify" | "later" | "none";

const FSSAI_CHOICES: { value: FssaiChoice; label: string; hint: string }[] = [
  { value: "verify", label: "I have an FSSAI number", hint: "Verify against FoSCoS-backed registry before hub listing." },
  { value: "later", label: "Applied — number pending", hint: "Continue onboarding; add & verify in Settings when issued." },
  { value: "none", label: "Skip for now", hint: "Pilot only — hub & campaigns may stay locked until verified." },
];

const FEATURES = [
  {
    icon: "auto_stories",
    title: "Menu AI from PDF",
    badge: "Instant",
    badgeClass: "bg-primary/10 text-primary",
    iconClass: "bg-primary-fixed text-[#410007]",
    desc: "Parses modifier trees, allergen tags & dish photos in 90 seconds",
  },
  {
    icon: "qr_code_scanner",
    title: "Sticker QR rewards",
    badge: "NFC Ready",
    badgeClass: "bg-amber-100/80 text-amber-950",
    iconClass: "bg-amber-100 text-amber-950",
    desc: "Table-anchored micro rewards with zero app-download barrier",
  },
  {
    icon: "forward_to_inbox",
    title: "WhatsApp campaigns (capped)",
    badge: "Anti-spam",
    badgeClass: "bg-surface-container-high text-on-surface-variant",
    iconClass: "bg-surface-container-high text-foreground",
    desc: "Strict 1-touch weekly ceiling protects dining brand reputation",
  },
] as const;

function fieldClass() {
  return "h-11 w-full rounded-lg bg-surface-container-low px-3 text-sm text-foreground transition focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20";
}

export function StartPageClient() {
  const router = useRouter();
  const onboardingTopRef = useRef<HTMLDivElement>(null);

  const [pendingSubmittedAt, setPendingSubmittedAt] = useState<string | null>(null);
  const [activatedLoginPhone, setActivatedLoginPhone] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [legalName, setLegalName] = useState("Biryani Box Koramangala");
  const [operatorName, setOperatorName] = useState("Raj Malhotra");
  const [directorPhone, setDirectorPhone] = useState("9876543210");
  const [billingEmail, setBillingEmail] = useState("raj@biryani-box.in");
  const [metroCity, setMetroCity] = useState("Bangalore");
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
    () => new Set(["Artisanal Italian", "Woodfired Sourdough"]),
  );
  const [loginOnly, setLoginOnly] = useState(false);
  const [fssai, setFssai] = useState("");
  const [fssaiBusy, setFssaiBusy] = useState(false);
  const [fssaiError, setFssaiError] = useState<string | null>(null);
  const [fssaiOk, setFssaiOk] = useState<FssaiVerifyResponse | null>(null);
  const [fssaiChoice, setFssaiChoice] = useState<FssaiChoice>("verify");
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>("hybrid");
  const [fulfillmentRadiusKm, setFulfillmentRadiusKm] = useState<string>("6.5");
  const [dpdpAccepted, setDpdpAccepted] = useState(true);
  const [waAccepted, setWaAccepted] = useState(true);
  const [posChoice, setPosChoice] = useState<string>("petpooja");

  const fulfillmentMeta = FULFILLMENT_MODES.find((m) => m.value === fulfillmentMode)!;
  const step1Ready = dpdpAccepted && waAccepted && selectedCuisines.size > 0;
  const canContinue =
    onboardingStep === 1
      ? step1Ready
      : onboardingStep === 2
        ? fssaiChoice !== "verify" || Boolean(fssaiOk)
        : true;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_APPLICATION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          submittedAt: string;
          status?: "PENDING" | "ACTIVE";
          phone?: string;
        };
        if (parsed.status === "ACTIVE" && parsed.phone) {
          setActivatedLoginPhone(parsed.phone.replace(/\D/g, "").slice(-10));
          setShowOwnerLogin(true);
          setLoginOnly(true);
        } else if (parsed.submittedAt) {
          setPendingSubmittedAt(parsed.submittedAt);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const token = getCrmToken();
    if (!token) return;
    void fetchOnboardingStatus()
      .then((s) => {
        if (s.onboardingComplete) {
          router.replace("/");
          return;
        }
        setLoginOnly(true);
        setShowOwnerLogin(true);
      })
      .catch(() => {
        /* no-op */
      });
  }, [router]);

  async function submitForActivation() {
    setSubmitBusy(true);
    setSubmitError(null);
    const phone = directorPhone.replace(/\D/g, "").slice(-10);
    try {
      const res = await submitOnboardingApplication({
        legalName: legalName.trim(),
        operatorName: operatorName.trim(),
        phone,
        email: billingEmail.trim(),
        city: metroCity.trim(),
        cuisineTags: [...selectedCuisines],
        fssai: fssaiChoice === "verify" && fssaiOk ? fssaiOk.fssaiNumber : fssai.trim() || undefined,
        dpdpAccepted: true,
        whatsappGatewayAccepted: true,
      });
      const submittedAt = new Date().toLocaleString();
      if (res.status === "ACTIVE") {
        const loginPhone = (res.phone ?? phone).replace(/\D/g, "").slice(-10);
        sessionStorage.setItem(
          PENDING_APPLICATION_KEY,
          JSON.stringify({ submittedAt, status: "ACTIVE", phone: loginPhone }),
        );
        setActivatedLoginPhone(loginPhone);
        setPendingSubmittedAt(null);
        setShowOwnerLogin(true);
        setLoginOnly(true);
      } else {
        sessionStorage.setItem(PENDING_APPLICATION_KEY, JSON.stringify({ submittedAt, status: "PENDING" }));
        setPendingSubmittedAt(submittedAt);
        setShowOwnerLogin(false);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitBusy(false);
    }
  }

  function clearPendingDemo() {
    sessionStorage.removeItem(PENDING_APPLICATION_KEY);
    setPendingSubmittedAt(null);
    setActivatedLoginPhone(null);
    setLoginOnly(false);
    setOnboardingStep(1);
  }

  function toggleCuisine(tag: string) {
    setSelectedCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const pendingReview = Boolean(pendingSubmittedAt);
  const tenantActivated = Boolean(activatedLoginPhone);
  const ownerLoginVisible = (loginOnly || showOwnerLogin) && !pendingReview;

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-background p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col items-start justify-between gap-4 px-2 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <MaterialIcon name="restaurant_menu" className="text-[24px]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                  D&apos;aMigo&apos;s
                </span>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Hospitality CRM
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Autonomous guest intelligence &amp; direct WhatsApp ordering
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-on-surface-variant">
            <div className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-foreground">v3.4 Live Engine</span>
            </div>
            <div className="hidden items-center gap-1 sm:flex">
              <MaterialIcon name="verified_user" className="text-[18px] text-tertiary" />
              <span>DPDP Compliant Node</span>
            </div>
          </div>
        </header>

        {pendingReview ? (
          <OnboardingPendingScreen submittedAt={pendingSubmittedAt!} onClearDemo={clearPendingDemo} />
        ) : tenantActivated ? (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            <section className="rounded-2xl bg-emerald-50 px-6 py-4 text-center text-sm text-emerald-950 shadow-sm">
              <p className="font-semibold">Outlet activated for testing</p>
              <p className="mt-1 text-xs text-emerald-900/80">
                Sign in with your director mobile and OTP <strong>000000</strong> (or <strong>00000</strong>).
              </p>
              <button
                type="button"
                className="mt-2 text-[10px] underline text-emerald-900/70"
                onClick={clearPendingDemo}
              >
                Start another signup
              </button>
            </section>
            <OwnerLoginPanel
              fullBleed
              initialPhone={activatedLoginPhone ?? undefined}
              onSuccess={() => router.push("/")}
            />
          </div>
        ) : ownerLoginVisible && loginOnly ? (
          <OwnerLoginPanel fullBleed onSuccess={() => router.push("/")} />
        ) : ownerLoginVisible && showOwnerLogin && !loginOnly ? (
          <div className="mx-auto w-full max-w-lg space-y-3">
            <button
              type="button"
              className="text-xs font-semibold text-primary underline underline-offset-2"
              onClick={() => setShowOwnerLogin(false)}
            >
              ← Back to new outlet onboarding
            </button>
            <OwnerLoginPanel fullBleed onSuccess={() => router.push("/")} />
          </div>
        ) : (
        <div
          ref={onboardingTopRef}
          className={cn(
            "grid grid-cols-1 items-stretch gap-8",
            ownerLoginVisible && onboardingStep === 1 ? "lg:grid-cols-2" : "mx-auto max-w-2xl",
          )}
        >
          <section className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-md sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-2xl" />
            <div className="relative flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#410007]">
                    Step {onboardingStep} of 4
                  </span>
                  <span className="text-xs text-on-surface-variant">{ONBOARDING_STEPS[onboardingStep - 1].label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ONBOARDING_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full",
                        i + 1 <= onboardingStep ? "w-7 bg-primary" : "w-4 bg-surface-container-high",
                      )}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">New restaurant onboarding</h1>
                <p className="mt-1 text-sm text-on-surface-variant">{ONBOARDING_STEPS[onboardingStep - 1].hint}</p>
              </div>
              <div className="space-y-4">
                {onboardingStep === 1 ? (
                  <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Business entity legal name
                    <div className="relative">
                      <MaterialIcon
                        name="storefront"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
                      />
                      <input
                        className={cn(fieldClass(), "pl-10")}
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Primary operator full name
                    <div className="relative">
                      <MaterialIcon
                        name="badge"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
                      />
                      <input
                        className={cn(fieldClass(), "pl-10")}
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                      />
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Desk WhatsApp number
                    <div className="flex items-center rounded-lg bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="pl-3.5 pr-2 text-xs font-semibold text-on-surface-variant">+91</span>
                      <input
                        className="h-11 flex-1 bg-transparent text-sm focus:outline-none"
                        value={directorPhone}
                        onChange={(e) => setDirectorPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        inputMode="numeric"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Executive billing email
                    <div className="relative">
                      <MaterialIcon
                        name="alternate_email"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
                      />
                      <input
                        className={cn(fieldClass(), "pl-10")}
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                      />
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Metro operating zone
                    <div className="relative">
                      <select
                        className={cn(fieldClass(), "appearance-none pr-9")}
                        value={metroCity}
                        onChange={(e) => setMetroCity(e.target.value)}
                      >
                        <option value="Bangalore">Bangalore (HQ Core)</option>
                        <option value="Mumbai">Mumbai Suburban</option>
                        <option value="Delhi NCR">Delhi NCR</option>
                      </select>
                      <MaterialIcon
                        name="expand_more"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Direct fulfillment
                    <div className="relative">
                      <select
                        className={cn(fieldClass(), "appearance-none pr-9")}
                        value={fulfillmentMode}
                        onChange={(e) => setFulfillmentMode(e.target.value as FulfillmentMode)}
                      >
                        {FULFILLMENT_MODES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <MaterialIcon
                        name="expand_more"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                      />
                    </div>
                    <span className="text-[10px] font-medium text-primary">{fulfillmentMeta.badge}</span>
                  </label>
                </div>
                {fulfillmentMode !== "none" ? (
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                    Maximum delivery radius
                    <div className="relative">
                      <select
                        className={cn(fieldClass(), "appearance-none pr-9")}
                        value={fulfillmentRadiusKm}
                        onChange={(e) => setFulfillmentRadiusKm(e.target.value)}
                      >
                        {FULFILLMENT_RADIUS_KM.map((km) => (
                          <option key={km} value={km}>
                            {km} km radial limit
                          </option>
                        ))}
                      </select>
                      <MaterialIcon
                        name="expand_more"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                      />
                    </div>
                    <span className="text-[10px] text-on-surface-variant">
                      Used for guest delivery quotes and hub discovery (Shiprocket serviceability later).
                    </span>
                  </label>
                ) : (
                  <p className="rounded-lg bg-surface-container-high px-3.5 py-2.5 text-xs text-on-surface-variant">
                    No delivery radius — guests order for <strong className="text-foreground">pickup or dine-in</strong>{" "}
                    only. You can enable delivery later in Settings.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">Core culinary identifiers</span>
                  <div className="flex flex-wrap gap-2">
                    {CUISINE_TAGS.map((tag) => {
                      const on = selectedCuisines.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleCuisine(tag)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                            on ? "bg-primary text-primary-foreground" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant"
                    >
                      + Custom
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2">
                  {[
                    {
                      title: "DPDP Compliance Mandate (2023):",
                      body: "I affirm explicit data fiduciary status over guest logs with encryption key custody retained on restaurant terminal.",
                      checked: dpdpAccepted,
                      onChange: setDpdpAccepted,
                    },
                    {
                      title: "WhatsApp Transactional Gateway:",
                      body: "Authorize Meta Cloud API webhooks for instant order manifests, real-time KOT delivery receipts, and automated bill PDFs.",
                      checked: waAccepted,
                      onChange: setWaAccepted,
                    },
                  ].map((c) => (
                    <label
                      key={c.title}
                      className="flex cursor-pointer items-start gap-3 rounded-lg bg-surface-container-low p-3 hover:bg-surface-container-high"
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={(e) => c.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span className="text-xs text-foreground">
                        <strong className="font-semibold">{c.title}</strong> {c.body}
                      </span>
                    </label>
                  ))}
                </div>
                  </>
                ) : null}

                {onboardingStep === 2 ? (
                  <>
                  <OnboardingPromoCarousel variant="hero" className="mb-1" />
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/50 p-3">
                    <span className="text-xs font-semibold text-on-surface-variant">FSSAI / food license</span>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-on-surface-variant">
                      How do you want to proceed?
                      <div className="relative">
                        <select
                          className={cn(fieldClass(), "appearance-none pr-9")}
                          value={fssaiChoice}
                          onChange={(e) => {
                            const next = e.target.value as FssaiChoice;
                            setFssaiChoice(next);
                            setFssaiError(null);
                            if (next !== "verify") {
                              setFssaiOk(null);
                            }
                          }}
                        >
                          {FSSAI_CHOICES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <MaterialIcon
                          name="expand_more"
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                        />
                      </div>
                      <span className="text-[10px] font-normal text-on-surface-variant">
                        {FSSAI_CHOICES.find((c) => c.value === fssaiChoice)?.hint}
                      </span>
                    </label>

                    {fssaiChoice === "verify" ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-on-surface-variant">14-digit license number</span>
                          {fssaiOk ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <MaterialIcon name="verified" className="text-[14px]" />
                              {fssaiOk.licenseStatus}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <input
                            className={cn(fieldClass(), "flex-1 font-mono tracking-wide")}
                            placeholder="e.g. 11521998000045"
                            inputMode="numeric"
                            value={fssai}
                            onChange={(e) => {
                              setFssai(e.target.value);
                              setFssaiError(null);
                              setFssaiOk(null);
                            }}
                          />
                          <button
                            type="button"
                            disabled={fssaiBusy}
                            className="h-11 shrink-0 rounded-lg bg-surface-container-high px-4 text-xs font-semibold hover:bg-surface-container disabled:opacity-60"
                            onClick={() => {
                              setFssaiBusy(true);
                              setFssaiError(null);
                              void verifyFssaiLicense(fssai)
                                .then(setFssaiOk)
                                .catch((err) => setFssaiError(err instanceof Error ? err.message : "Verify failed"))
                                .finally(() => setFssaiBusy(false));
                            }}
                          >
                            {fssaiBusy ? "…" : "Verify"}
                          </button>
                        </div>
                        {fssaiOk ? (
                          <p className="text-[11px] text-on-surface-variant">
                            Registry: {fssaiOk.legalName ?? "—"} · {fssaiOk.state ?? "—"} · expires{" "}
                            {fssaiOk.expiryDate ?? "—"}
                          </p>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant">
                            Stub demo: <span className="font-mono">11521998000045</span>
                          </p>
                        )}
                        {fssaiError ? <p className="text-xs text-red-700">{fssaiError}</p> : null}
                        {!fssaiOk ? (
                          <p className="text-[10px] text-amber-900">
                            Continue is enabled after a successful verify, or change the dropdown to skip / pending.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="rounded-lg bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">
                        No verification required on this step. You can add your FSSAI in{" "}
                        <strong className="text-foreground">Settings → Compliance</strong> when ready.
                      </p>
                    )}
                  </div>
                  <OnboardingPromoCarousel variant="compact" />
                  </>
                ) : null}

                {onboardingStep === 3 ? (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-fixed/30 via-surface-container-low to-amber-50 p-4 shadow-inner">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative mx-auto flex h-40 w-full max-w-[200px] shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/60 bg-white/50 shadow-lg sm:mx-0">
                          <MaterialIcon name="menu_book" className="text-[64px] text-primary/80" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Step 3 · Menu AI</p>
                          <p className="font-[family-name:var(--font-display)] text-lg font-bold">Upload PDF → draft menu in minutes</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Human-in-the-loop publish gate. Ops can seed your first menu during pilot if you skip now.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-on-surface-variant">Preferred POS sync (optional)</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {POS_ADAPTERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPosChoice(p.id)}
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-xl bg-gradient-to-br p-3 text-left shadow-sm transition ring-2",
                            p.color,
                            posChoice === p.id ? "ring-primary" : "ring-transparent hover:ring-primary/30",
                          )}
                        >
                          <MaterialIcon name={p.icon} className="text-[22px] text-foreground/80" />
                          <span className="text-xs font-bold">{p.name}</span>
                          <span className="text-[10px] text-on-surface-variant">Hot-standby stub</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {onboardingStep === 4 ? (
                  <div className="space-y-3">
                    {[
                      {
                        icon: "local_shipping",
                        title: "Fulfillment",
                        value: `${fulfillmentMeta.label}${fulfillmentMode !== "none" ? ` · ${fulfillmentRadiusKm} km` : ""}`,
                        tone: "bg-sky-50",
                      },
                      {
                        icon: "restaurant",
                        title: "Cuisines",
                        value: [...selectedCuisines].join(", ") || "—",
                        tone: "bg-amber-50",
                      },
                      {
                        icon: "verified_user",
                        title: "FSSAI",
                        value: fssaiOk
                          ? `Verified ${fssaiOk.fssaiNumber}`
                          : fssaiChoice === "later"
                            ? "Pending — verify after activation"
                            : fssaiChoice === "none"
                              ? "Skipped — required before hub"
                              : "—",
                        tone: "bg-emerald-50",
                      },
                      {
                        icon: "point_of_sale",
                        title: "POS",
                        value: POS_ADAPTERS.find((p) => p.id === posChoice)?.name ?? "—",
                        tone: "bg-violet-50",
                      },
                    ].map((row) => (
                      <div
                        key={row.title}
                        className={cn("flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm", row.tone)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70">
                          <MaterialIcon name={row.icon} className="text-[22px] text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">{row.title}</p>
                          <p className="truncate text-sm font-semibold">{row.value}</p>
                        </div>
                      </div>
                    ))}
                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center text-xs text-on-surface-variant">
                      Testing phase: submit <strong className="text-foreground">auto-activates</strong> your tenant — then sign in with OTP{" "}
                      <strong className="text-foreground">000000</strong>.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="relative mt-6 flex flex-col gap-3 pt-6">
              <div className="flex gap-2">
                {onboardingStep > 1 ? (
                  <button
                    type="button"
                    className="flex h-[52px] flex-1 items-center justify-center gap-1 rounded-xl bg-surface-container-high text-sm font-semibold"
                    onClick={() => setOnboardingStep((s) => s - 1)}
                  >
                    <MaterialIcon name="arrow_back" className="text-[20px]" />
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!canContinue || submitBusy}
                  title={!step1Ready && onboardingStep === 1 ? "Accept consents and pick at least one cuisine" : undefined}
                  className={cn(
                    "flex h-[52px] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25",
                    onboardingStep > 1 ? "flex-[2]" : "w-full",
                    canContinue ? "bg-primary hover:bg-primary-container" : "cursor-not-allowed bg-primary/40",
                  )}
                  onClick={() => {
                    if (onboardingStep < 4) {
                      setOnboardingStep((s) => s + 1);
                      onboardingTopRef.current?.scrollIntoView({ behavior: "smooth" });
                      return;
                    }
                    void submitForActivation();
                  }}
                >
                  {onboardingStep < 4 ? "Continue Setup" : submitBusy ? "Activating…" : "Submit & sign in"}
                  <MaterialIcon name={onboardingStep < 4 ? "arrow_forward" : "hourglass_top"} className="text-[20px]" />
                </button>
              </div>
              {!step1Ready && onboardingStep === 1 ? (
                <p className="text-center text-[10px] text-on-surface-variant">
                  Check both consent boxes and select at least one cuisine to continue.
                </p>
              ) : null}
              {submitError ? (
                <p className="text-center text-[10px] font-semibold text-red-600">{submitError}</p>
              ) : null}
              {onboardingStep === 2 && fssaiChoice === "verify" && !fssaiOk ? (
                <p className="text-center text-[10px] text-on-surface-variant">
                  Verify your FSSAI number, or choose <strong>Skip for now</strong> / <strong>Applied — pending</strong>{" "}
                  in the dropdown.
                </p>
              ) : null}
              {!pendingReview ? (
                <p className="text-center text-xs text-on-surface-variant">
                  Already activated?{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline underline-offset-2"
                    onClick={() => {
                      setShowOwnerLogin(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Owner login
                  </button>
                </p>
              ) : null}
            </div>
          </section>

          {ownerLoginVisible && onboardingStep === 1 && !loginOnly ? (
            <OwnerLoginPanel onSuccess={() => router.push("/")} />
          ) : null}
        </div>
        )}

        {!pendingReview && !ownerLoginVisible && onboardingStep === 1 ? (
        <footer className="w-full rounded-2xl bg-surface-container-low p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-3.5 rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", f.iconClass)}>
                  <MaterialIcon name={f.icon} className="text-[22px]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{f.title}</p>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", f.badgeClass)}>{f.badge}</span>
                  </div>
                  <p className="truncate text-xs text-on-surface-variant">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
        ) : null}
      </div>
    </main>
  );
}
