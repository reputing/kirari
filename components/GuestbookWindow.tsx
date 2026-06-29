"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { GuestEntry } from "@/lib/types";
import { PEOPLE } from "@/lib/seed";
import { nameStyleFor, initOf } from "@/lib/styleHelpers";

// Guestbook window (owner view) — a header + the list of marks visitors left.
// There's no sign form here: you don't sign your own guestbook; visitors sign
// it from your public page.
export default function GuestbookWindow({ api }: { api: DesktopApi }) {
  const { state } = api;

  const senderColor = (e: GuestEntry) =>
    e.person && PEOPLE[e.person] ? PEOPLE[e.person].color : e.color;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* header — owner view: read your marks, visitors sign from the public page */}
      <div style={{ flex: "0 0 auto", padding: "13px", background: "var(--panel-2)", borderBottom: "var(--border)", display: "flex", alignItems: "center", gap: "9px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "15px" }}>★ your guestbook</span>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", flex: 1, minWidth: 0 }}>
          {state.guestbook.length} {state.guestbook.length === 1 ? "mark" : "marks"} · visitors sign it from your page
        </span>
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
        {state.guestbook.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: "12.5px", marginTop: "24px" }}>no marks yet — share your page and they&apos;ll show up here ♡</div>
        )}
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
              <div style={avStyle}>{initOf(e.name)}</div>
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
