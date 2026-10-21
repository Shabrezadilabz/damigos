/** Kitchen alert tones via Web Audio — no asset files required. */

let sharedCtx: AudioContext | null = null;
let activeStop: (() => void) | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    sharedCtx ??= new AudioContext();
    return sharedCtx;
  } catch {
    return null;
  }
}

function stopActive() {
  activeStop?.();
  activeStop = null;
}

/**
 * Phone-style ring for ~durationMs.
 * new_order — bright double-ring; sla_breach — lower urgent warble.
 */
export function playKitchenRing(
  kind: "new_order" | "sla_breach",
  durationMs = 5000,
): void {
  const ctx = getCtx();
  if (!ctx) return;
  stopActive();

  void ctx.resume().catch(() => undefined);

  const master = ctx.createGain();
  master.gain.value = 0.12;
  master.connect(ctx.destination);

  const start = ctx.currentTime;
  const end = start + durationMs / 1000;
  const oscs: OscillatorNode[] = [];
  const timers: number[] = [];

  const burst = (t0: number, f1: number, f2: number, len: number) => {
    const g = ctx.createGain();
    g.connect(master);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(1, t0 + 0.02);
    g.gain.setValueAtTime(1, t0 + len - 0.05);
    g.gain.linearRampToValueAtTime(0, t0 + len);

    for (const f of [f1, f2]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      o.start(t0);
      o.stop(t0 + len + 0.02);
      oscs.push(o);
    }
  };

  // Ring cadence: ~0.4s on / 0.2s off / 0.4s on / 0.8s pause — classic double-ring
  let t = start;
  while (t < end - 0.05) {
    if (kind === "new_order") {
      burst(t, 880, 1046, 0.38);
      burst(t + 0.48, 880, 1046, 0.38);
      t += 1.55;
    } else {
      // SLA — lower + slight pitch bend feel via two close tones
      burst(t, 520, 620, 0.45);
      burst(t + 0.55, 480, 580, 0.45);
      t += 1.45;
    }
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern =
      kind === "new_order"
        ? [200, 100, 200, 400, 200, 100, 200, 400, 200, 100, 200]
        : [300, 80, 300, 80, 300, 200, 300, 80, 300, 80, 300];
    navigator.vibrate(pattern);
  }

  const doneMs = durationMs + 50;
  const tid = window.setTimeout(() => {
    stopActive();
  }, doneMs);
  timers.push(tid);

  activeStop = () => {
    for (const id of timers) window.clearTimeout(id);
    try {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    } catch {
      /* ignore */
    }
    for (const o of oscs) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
  };
}

export function stopKitchenRing(): void {
  stopActive();
}

export const KITCHEN_SOUND_KEY = "damigos.kitchen.soundOn";

export function readKitchenSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(KITCHEN_SOUND_KEY);
    if (v === null) return true;
    return v !== "0" && v !== "false";
  } catch {
    return true;
  }
}

export function writeKitchenSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(KITCHEN_SOUND_KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent("damigos-kitchen-sound", { detail: { on } }));
  } catch {
    /* ignore */
  }
}
