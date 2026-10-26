"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import { fetchWaStatus, resolveScanToken } from "@/lib/api";

function extractScanToken(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    if (text.includes("://") || text.startsWith("http")) {
      const u = new URL(text);
      const parts = u.pathname.split("/").filter(Boolean);
      const sIdx = parts.findIndex((p) => p === "s");
      if (sIdx >= 0 && parts[sIdx + 1]) return parts[sIdx + 1]!;
    }
  } catch {
    /* not a URL */
  }
  const m = text.match(/\/s\/([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return m[1];
  if (/^[A-Za-z0-9_-]{6,64}$/.test(text)) return text;
  return null;
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue?: string }[]>;
};

export default function RewardsScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Starting camera…");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [waDigits, setWaDigits] = useState<string | null>(null);
  const scanningRef = useRef(true);

  useEffect(() => {
    void fetchWaStatus()
      .then((s) => setWaDigits(s.sparkWaMeE164 ?? null))
      .catch(() => setWaDigits(null));
  }, []);

  const finishWithToken = useCallback(
    async (token: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setStatus("Opening packaging reward…");
      scanningRef.current = false;
      try {
        const result = await resolveScanToken(token);
        // Prefer in-app play path; WA opt-in is handled there / spark flow
        router.replace(result.redirectPath);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid sticker";
        setError(msg);
        setStatus("Scan again or paste the code");
        setBusy(false);
        scanningRef.current = true;
      }
    },
    [busy, router],
  );

  useEffect(() => {
    let raf = 0;
    let detector: BarcodeDetectorLike | null = null;

    async function start() {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera not available on this device. Paste the sticker code below.");
        setStatus("Manual entry");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setStatus("Point at the packaging QR");

        const BD = (
          window as unknown as {
            BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
          }
        ).BarcodeDetector;
        if (BD) {
          try {
            detector = new BD({ formats: ["qr_code"] });
          } catch {
            detector = null;
          }
        }

        const tick = async () => {
          if (!scanningRef.current) return;
          const v = videoRef.current;
          if (detector && v && v.readyState >= 2) {
            try {
              const codes = await detector.detect(v);
              const raw = codes[0]?.rawValue;
              if (raw) {
                const token = extractScanToken(raw);
                if (token) {
                  await finishWithToken(token);
                  return;
                }
              }
            } catch {
              /* keep scanning */
            }
          }
          raf = window.requestAnimationFrame(() => void tick());
        };
        raf = window.requestAnimationFrame(() => void tick());

        if (!detector) {
          setStatus("Camera on — paste sticker code if QR auto-read isn’t supported");
        }
      } catch {
        setError("Camera permission denied. Allow camera, or paste the sticker code.");
        setStatus("Permission needed");
        window.alert("Turn on camera access to scan packaging QR, or paste the code below.");
      }
    }

    void start();
    return () => {
      scanningRef.current = false;
      window.cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [finishWithToken]);

  function onManual(e: React.FormEvent) {
    e.preventDefault();
    const token = extractScanToken(manual);
    if (!token) {
      setError("Enter a valid sticker token or /s/… link.");
      return;
    }
    void finishWithToken(token);
  }

  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent("Hi — I scanned D'aMigo's packaging")}`
    : null;

  return (
    <MeSubpageShell title="Scan packaging">
      <p className="mb-3 text-[13px] text-on-surface-variant">
        Scan the D'aMigo's sticker QR → we open the kitchen play flow and WhatsApp opt-in (one test
        number for now).
      </p>

      <div className="relative mb-4 overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-black/10">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-44 w-44 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        <p className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-center text-[12px] font-semibold text-white">
          {status}
        </p>
      </div>

      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={onManual} className="mb-4 space-y-2 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border">
        <label className="block text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">
          Or paste sticker code / link
          <input
            className="mt-2 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-[14px]"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="https://…/s/TOKEN or TOKEN"
            data-testid="rewards-scan-manual"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="pressable flex h-11 w-full items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-on-primary disabled:opacity-60"
        >
          {busy ? "Opening…" : "Continue"}
        </button>
      </form>

      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="pressable mb-3 flex items-center gap-3 rounded-2xl bg-[#25D366]/15 px-4 py-3.5 ring-1 ring-[#25D366]/30"
        >
          <MaterialIcon name="chat" className="text-[24px] text-[#128C7E]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">Open WhatsApp opt-in</span>
            <span className="block text-[12px] text-on-surface-variant">
              Shared test line · {waDigits}
            </span>
          </span>
          <MaterialIcon name="open_in_new" className="text-[18px]" />
        </a>
      ) : (
        <p className="mb-3 text-[12px] text-on-surface-variant">
          WhatsApp number loads from server (`KAPSO_WA_E164` / Spark). Set one test number for QA.
        </p>
      )}

      <Link href="/me/rewards" className="pressable block text-center text-[13px] font-bold text-primary">
        Back to rewards
      </Link>
    </MeSubpageShell>
  );
}
