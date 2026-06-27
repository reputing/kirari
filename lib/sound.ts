"use client";

// Tiny synthesized UI sounds via WebAudio — no audio files needed. Used for
// subtle click feedback in the dashboard (gated on the 'sounds' toggle).

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// a soft, short blip — pleasant and unobtrusive
export function playClick(kind: "tap" | "open" | "soft" = "tap") {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const freq = kind === "open" ? 660 : kind === "soft" ? 420 : 540;
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.06);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}
