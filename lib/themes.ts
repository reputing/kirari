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
