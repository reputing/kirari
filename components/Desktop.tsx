"use client";

import type { CSSProperties } from "react";
import { useDesktop } from "@/lib/useDesktop";
import { THEMES } from "@/lib/themes";
import { KEYFRAMES } from "@/lib/styleHelpers";
import WindowFrame, { winMeta } from "./WindowFrame";
import Onboarding from "./Onboarding";

const DOCK_W = 76;
const TASK_H = 40;
const MOB_DOCK_H = 66;

// The virtual desktop environment: theme root, ambient decorations, left dock,
// floating window area, and bottom taskbar (desktop) / bottom dock (mobile).
export default function Desktop() {
  const api = useDesktop();
  const s = api.state;
  const T = THEMES[s.theme] || THEMES.sugar;
  const mobile = s.isMobile;
  const isAngel = s.theme === "angel";
  const isOstan = s.theme === "ostan";

  const rootStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    background: "var(--bg)",
    backgroundAttachment: "fixed",
    color: "var(--ink)",
    fontFamily: "var(--font-body)",
    ...(T.vars as CSSProperties),
  };

  const deskStyle: CSSProperties = {
    position: "absolute",
    left: mobile ? 0 : DOCK_W + "px",
    top: 0,
    right: 0,
    bottom: mobile ? MOB_DOCK_H + "px" : TASK_H + "px",
    zIndex: 1,
    overflow: "hidden",
  };

  // focused (topmost non-min) window
  const vis = s.windows.filter((w) => !w.min);
  let focusedId: string | null = null;
  let maxZ = -1;
  vis.forEach((w) => {
    if (w.z > maxZ) {
      maxZ = w.z;
      focusedId = w.id;
    }
  });
  const noWindows = mobile ? focusedId === null : vis.length === 0;
  const emptyHint = mobile
    ? "✦ tap an app below to open it ✦"
    : "✦ pick an app from the dock — then drag windows anywhere ♡ ✦";

  // unread totals
  const msgUnread = Object.values(s.convos).reduce((a, c) => a + (c.unread || 0), 0);
  const notifUnread = s.notifs.filter((n) => n.unread).length;
  const isOpen = (type: string) => s.windows.some((w) => w.type === type && !w.min);

  const badgeStyle: CSSProperties = {
    position: "absolute",
    top: "3px",
    right: "8px",
    background: "var(--accent)",
    color: "var(--on-accent)",
    fontFamily: "var(--font-pixel)",
    fontSize: "8px",
    minWidth: "15px",
    height: "15px",
    padding: "0 4px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const dockDefs: { id: string; icon: string; label: string; badge?: number; open: () => void }[] = [
    { id: "profile", icon: "❀", label: "page", open: () => api.openWindow("profile") },
    { id: "messages", icon: "✉", label: "chats", badge: msgUnread || 0, open: () => api.openWindow("messages") },
    { id: "guestbook", icon: "★", label: "guest", open: () => api.openWindow("guestbook") },
    { id: "notifs", icon: "♡", label: "alerts", badge: notifUnread || 0, open: () => api.openWindow("notifs") },
    { id: "newgroup", icon: "＋", label: "group", open: () => api.openWindow("newgroup") },
    { id: "edit", icon: "✎", label: "edit", open: () => api.openWindow("edit") },
    { id: "settings", icon: "⚙", label: "skins", open: () => api.openWindow("settings") },
  ];

  const dockStyle: CSSProperties = mobile
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: MOB_DOCK_H + "px",
        zIndex: 5,
        background: "var(--rail)",
        borderTop: "var(--border)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "3px",
        padding: "6px 8px",
        overflowX: "auto",
      }
    : {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: DOCK_W + "px",
        zIndex: 5,
        background: "var(--rail)",
        borderRight: "var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "10px 6px",
        overflowY: "auto",
      };

  // taskbar
  const taskbarStyle: CSSProperties = {
    position: "absolute",
    left: DOCK_W + "px",
    right: 0,
    bottom: 0,
    height: TASK_H + "px",
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 8px",
    background: "var(--titlebar)",
    borderTop: "2px solid rgba(255,255,255,.4)",
  };

  // decorations
  const nSp = isOstan ? 0 : s.toggles.rain ? 16 : 7;
  const charSet = isAngel ? ["☁", "✦", "✧"] : s.theme === "kuro" ? ["❀", "✦", "✧"] : ["♡", "✦", "★", "✧"];
  const sparkles = Array.from({ length: nSp }).map((_, i) => ({
    key: i,
    char: charSet[i % charSet.length],
    style: {
      position: "absolute",
      left: ((i * 37 + 11) % 100) + "%",
      top: 0,
      fontSize: 10 + (i % 4) * 5 + "px",
      color: "var(--deco)",
      textShadow: "0 0 8px currentColor",
      animation:
        "fall " +
        (7 + (i % 5) * 1.4) +
        "s linear " +
        (-(i * 1.7) % 10) +
        "s infinite, twinkle " +
        (2 + (i % 3)) +
        "s ease-in-out infinite",
      willChange: "transform",
    } as CSSProperties,
  }));

  const d = new Date(s.now);
  const clock = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

  return (
    <div style={rootStyle} ref={api.rootRef}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* ambient decoration layer */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        {sparkles.map((sp) => (
          <span key={sp.key} style={sp.style}>
            {sp.char}
          </span>
        ))}
        {isAngel && (
          <>
            <div
              style={{
                position: "absolute",
                left: "10%",
                top: "16%",
                width: "150px",
                height: "54px",
                borderRadius: "50px",
                background: "rgba(255,255,255,.7)",
                filter: "blur(1px)",
                animation: "drift 9s ease-in-out infinite alternate",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                right: "12%",
                top: "34%",
                width: "110px",
                height: "42px",
                borderRadius: "50px",
                background: "rgba(255,255,255,.55)",
                filter: "blur(1px)",
                animation: "drift 11s ease-in-out infinite alternate-reverse",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "24%",
                bottom: "14%",
                width: "190px",
                height: "60px",
                borderRadius: "60px",
                background: "rgba(255,255,255,.6)",
                filter: "blur(1.5px)",
                animation: "drift 13s ease-in-out infinite alternate",
              }}
            ></div>
          </>
        )}
      </div>

      {/* DOCK */}
      <div style={dockStyle}>
        {!mobile && (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "20px",
              color: "var(--accent)",
              lineHeight: 1,
              padding: "4px 0 8px",
            }}
          >
            ✦
          </div>
        )}
        {dockDefs.map((dd) => {
          const open = isOpen(dd.id);
          const btnStyle: CSSProperties = {
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1px",
            width: mobile ? "56px" : "62px",
            minWidth: mobile ? "56px" : "auto",
            height: "50px",
            flex: "0 0 auto",
            border: "none",
            cursor: "pointer",
            borderRadius: "var(--radius)",
            background: open ? "var(--tab-active)" : "transparent",
            color: open ? "var(--accent)" : "var(--ink-soft)",
            fontFamily: "var(--font-body)",
          };
          return (
            <button key={dd.id} style={btnStyle} onClick={dd.open} title={dd.label}>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>{dd.icon}</span>
              <span
                style={{
                  fontSize: "8.5px",
                  fontFamily: "var(--font-pixel)",
                  letterSpacing: "0.2px",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {dd.label}
              </span>
              {!!dd.badge && <span style={badgeStyle}>{dd.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* DESKTOP (windows live here) */}
      <div style={deskStyle} ref={api.deskRef}>
        {noWindows && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: "var(--font-pixel)",
              fontSize: "13px",
              color: "var(--ink-soft)",
              padding: "30px",
            }}
          >
            {emptyHint}
          </div>
        )}
        {s.windows.map((w) => (
          <WindowFrame key={w.id} api={api} w={w} isFocused={w.id === focusedId} mobile={mobile} />
        ))}
      </div>

      {/* TASKBAR (desktop) */}
      {!mobile && (
        <div style={taskbarStyle}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 13px 4px 9px",
              background: "var(--accent-2)",
              color: "var(--on-accent)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              borderRadius: "5px",
              boxShadow: "inset 1px 1px 0 rgba(255,255,255,.5)",
              flex: "0 0 auto",
              cursor: "default",
            }}
          >
            ▣ start
          </span>
          <div style={{ display: "flex", gap: "6px", flex: 1, minWidth: 0, overflowX: "auto", padding: "0 4px" }}>
            {s.windows.map((w) => {
              const meta = winMeta(w, s);
              const focused = w.id === focusedId && !w.min;
              return (
                <button
                  key={w.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    maxWidth: "168px",
                    padding: "4px 10px",
                    border: "var(--border)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: focused ? "var(--tab-active)" : "var(--panel-2)",
                    color: "var(--ink)",
                    fontSize: "12px",
                    fontFamily: "var(--font-body)",
                    opacity: w.min ? 0.6 : 1,
                  }}
                  onClick={() => {
                    if (w.id === focusedId && !w.min) api.minimizeWindow(w.id);
                    else api.focusWindow(w.id);
                  }}
                >
                  <span style={{ flex: "0 0 auto" }}>{meta.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {meta.title}
                  </span>
                </button>
              );
            })}
          </div>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "11px",
              color: "var(--titlebar-ink)",
              background: "rgba(0,0,0,.16)",
              padding: "5px 11px",
              borderRadius: "5px",
              flex: "0 0 auto",
            }}
          >
            ♪ {clock}
          </span>
        </div>
      )}

      <Onboarding api={api} />
    </div>
  );
}
