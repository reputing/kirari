"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { TextFx, GuestEntry } from "@/lib/types";
import { PEOPLE } from "@/lib/seed";
import { nameStyleFor } from "@/lib/styleHelpers";

const FX_LIST: [TextFx, string][] = [
  ["none", "aa"],
  ["glow", "glow"],
  ["rainbow", "🌈"],
  ["sticker", "sticker"],
  ["retro3d", "3d"],
];
const COLORS = ["#ff7ec0", "#ffd36e", "#7be0c0", "#7cc0ff", "#c79bff"];

// Guestbook window — sticky sign form on top (name + message, a text-effect
// chip picker, a color picker, sign button) and a scrollable list of entries
// below, each name rendered with its chosen effect and color.
export default function GuestbookWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const f = state.guestForm;

  const senderColor = (e: GuestEntry) =>
    e.person && PEOPLE[e.person] ? PEOPLE[e.person].color : e.color;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* sign form */}
      <div
        style={{
          flex: "0 0 auto",
          padding: "13px",
          background: "var(--panel-2)",
          borderBottom: "var(--border)",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", marginBottom: "8px" }}>
          leave a mark ♡
        </div>
        <div style={{ display: "flex", gap: "7px", marginBottom: "7px" }}>
          <input
            value={f.name}
            onChange={(e) => api.setGuest("name", e.target.value)}
            placeholder="your name"
            style={{
              flex: "0 0 36%",
              minWidth: 0,
              background: "var(--panel)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
              padding: "8px 11px",
              fontSize: "12.5px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <input
            value={f.text}
            onChange={(e) => api.setGuest("text", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                api.signGuest();
              }
            }}
            placeholder="say something sweet…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--panel)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
              padding: "8px 11px",
              fontSize: "12.5px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {FX_LIST.map(([fx, label]) => (
              <button
                key={fx}
                style={{
                  padding: "5px 9px",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "10px",
                  cursor: "pointer",
                  borderRadius: "999px",
                  border: f.fx === fx ? "2px solid var(--accent)" : "var(--border)",
                  background: f.fx === fx ? "var(--tab-active)" : "var(--panel)",
                  color: f.fx === fx ? "var(--accent)" : "var(--ink-soft)",
                }}
                onClick={() => api.pickGuestFx(fx)}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "5px", marginLeft: "auto" }}>
            {COLORS.map((cc) => (
              <button
                key={cc}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  background: cc,
                  border: f.color === cc ? "2.5px solid var(--ink)" : "2px solid #fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                }}
                onClick={() => api.pickGuestColor(cc)}
              ></button>
            ))}
          </div>
          <button
            style={{
              padding: "8px 15px",
              background: "var(--accent)",
              color: "var(--on-accent)",
              border: "none",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "var(--btn-shadow)",
            }}
            onClick={() => api.signGuest()}
          >
            sign ♡
          </button>
        </div>
      </div>

      {/* entries */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "13px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {state.guestbook.map((e) => {
          const avStyle: CSSProperties = {
            width: "34px",
            height: "34px",
            flex: "0 0 auto",
            borderRadius: "50%",
            background: senderColor(e),
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontFamily: "var(--font-display)",
          };
          return (
            <div
              key={e.id}
              style={{
                display: "flex",
                gap: "10px",
                background: "var(--panel-2)",
                border: "var(--border)",
                borderRadius: "var(--radius)",
                padding: "11px",
                boxShadow: "var(--btn-shadow)",
              }}
            >
              <div style={avStyle}>{e.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={nameStyleFor(e.fx, 15)}>{e.name}</span>
                  <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>
                    {e.time}
                  </span>
                </div>
                <div style={{ fontSize: "13px", lineHeight: 1.45, marginTop: "3px", textWrap: "pretty" } as CSSProperties}>
                  {e.text}
                </div>
                {!!e.person && (
                  <button
                    style={{
                      marginTop: "6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--accent)",
                      fontFamily: "var(--font-pixel)",
                      fontSize: "10px",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => e.person && api.openDM(e.person)}
                  >
                    ↩ reply in dm ♡
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
