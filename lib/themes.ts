// ============================================================================
// Theme skins — 4 complete CSS custom-property sets.
// Values copied verbatim from the kirari.cafe design prototype. Switching a
// skin swaps the entire variable set on the desktop root element. In production
// this maps to profiles.theme ("sugar" | "angel" | "kuro" | "ostan").
// ============================================================================

export type ThemeId = "sugar" | "angel" | "kuro" | "ostan";

export interface ThemeDef {
  vars: Record<string, string>;
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  sugar: {
    vars: {
      "--bg": "linear-gradient(165deg,#ffe6f3 0%,#f3ecff 46%,#e7f7ff 100%)",
      "--panel": "#fffdf9",
      "--panel-2": "#fff2fa",
      "--ink": "#7a4f70",
      "--ink-soft": "#bd92b3",
      "--accent": "#ff7ec0",
      "--accent-2": "#3bbfa6",
      "--on-accent": "#ffffff",
      "--line": "#ffd0e8",
      "--border": "2px solid #ffd0e8",
      "--radius": "22px",
      "--shadow": "0 10px 0 #ffd9ec, 0 26px 46px -22px rgba(255,120,190,.6)",
      "--btn-shadow": "0 3px 0 rgba(232,91,162,.4)",
      "--bubble-me": "#ffd6ec",
      "--bubble-me-ink": "#7a3f66",
      "--bubble-them": "#e7f0ff",
      "--bubble-them-ink": "#3f5a7a",
      "--font-display": "'Mochiy Pop P One', system-ui, sans-serif",
      "--font-body": "'Zen Maru Gothic', system-ui, sans-serif",
      "--font-pixel": "'DotGothic16', monospace",
      "--titlebar": "linear-gradient(180deg,#ffa6d4,#ff7ec0)",
      "--titlebar-ink": "#ffffff",
      "--rail": "#fff2fa",
      "--tab-active": "#ffe1f1",
      "--deco": "#ff9ed0",
    },
  },
  angel: {
    vars: {
      "--bg": "linear-gradient(180deg,#a9deff 0%,#d8f1ff 52%,#eafaff 100%)",
      "--panel": "#ffffff",
      "--panel-2": "#eef8ff",
      "--ink": "#2f5f86",
      "--ink-soft": "#84aecb",
      "--accent": "#1fa6f0",
      "--accent-2": "#22c1ab",
      "--on-accent": "#ffffff",
      "--line": "#cdeaff",
      "--border": "1.5px solid #cdeaff",
      "--radius": "14px",
      "--shadow": "0 16px 38px -16px rgba(40,150,230,.55), inset 0 1px 0 #ffffff",
      "--btn-shadow":
        "inset 0 1px 0 rgba(255,255,255,.85), 0 5px 12px -6px rgba(30,150,240,.7)",
      "--bubble-me": "#d4efff",
      "--bubble-me-ink": "#235e85",
      "--bubble-them": "#eef3f7",
      "--bubble-them-ink": "#3a586c",
      "--font-display": "'Varela Round', system-ui, sans-serif",
      "--font-body": "'Zen Kaku Gothic New', system-ui, sans-serif",
      "--font-pixel": "'DotGothic16', monospace",
      "--titlebar": "linear-gradient(180deg,#8ad6ff,#2eaef0)",
      "--titlebar-ink": "#ffffff",
      "--rail": "#eaf6ff",
      "--tab-active": "#d4eeff",
      "--deco": "#cdeeff",
    },
  },
  kuro: {
    vars: {
      "--bg":
        "radial-gradient(125% 95% at 50% -12%,#3e2339 0%,#22141f 56%,#140b12 100%)",
      "--panel": "#241522",
      "--panel-2": "#2d1b2a",
      "--ink": "#f1e3ec",
      "--ink-soft": "#b394ac",
      "--accent": "#e24a7d",
      "--accent-2": "#cda44e",
      "--on-accent": "#1a0f16",
      "--line": "#54354d",
      "--border": "1px solid #54354d",
      "--radius": "10px",
      "--shadow":
        "0 22px 56px -22px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.05)",
      "--btn-shadow": "0 5px 16px -8px rgba(226,74,125,.85)",
      "--bubble-me": "#48243b",
      "--bubble-me-ink": "#ffd9e8",
      "--bubble-them": "#2e1d2b",
      "--bubble-them-ink": "#e9d6e2",
      "--font-display": "'DM Serif Display', Georgia, serif",
      "--font-body": "'Zen Maru Gothic', system-ui, serif",
      "--font-pixel": "'DotGothic16', monospace",
      "--titlebar": "linear-gradient(180deg,#3c2338,#2a1726)",
      "--titlebar-ink": "#f1e3ec",
      "--rail": "#1f1320",
      "--tab-active": "#3a2236",
      "--deco": "#8a5778",
    },
  },
  ostan: {
    vars: {
      "--bg": "#3f93a0",
      "--panel": "#ece9d8",
      "--panel-2": "#ffffff",
      "--ink": "#1c1c16",
      "--ink-soft": "#5d5d50",
      "--accent": "#2a5bd7",
      "--accent-2": "#1f9e54",
      "--on-accent": "#ffffff",
      "--line": "#9a9a86",
      "--border": "1px solid #808078",
      "--radius": "3px",
      "--shadow":
        "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #8a8a7a, 3px 3px 0 rgba(0,0,0,.28)",
      "--btn-shadow":
        "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #8a8a7a, 1px 1px 0 rgba(0,0,0,.2)",
      "--bubble-me": "#dbe6ff",
      "--bubble-me-ink": "#16315f",
      "--bubble-them": "#ffffff",
      "--bubble-them-ink": "#2a2a22",
      "--font-display": "'Pixelify Sans', 'Tahoma', sans-serif",
      "--font-body": "'Tahoma','Zen Kaku Gothic New', Verdana, sans-serif",
      "--font-pixel": "'DotGothic16', monospace",
      "--titlebar": "linear-gradient(180deg,#3a73e8,#1b4fb0)",
      "--titlebar-ink": "#ffffff",
      "--rail": "#d9d5c3",
      "--tab-active": "#ffffff",
      "--deco": "#cfeaee",
    },
  },
};

