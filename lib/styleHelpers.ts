import type { CSSProperties } from "react";
import type { TextFx, BgPattern, WindowType } from "./types";

// ============================================================================
// Style helpers — text effects, background patterns, default window sizes.
// CSS values copied verbatim from the prototype so the visual output is
// pixel-identical. React camelCases CSS keys; vendor-prefixed props use the
// React-specific capitalization (WebkitBackgroundClip, etc).
// ============================================================================

export function nameStyleFor(fx: TextFx, size?: number): CSSProperties {
  const base: CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: (size || 25) + "px",
    lineHeight: 1.05,
    display: "inline-block",
  };
  if (fx === "glow")
    return {
      ...base,
      color: "var(--accent)",
      textShadow: "0 0 9px var(--accent)",
      animation: "textglow 2.2s ease-in-out infinite",
    };
  if (fx === "rainbow")
    return {
      ...base,
      backgroundImage:
        "linear-gradient(90deg,#ff7ec0,#ffd36e,#7be0c0,#7cc0ff,#c79bff,#ff7ec0)",
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      animation: "hue 4s linear infinite",
    };
  if (fx === "sticker")
    return {
      ...base,
      color: "#fff",
      WebkitTextStroke: "2px var(--accent)",
      textShadow: "3px 3px 0 var(--accent)",
    };
  if (fx === "retro3d")
    return {
      ...base,
      color: "var(--accent)",
      textShadow:
        "1px 1px 0 var(--ink),2px 2px 0 var(--ink),4px 4px 0 rgba(0,0,0,.18)",
    };
  if (fx === "neon")
    return {
      ...base,
      color: "#fff",
      textShadow: "0 0 6px var(--accent), 0 0 14px var(--accent)",
      animation: "neonflicker 3.5s steps(1,end) infinite",
    };
  if (fx === "chrome")
    return {
      ...base,
      backgroundImage:
        "linear-gradient(180deg,#fdfdff 0%,#c7ccd6 42%,#8b93a3 52%,#eef1f6 70%,#aab2c0 100%)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      WebkitTextStroke: "0.6px rgba(60,66,80,.35)",
      filter: "drop-shadow(0 1px 1px rgba(0,0,0,.35))",
    };
  if (fx === "flame")
    return {
      ...base,
      backgroundImage: "linear-gradient(180deg,#fff3b0 0%,#ffcf3a 30%,#ff7a1a 70%,#ff3b1a 100%)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      animation: "flameglow 1.6s ease-in-out infinite",
    };
  const clip: CSSProperties = { WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" };
  if (fx === "gradient")
    // theme-driven two-tone gradient that drifts — never a flat single color
    return { ...base, backgroundImage: "linear-gradient(90deg,var(--accent),var(--accent-2),var(--accent))", backgroundSize: "200% auto", ...clip, animation: "hue 5s linear infinite" };
  if (fx === "aurora")
    // soft iridescent multi-hue, tasteful (not the harsh rainbow)
    return { ...base, backgroundImage: "linear-gradient(110deg,#8fe3c6,#86c4ff,#c8a6ff,#ff9ed0,#8fe3c6)", backgroundSize: "220% auto", ...clip, animation: "hue 7s linear infinite" };
  if (fx === "shimmer")
    // accent text with a bright sheen sweeping across
    return { ...base, backgroundImage: "linear-gradient(110deg,var(--accent) 0%,var(--accent) 42%,#ffffff 50%,var(--accent) 58%,var(--accent) 100%)", backgroundSize: "240% auto", ...clip, animation: "shimmer 3.2s linear infinite" };
  return base;
}

export function bgFor(bg: BgPattern | string): CSSProperties {
  const m: Record<string, CSSProperties> = {
    none: { background: "var(--panel)" },
    dots: {
      backgroundColor: "var(--panel)",
      backgroundImage: "radial-gradient(var(--line) 1.6px, transparent 1.7px)",
      backgroundSize: "17px 17px",
    },
    grid: {
      backgroundColor: "var(--panel)",
      backgroundImage:
        "linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)",
      backgroundSize: "22px 22px,22px 22px",
    },
    gingham: {
      backgroundColor: "var(--panel)",
      backgroundImage:
        "linear-gradient(0deg, color-mix(in srgb,var(--accent) 15%, transparent) 50%, transparent 50%), linear-gradient(90deg, color-mix(in srgb,var(--accent) 15%, transparent) 50%, transparent 50%)",
      backgroundSize: "22px 22px,22px 22px",
    },
    stripes: {
      backgroundImage:
        "repeating-linear-gradient(45deg, color-mix(in srgb,var(--accent) 13%, var(--panel)) 0 13px, var(--panel) 13px 26px)",
    },
    hearts: {
      backgroundColor: "var(--panel)",
      backgroundImage:
        "radial-gradient(circle at 50% 38%, var(--line) 28%, transparent 29%), radial-gradient(circle at 50% 38%, var(--line) 28%, transparent 29%)",
      backgroundSize: "26px 26px",
      backgroundPosition: "0 0,13px 13px",
    },
  };
  return m[bg] || m.none;
}

