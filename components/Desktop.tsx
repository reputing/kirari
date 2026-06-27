"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useDesktop } from "@/lib/useDesktop";
import { resolveThemeVars } from "@/lib/themes";
import { KEYFRAMES } from "@/lib/styleHelpers";
import { playClick } from "@/lib/sound";
import WindowFrame, { winMeta } from "./WindowFrame";
import Onboarding from "./Onboarding";
import DesktopIcons, { type IconDef } from "./DesktopIcons";
import ContextMenu, { type MenuItem } from "./ContextMenu";

const DOCK_W = 76;
const TASK_H = 40;
const MOB_DOCK_H = 66;

// The virtual desktop environment: theme root, ambient decorations, left dock,
// floating window area, and bottom taskbar (desktop) / bottom dock (mobile).
export default function Desktop() {
  const api = useDesktop();
  const s = api.state;
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const themeVars = { ...resolveThemeVars(s.theme, s.customThemes) } as Record<string, string>;
  if (s.fontDisplay) themeVars["--font-display"] = s.fontDisplay;
  if (s.fontBody) themeVars["--font-body"] = s.fontBody;

  // subtle click sound on buttons (toggleable via settings → sounds)
  const soundsOn = s.toggles.sounds;
  useEffect(() => {
    if (!soundsOn) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t && t.closest("button, a, [role=button]")) playClick("tap");
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [soundsOn]);

  // dashboard wallpaper (separate from the public page bg)
  const dashBg: string =
    s.dashBgType === "color"
      ? s.dashBgColor || "var(--bg)"
      : s.dashBgType === "image" && s.dashBgUrl
      ? `center/cover url(${s.dashBgUrl})`
      : "var(--bg)";
  const mobile = s.isMobile;
  const isAngel = s.theme === "angel";
  const isOstan = s.theme === "ostan";

  const rootStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    background: dashBg,
    backgroundAttachment: "fixed",
    color: "var(--ink)",
    fontFamily: "var(--font-body)",
    ...(themeVars as CSSProperties),
  };

  const deskStyle: CSSProperties = {
    position: "absolute",
    left: 0,
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
  // unread totals
  const msgUnread = Object.values(s.convos).reduce((a, c) => a + (c.unread || 0), 0);
  const notifUnread = s.notifs.filter((n) => n.unread).length;
  const reqIncoming = s.requests.filter((r) => r.dir === "in").length;
  const isOpen = (type: string) => s.windows.some((w) => w.type === type && !w.min);
  const hasWin = (type: string) => s.windows.some((w) => w.type === type);

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

  const appDefs: IconDef[] = [
    { id: "profile", icon: "❀", label: "page", open: () => api.openWindow("profile") },
    { id: "messages", icon: "✉", label: "chats", badge: msgUnread || 0, open: () => api.openWindow("dms") },
    { id: "guestbook", icon: "★", label: "guest", open: () => api.openWindow("guestbook") },
    { id: "notifs", icon: "♡", label: "alerts", badge: notifUnread || 0, open: () => api.openWindow("notifs") },
    { id: "requests", icon: "♥", label: "friends", badge: reqIncoming || 0, open: () => api.openWindow("requests") },
    { id: "newgroup", icon: "＋", label: "group", open: () => api.openWindow("newgroup") },
    { id: "edit", icon: "✎", label: "edit", open: () => api.openWindow("edit") },
    { id: "settings", icon: "⚙", label: "skins", open: () => api.openWindow("settings") },
  ];

  // pinned favourites float to the top of the dock, in pin order
  const orderedDock = [...appDefs].sort((a, b) => {
    const pa = s.pinnedApps.indexOf(a.id);
    const pb = s.pinnedApps.indexOf(b.id);
    if (pa !== -1 && pb !== -1) return pa - pb;
    if (pa !== -1) return -1;
    if (pb !== -1) return 1;
    return 0;
  });
  const firstUnpinnedIdx = orderedDock.findIndex((d) => !s.pinnedApps.includes(d.id));

  // ---- context menu builders ----
  const appById = (id: string) => appDefs.find((a) => a.id === id);
  function openDesktopMenu(e: React.MouseEvent) {
    if (mobile) return;
    e.preventDefault();
    const visN = s.windows.filter((w) => !w.min).length;
    const items: MenuItem[] = [
      { label: "tile windows", icon: "▦", onClick: api.tileWindows, disabled: visN < 1 },
      { label: "cascade windows", icon: "▤", onClick: api.cascadeWindows, disabled: visN < 1 },
      { divider: true, label: "" },
      { label: "open page", icon: "❀", onClick: () => api.openWindow("profile") },
      { label: "open chats", icon: "✉", onClick: () => api.openWindow("messages") },
      { label: "edit my page", icon: "✎", onClick: () => api.openWindow("edit") },
      { label: "skins & settings", icon: "⚙", onClick: () => api.openWindow("settings") },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }
  function openIconMenu(e: React.MouseEvent, def: IconDef) {
    e.preventDefault();
    e.stopPropagation();
    const pinned = s.pinnedApps.includes(def.id);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "open", icon: "▸", onClick: def.open },
        { label: pinned ? "unpin from dock" : "pin to dock", icon: "✦", checked: pinned, onClick: () => api.togglePinApp(def.id) },
      ],
    });
  }
  function openWindowMenu(e: React.MouseEvent, winId: string) {
    if (mobile) return;
    e.preventDefault();
    e.stopPropagation();
    const w = s.windows.find((x) => x.id === winId);
    if (!w) return;
    const pinned = s.pinnedWins.includes(w.type);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: w.max ? "restore" : "maximize", icon: "▢", onClick: () => api.toggleMax(winId) },
        { label: "minimize", icon: "–", onClick: () => api.minimizeWindow(winId) },
        { divider: true, label: "" },
        { label: "tile all windows", icon: "▦", onClick: api.tileWindows },
        { label: "cascade all windows", icon: "▤", onClick: api.cascadeWindows },
        { divider: true, label: "" },
        { label: pinned ? "unpin from taskbar" : "pin to taskbar", icon: "✦", checked: pinned, onClick: () => api.togglePinWin(w.type) },
        { label: "close", icon: "✕", onClick: () => api.closeWindow(winId) },
      ],
    });
  }

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

  // taskbar (desktop) — full width since the dock no longer occupies the left
  const taskbarStyle: CSSProperties = {
    position: "absolute",
    left: 0,
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
  const nSp = isOstan || !s.toggles.rain ? 0 : 16;
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

      {api.syncError && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999, background: "#c0392b", color: "#fff", padding: "8px 14px", fontSize: "12.5px", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 2px 10px rgba(0,0,0,.3)" }}>
          <span style={{ fontSize: "15px" }}>⚠</span>
          <span style={{ flex: 1 }}>{api.syncError}</span>
        </div>
      )}

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

      {/* DOCK (mobile only — desktop uses free-floating icons) */}
      {mobile && (
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
        {orderedDock.map((dd, idx) => {
          const open = isOpen(dd.id);
          const running = hasWin(dd.id);
          const pinned = s.pinnedApps.includes(dd.id);
          const showSep = !mobile && idx === firstUnpinnedIdx && firstUnpinnedIdx > 0;
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
            <div key={dd.id} style={{ display: "contents" }}>
              {showSep && (
                <span
                  style={{
                    flex: "0 0 auto",
                    width: mobile ? "1px" : "70%",
                    height: mobile ? "30px" : "1px",
                    margin: mobile ? "0 2px" : "2px 0",
                    background: "var(--line)",
                  }}
                />
              )}
              <button
                style={btnStyle}
                onClick={dd.open}
                onContextMenu={(e) => {
                  e.preventDefault();
                  api.togglePinApp(dd.id);
                }}
                title={(pinned ? "unpin " : "pin ") + dd.label + " (right-click)"}
              >
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
                {pinned && (
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: "5px",
                      fontSize: "8px",
                      color: "var(--accent)",
                      lineHeight: 1,
                    }}
                  >
                    ✦
                  </span>
                )}
                {running && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "2px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
      )}

      {/* DESKTOP (icons + windows live here) */}
      <div style={deskStyle} ref={api.deskRef} onContextMenu={openDesktopMenu}>
        {!mobile && (
          <DesktopIcons api={api} defs={appDefs} onIconContext={openIconMenu} />
        )}
        {s.windows.map((w) => (
          <WindowFrame
            key={w.id}
            api={api}
            w={w}
            isFocused={w.id === focusedId}
            mobile={mobile}
            onTitleContext={openWindowMenu}
          />
        ))}
      </div>

      {/* TASKBAR (desktop) */}
      {!mobile && (
        <div style={taskbarStyle}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const items: MenuItem[] = appDefs.map((a) => ({
                label: a.label,
                icon: a.icon,
                onClick: a.open,
              }));
              items.push({ divider: true, label: "" });
              items.push({ label: "tile windows", icon: "▦", onClick: api.tileWindows });
              items.push({ label: "cascade windows", icon: "▤", onClick: api.cascadeWindows });
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const h = items.length * 34 + 12;
              setMenu({ x: r.left, y: Math.max(8, r.top - 6 - h), items });
            }}
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
              cursor: "pointer",
              border: "none",
            }}
          >
            ▣ start
          </button>
          <div style={{ display: "flex", gap: "6px", flex: 1, minWidth: 0, overflowX: "auto", padding: "0 4px" }}>
            {(() => {
              // taskbar entries: every open window, plus pinned types that have
              // no open window (so a pin persists after the window is closed).
              type Entry = { key: string; win?: typeof s.windows[number]; type: string };
              const entries: Entry[] = s.windows.map((w) => ({ key: w.id, win: w, type: w.type }));
              s.pinnedWins.forEach((t) => {
                if (!s.windows.some((w) => w.type === t)) entries.push({ key: "pin-" + t, type: t });
              });
              return entries.map((ent) => {
                const w = ent.win;
                const pinned = s.pinnedWins.includes(ent.type);
                const focused = !!w && w.id === focusedId && !w.min;
                const meta = w
                  ? winMeta(w, s)
                  : winMeta({ type: ent.type } as typeof s.windows[number], s);
                return (
                  <button
                    key={ent.key}
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
                      opacity: w ? (w.min ? 0.6 : 1) : 0.5,
                    }}
                    onClick={() => {
                      if (!w) {
                        api.openWindow(ent.type as Parameters<typeof api.openWindow>[0]);
                      } else if (w.id === focusedId && !w.min) {
                        api.minimizeWindow(w.id);
                      } else {
                        api.focusWindow(w.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      api.togglePinWin(ent.type);
                    }}
                    title={(pinned ? "unpin" : "pin") + " (right-click)"}
                  >
                    {pinned && <span style={{ fontSize: "8px", color: "var(--accent)", flex: "0 0 auto" }}>✦</span>}
                    <span style={{ flex: "0 0 auto" }}>{meta.icon}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {meta.title}
                    </span>
                  </button>
                );
              });
            })()}
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

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}

      <Onboarding api={api} />
    </div>
  );
}
