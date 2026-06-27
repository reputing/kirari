"use client";

import type { CSSProperties } from "react";
import { initOf } from "@/lib/styleHelpers";
import type { DesktopApi } from "@/lib/useDesktop";
import { PEOPLE } from "@/lib/seed";

// Messages hub — lists every DM and group the user belongs to, with avatar
// (circle for DM, rounded-square for group), title, kind label, last-message
// preview, and unread badge. A "+ new group chat" button opens the composer.
export default function MessagesWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const items = Object.values(state.convos).map((c) => {
    const isG = c.kind === "group";
    const last = c.messages[c.messages.length - 1];
    const who = isG ? null : PEOPLE[c.who as string];
    const title = isG ? c.title! : who ? who.name : (c.who as string);
    const lp = last
      ? (last.from === "me" ? "you: " : "") + (last.kind === "sticker" ? "[sticker]" : last.text)
      : "";
    const col = isG ? "var(--accent-2)" : who ? who.color : "#999";
    const avStyle: CSSProperties = {
      width: "38px",
      height: "38px",
      flex: "0 0 auto",
      borderRadius: isG ? "12px" : "50%",
      background: col,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "15px",
      fontFamily: "var(--font-display)",
    };
    return {
      id: c.id,
      title,
      kindLabel: isG ? (c.members!.length + "♥") : "dm",
      preview: lp,
      unread: c.unread || 0,
      init: initOf(title),
      avStyle,
    };
  });

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "12px" }}>
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          width: "100%",
          padding: "11px",
          background: "var(--accent-2)",
          color: "var(--on-accent)",
          border: "none",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontSize: "13px",
          cursor: "pointer",
          boxShadow: "var(--btn-shadow)",
          marginBottom: "12px",
        }}
        onClick={() => api.openWindow("newgroup")}
      >
        ＋ new group chat
      </button>
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          width: "100%",
          padding: "9px",
          background: "var(--panel-2)",
          color: "var(--ink)",
          border: "var(--border)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontSize: "12.5px",
          cursor: "pointer",
          marginBottom: "12px",
        }}
        onClick={() => api.openWindow("requests")}
      >
        ♥ friend requests
        {(() => {
          const n = state.requests.filter((r) => r.dir === "in").length;
          return n ? (
            <span
              style={{
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontFamily: "var(--font-pixel)",
                fontSize: "9px",
                minWidth: "16px",
                height: "16px",
                padding: "0 5px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n}
            </span>
          ) : null;
        })()}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "10px",
            letterSpacing: "1px",
            color: "var(--ink-soft)",
          }}
        >
          CHATS
        </span>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }}></span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {items.map((c) => (
          <button
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "9px 10px",
              background: "var(--panel-2)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              color: "var(--ink)",
              textAlign: "left",
            }}
            onClick={() => api.openWindow("chat", c.id)}
          >
            <div style={c.avStyle}>{c.init}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.title}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "9px",
                    color: "var(--ink-soft)",
                    flex: "0 0 auto",
                  }}
                >
                  {c.kindLabel}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--ink-soft)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.preview}
              </div>
            </div>
            {!!c.unread && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "9px",
                  minWidth: "17px",
                  height: "17px",
                  padding: "0 5px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                }}
              >
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