const WIN_SIZES: Record<WindowType, { w: number; h: number }> = {
  profile: { w: 380, h: 566 },
  chat: { w: 362, h: 506 },
  guestbook: { w: 434, h: 560 },
  messages: { w: 316, h: 486 },
  dms: { w: 480, h: 440 },
  notifs: { w: 322, h: 464 },
  edit: { w: 472, h: 610 },
  settings: { w: 452, h: 572 },
  newgroup: { w: 374, h: 472 },
  requests: { w: 360, h: 532 },
};

export function winSize(t: WindowType): { w: number; h: number } {
  return WIN_SIZES[t] || { w: 380, h: 520 };
}

// All keyframes used across the desktop. Injected once at the app root.
export const KEYFRAMES = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow:hidden}
::-webkit-scrollbar{width:9px;height:9px}
::-webkit-scrollbar-thumb{background:var(--line,#d8c4d2);border-radius:999px}
::-webkit-scrollbar-track{background:transparent}
input,textarea,button,select{font-family:inherit}
@keyframes fall{0%{transform:translateY(-16vh) rotate(0)}100%{transform:translateY(118vh) rotate(24deg)}}
@keyframes rainfall{0%{transform:translateY(-14vh)}100%{transform:translateY(118vh)}}
@keyframes neonflicker{0%,100%{text-shadow:0 0 6px var(--accent),0 0 14px var(--accent)}48%{text-shadow:none}49%{text-shadow:0 0 6px var(--accent),0 0 22px var(--accent),0 0 38px var(--accent)}50%{text-shadow:none}51%{text-shadow:0 0 6px var(--accent),0 0 14px var(--accent)}}
@keyframes flameglow{0%,100%{filter:drop-shadow(0 -1px 4px #ff5e1a) drop-shadow(0 -2px 9px #ffb020)}50%{filter:drop-shadow(0 -2px 7px #ff7a1a) drop-shadow(0 -4px 14px #ffd24a)}}
@keyframes shimmer{0%{background-position:140% 0}100%{background-position:-40% 0}}
@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:.85}}
@keyframes blink{0%,55%{opacity:1}56%,100%{opacity:.12}}
@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-5px);opacity:1}}
@keyframes popin{0%{transform:translateY(9px);opacity:.4}100%{transform:translateY(0);opacity:1}}
@keyframes drift{0%{transform:translateX(-14px)}100%{transform:translateX(14px)}}
@keyframes hue{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes glowpulse{0%,100%{text-shadow:0 0 7px var(--accent)}50%{text-shadow:0 0 15px var(--accent),0 0 26px var(--accent)}}
@keyframes textglow{0%,100%{text-shadow:0 0 7px var(--accent)}50%{text-shadow:0 0 15px var(--accent),0 0 26px var(--accent)}}
/* modern window-chrome controls (borderless, hover-highlight, mac-style close) */
.kw-ctrl{width:26px;height:24px;display:flex;align-items:center;justify-content:center;border:none;border-radius:7px;background:transparent;color:var(--titlebar-ink);cursor:pointer;padding:0;font-size:11px;line-height:1;opacity:.72;transition:background .12s ease,opacity .12s ease,color .12s ease}
.kw-ctrl:hover{background:color-mix(in srgb,var(--titlebar-ink) 26%,transparent);opacity:1}
.kw-ctrl:active{transform:translateY(.5px)}
.kw-ctrl-close:hover{background:#ff5f57;color:#fff;opacity:1}
/* theme-aware range sliders (no more ugly grey) */
input[type=range]{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:color-mix(in srgb,var(--accent) 28%,var(--line));outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--panel);box-shadow:0 1px 5px -1px rgba(0,0,0,.45);cursor:pointer}
input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--panel);box-shadow:0 1px 5px -1px rgba(0,0,0,.45);cursor:pointer}
/* emoji picker cells */
.kw-emoji{border:none;background:transparent;cursor:pointer;font-size:18px;padding:4px;border-radius:9px;line-height:1;transition:background .1s ease,transform .1s ease}
.kw-emoji:hover{background:color-mix(in srgb,var(--ink) 12%,transparent);transform:scale(1.18)}
`;

// Safe first-letter for avatars — never throws on undefined/empty.
export function initOf(name: unknown, fallback = "✦"): string {
  const s = typeof name === "string" ? name.trim() : "";
  const m = s.replace(/[^\p{L}\p{N}]/gu, "");
  return (m.charAt(0) || s.charAt(0) || fallback).toUpperCase();
}
