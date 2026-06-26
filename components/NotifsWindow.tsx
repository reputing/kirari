"use client";

import type { DesktopApi } from "@/lib/useDesktop";

// Notifications window — a list of notification cards. Clicking marks the
// notification read and routes to its target (DM, group chat, or guestbook).
export default function NotifsWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "13px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {state.notifs.map((n) => (
          <button
            key={n.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "11px 12px",
              background: "var(--panel-2)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              color: "var(--ink)",
              boxShadow: "var(--btn-shadow)",
              transition: "transform .12s",
            }}
            onClick={() => {
              api.markNotifRead(n.id);
              if (n.action === "dm" && n.target) api.openDM(n.target);
              else if (n.action === "chat" && n.target) api.openWindow("chat", n.target);
              else if (n.action === "guestbook") api.openWindow("guestbook");
            }}
          >
            <span
              style={{
                width: "38px",
                height: "38px",
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                background: "var(--accent-2)",
                color: "var(--on-accent)",
                borderRadius: "var(--radius)",
              }}
            >
              {n.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontSize: "13px", lineHeight: 1.4 }}>
                {(n.who ? "@" + n.who + " " : "") + n.text}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "9.5px",
                  color: "var(--ink-soft)",
                  marginTop: "2px",
                }}
              >
                {n.time}
              </span>
            </span>
            {n.unread && (
              <span
                style={{
                  width: "9px",
                  height: "9px",
                  flex: "0 0 auto",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 6px var(--accent)",
                }}
              ></span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
