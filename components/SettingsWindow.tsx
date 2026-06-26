"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { ThemeId } from "@/lib/themes";
import { THEMES, THEME_METAS } from "@/lib/themes";
import { MOODS } from "@/lib/seed";
import { SectionLabel } from "./shared";

const TOGGLE_DEFS: { key: keyof DesktopApi["state"]["toggles"]; label: string; desc: string }[] = [
  { key: "knock", label: "let strangers knock", desc: "anyone can start a chat from your links" },
  { key: "counter", label: "show visitor counter", desc: "display your visits + knocks publicly" },
  { key: "statusBlink", label: "blink my status light", desc: "pulse the dot next to your mood" },
  { key: "sounds", label: "play cute sounds", desc: "soft chimes on new messages (＾• ω •＾)" },
  { key: "rain", label: "sparkle rain", desc: "let hearts + stars drift down the page" },
];

// Settings window — skin picker (2×2 theme cards, switches the whole desktop's
// CSS variables), vibe toggles, a mood chip picker, and a sign-out button that
// re-opens onboarding.
export default function SettingsWindow({ api }: { api: DesktopApi }) {
  const { state } = api;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "16px" }}>
      {/* skins */}
      <SectionLabel mt="0 0 11px">✦ SKIN</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px" }}>
        {(Object.keys(THEMES) as ThemeId[]).map((id) => {
          const active = state.theme === id;
          const mt = THEME_METAS[id];
          const cardStyle: CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            background: "var(--panel-2)",
            border: active ? "2px solid var(--accent)" : "var(--border)",
            borderRadius: "var(--radius)",
            cursor: "pointer",
            color: "var(--ink)",
            boxShadow: active ? "var(--btn-shadow)" : "none",
          };
          return (
            <button key={id} style={cardStyle} onClick={() => api.setTheme(id)}>
              <div style={{ display: "flex", gap: "4px" }}>
                {mt.sw.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: c,
                      border: "2px solid rgba(255,255,255,.75)",
                      boxShadow: "0 1px 2px rgba(0,0,0,.2)",
                    }}
                  ></span>
                ))}
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", lineHeight: 1.1 }}>
                  {mt.name}
                </div>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>
                  {mt.sub}
                </div>
              </div>
              {active && <span style={{ color: "var(--accent)", fontSize: "15px" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* vibe toggles */}
      <SectionLabel mt="20px 0 8px">✦ YOUR VIBE</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {TOGGLE_DEFS.map((g) => {
          const on = state.toggles[g.key];
          return (
            <div
              key={g.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "10px 2px",
                borderBottom: "1px dashed var(--line)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{g.label}</div>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>
                  {g.desc}
                </div>
              </div>
              <button
                style={{
                  position: "relative",
                  width: "46px",
                  height: "26px",
                  flex: "0 0 auto",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "999px",
                  background: on ? "var(--accent)" : "var(--line)",
                  transition: "background .2s",
                }}
                onClick={() => api.toggle(g.key)}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: on ? "23px" : "3px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,.35)",
                    transition: "left .2s",
                  }}
                ></span>
              </button>
            </div>
          );
        })}
      </div>

      {/* status / mood */}
      <SectionLabel mt="20px 0 10px">✦ STATUS</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {MOODS.map((m) => (
          <button
            key={m}
            style={{
              padding: "7px 12px",
              fontSize: "12.5px",
              cursor: "pointer",
              borderRadius: "999px",
              border: m === state.mood ? "2px solid var(--accent)" : "var(--border)",
              background: m === state.mood ? "var(--tab-active)" : "var(--panel-2)",
              color: m === state.mood ? "var(--accent)" : "var(--ink)",
              fontWeight: m === state.mood ? 700 : 400,
            }}
            onClick={() => api.setMood(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <button
        style={{
          marginTop: "20px",
          padding: "10px 16px",
          background: "var(--panel-2)",
          border: "var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--ink-soft)",
          fontSize: "12.5px",
          cursor: "pointer",
        }}
        onClick={() => api.openOnb()}
      >
        sign out · switch page ↩
      </button>
    </div>
  );
}
