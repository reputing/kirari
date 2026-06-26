"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { WindowState } from "@/lib/types";
import { PEOPLE } from "@/lib/seed";
import ProfileWindow from "./ProfileWindow";
import ChatWindow from "./ChatWindow";
import GuestbookWindow from "./GuestbookWindow";
import MessagesWindow from "./MessagesWindow";
import NotifsWindow from "./NotifsWindow";
import EditWindow from "./EditWindow";
import SettingsWindow from "./SettingsWindow";
import NewGroupWindow from "./NewGroupWindow";

// Title + icon for a window's titlebar and taskbar entry.
export function winMeta(
  w: WindowState,
  state: DesktopApi["state"]
): { icon: string; title: string } {
  if (w.type === "profile") return { icon: "❀", title: "kirari.cafe/@" + state.profile.handle };
  if (w.type === "chat") {
    const c = state.convos[w.convoId as string];
    if (!c) return { icon: "✉", title: "chat" };
    if (c.kind === "group") return { icon: "✦", title: c.title! };
    const p = PEOPLE[c.who as string];
    return { icon: "✉", title: (p ? p.name : c.who) + " ♡" };
  }
  if (w.type === "guestbook") return { icon: "★", title: "★ guestbook" };
  if (w.type === "messages") return { icon: "✉", title: "messages" };
  if (w.type === "notifs") return { icon: "♡", title: "notifications" };
  if (w.type === "edit") return { icon: "✎", title: "edit my page" };
  if (w.type === "settings") return { icon: "⚙", title: "settings" };
  if (w.type === "newgroup") return { icon: "＋", title: "new group chat" };
  return { icon: "✦", title: "window" };
}

export default function WindowFrame({
  api,
  w,
  isFocused,
  mobile,
}: {
  api: DesktopApi;
  w: WindowState;
  isFocused: boolean;
  mobile: boolean;
}) {
  const meta = winMeta(w, api.state);

  const frameStyle: CSSProperties = mobile
    ? {
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: w.z,
        display: isFocused ? "flex" : "none",
        flexDirection: "column",
        background: "var(--panel)",
        overflow: "hidden",
      }
    : {
        position: "absolute",
        left: w.x + "px",
        top: w.y + "px",
        width: w.w + "px",
        height: w.h + "px",
        zIndex: w.z,
        display: w.min ? "none" : "flex",
        flexDirection: "column",
        background: "var(--panel)",
        border: "var(--border)",
        borderRadius: w.max ? "0" : "var(--radius)",
        boxShadow: isFocused ? "var(--shadow)" : "0 8px 22px -14px rgba(0,0,0,.45)",
        overflow: "hidden",
        transition: "box-shadow .15s",
      };

  const barStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "34px",
    flex: "0 0 auto",
    padding: "0 10px",
    background: "var(--titlebar)",
    color: "var(--titlebar-ink)",
    cursor: mobile ? "default" : "grab",
    userSelect: "none",
  };

  const ctrlStyle: CSSProperties = {
    width: "19px",
    height: "17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    lineHeight: 1,
    border: "1px solid rgba(255,255,255,.5)",
    borderRadius: "3px",
    background: "rgba(255,255,255,.12)",
    color: "var(--titlebar-ink)",
    cursor: "pointer",
    padding: 0,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--panel)",
  };

  return (
    <div style={frameStyle} data-win={w.id} onMouseDown={() => api.focusWindow(w.id)}>
      {/* titlebar */}
      <div style={barStyle} onMouseDown={(e) => api.startDrag(w.id, e)}>
        <span style={{ fontSize: "12px", lineHeight: 1, flex: "0 0 auto" }}>{meta.icon}</span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            letterSpacing: "0.2px",
          }}
        >
          {meta.title}
        </span>
        <div style={{ display: "flex", gap: "5px", flex: "0 0 auto" }} onMouseDown={(e) => e.stopPropagation()}>
          <button style={ctrlStyle} onClick={() => api.minimizeWindow(w.id)}>
            –
          </button>
          {!mobile && (
            <button style={ctrlStyle} onClick={() => api.toggleMax(w.id)}>
              ▢
            </button>
          )}
          <button style={ctrlStyle} onClick={() => api.closeWindow(w.id)}>
            ✕
          </button>
        </div>
      </div>

      {/* body */}
      <div style={bodyStyle}>
        {w.type === "profile" && <ProfileWindow api={api} />}
        {w.type === "chat" && <ChatWindow api={api} convoId={w.convoId as string} />}
        {w.type === "guestbook" && <GuestbookWindow api={api} />}
        {w.type === "messages" && <MessagesWindow api={api} />}
        {w.type === "notifs" && <NotifsWindow api={api} />}
        {w.type === "edit" && <EditWindow api={api} />}
        {w.type === "settings" && <SettingsWindow api={api} />}
        {w.type === "newgroup" && <NewGroupWindow api={api} winId={w.id} />}
      </div>
    </div>
  );
}