// Skin picker metadata (settings window): name, subtitle, 3 swatch colors.
export const THEME_METAS: Record<
  ThemeId,
  { name: string; sub: string; sw: [string, string, string] }
> = {
  sugar: { name: "sugar pixel", sub: "kawaii pastel", sw: ["#ff7ec0", "#3bbfa6", "#fff2fa"] },
  angel: { name: "angel.exe", sub: "frutiger sky", sw: ["#1fa6f0", "#22c1ab", "#eafaff"] },
  kuro: { name: "kuro lolita", sub: "gothic moe", sw: ["#e24a7d", "#cda44e", "#241522"] },
  ostan: { name: "OS-tan", sub: "retro desktop", sw: ["#2a5bd7", "#1f9e54", "#ece9d8"] },
};

// ============================================================================
// Custom theme support (skin editor).
// ============================================================================

import type { CustomTheme } from "./types";

// The subset of CSS vars the skin editor exposes, with friendly labels and the
// input kind. Everything else is inherited from the chosen base skin.
export type EditableKind = "color" | "text";
export const EDITABLE_VARS: { key: string; label: string; kind: EditableKind }[] = [
  { key: "--accent", label: "accent", kind: "color" },
  { key: "--accent-2", label: "accent 2", kind: "color" },
  { key: "--on-accent", label: "text on accent", kind: "color" },
  { key: "--ink", label: "ink (text)", kind: "color" },
  { key: "--ink-soft", label: "soft ink", kind: "color" },
  { key: "--panel", label: "panel", kind: "color" },
  { key: "--panel-2", label: "panel 2", kind: "color" },
  { key: "--line", label: "lines", kind: "color" },
  { key: "--tab-active", label: "active tab", kind: "color" },
  { key: "--deco", label: "decorations", kind: "color" },
  { key: "--bg", label: "wallpaper (css)", kind: "text" },
  { key: "--titlebar", label: "titlebar (css)", kind: "text" },
  { key: "--titlebar-ink", label: "titlebar text", kind: "color" },
  { key: "--radius", label: "corner radius", kind: "text" },
];

// Resolve the active theme's vars: built-in id, or a custom theme (merged over
// its base so any unedited var still has a value). Always returns a full set.
export function resolveThemeVars(
  themeId: string,
  customThemes: CustomTheme[]
): Record<string, string> {
  if (themeId.startsWith("custom:")) {
    const ct = customThemes.find((c) => c.id === themeId);
    if (ct) {
      const base = THEMES[ct.base]?.vars || THEMES.sugar.vars;
      return { ...base, ...ct.vars };
    }
  }
  return THEMES[(themeId as ThemeId)] ? THEMES[themeId as ThemeId].vars : THEMES.sugar.vars;
}

// Three representative swatches for any theme id (for picker chips).
export function themeSwatches(themeId: string, customThemes: CustomTheme[]): [string, string, string] {
  const v = resolveThemeVars(themeId, customThemes);
  return [v["--accent"], v["--accent-2"], v["--panel-2"] || v["--ink"]];
}

// --- import/export codec --------------------------------------------------
// A theme "code" is a URL-safe base64 of the JSON {n,b,v}. Compact + shareable.
export function encodeTheme(ct: CustomTheme): string {
  const payload = { n: ct.name, s: ct.sub, b: ct.base, v: ct.vars };
  const json = JSON.stringify(payload);
  const b64 = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString("base64");
  return "KIRARI~" + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTheme(code: string): CustomTheme | null {
  try {
    const raw = code.trim().replace(/^KIRARI~/, "");
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(escape(window.atob(b64)))
        : Buffer.from(b64, "base64").toString("utf8");
    const p = JSON.parse(json);
    if (!p || typeof p.v !== "object") return null;
    const base: ThemeId = THEMES[p.b as ThemeId] ? (p.b as ThemeId) : "sugar";
    return {
      id: "custom:" + Math.random().toString(36).slice(2, 8),
      name: typeof p.n === "string" ? p.n : "imported skin",
      sub: typeof p.s === "string" ? p.s : "shared theme",
      base,
      vars: p.v as Record<string, string>,
    };
  } catch {
    return null;
  }
}
