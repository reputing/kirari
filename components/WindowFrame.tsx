"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { WindowState } from "@/lib/types";
import { PEOPLE } from "@/lib/seed";
import ProfileWindow from "./ProfileWindow";
import ChatWindow from "./ChatWindow";
import GuestbookWindow from "./GuestbookWindow";
import MessagesWindow from "./MessagesWindow";
import DMsWindow from "./DMsWindow";
import NotifsWindow from "./NotifsWindow";
import EditWindow from "./EditWindow";
import SettingsWindow from "./SettingsWindow";
import NewGroupWindow from "./NewGroupWindow";
import RequestsWindow from "./RequestsWindow";

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
  if (w.type === "dms") return { icon: "✉", title: "✦ chats" };
  if (w.type === "notifs") return { icon: "♡", title: "notifications" };
  if (w.type === "edit") return { icon: "✎", title: "edit my page" };
  if (w.type === "settings") return { icon: "⚙", title: "settings" };
  if (w.type === "newgroup") return { icon: "＋", title: "new group chat" };
  if (w.type === "requests") return { icon: "♡", title: "friend requests" };
  return { icon: "✦", title: "window" };
}

export default function WindowFrame({
  api,
  w,
  isFocused,
  mobile,
  onTitleContext,
}: {
  api: DesktopApi;
  w: WindowState;
  isFocused: boolean;
  mobile: boolean;
  onTitleContext?: (e: React.MouseEvent, winId: string) => void;
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
        border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
        borderRadius: w.max ? "0" : "max(13px, var(--radius))",
        boxShadow: isFocused
          ? "0 20px 50px -20px rgba(0,0,0,.55), 0 4px 14px -8px rgba(0,0,0,.32)"
          : "0 10px 26px -18px rgba(0,0,0,.42)",
        overflow: "hidden",
        transition: "box-shadow .18s ease",
      };

  const barStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    height: "38px",
    flex: "0 0 auto",
    padding: "0 8px 0 11px",
    background: "var(--titlebar)",
    color: "var(--titlebar-ink)",
    cursor: mobile ? "default" : "grab",
    userSelect: "none",
    boxShadow: "inset 0 -1px 0 rgba(0,0,0,.14)",
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--panel)",
  };

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    api.focusWindow(w.id);
    const frame = (e.currentTarget as HTMLElement).closest("[data-win]") as HTMLElement | null;
    if (!frame) return;
    const sx = e.clientX, sy = e.clientY, sw = frame.offsetWidth, sh = frame.offsetHeight;
    let last = { w: sw, h: sh };
    document.body.style.userSelect = "none";
    const move = (ev: MouseEvent) => {
      const nw = Math.max(260, sw + (ev.clientX - sx));
      const nh = Math.max(200, sh + (ev.clientY - sy));
      frame.style.width = nw + "px";
      frame.style.height = nh + "px";
      last = { w: nw, h: nh };
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.userSelect = "";
      api.resizeWindow(w.id, last.w, last.h);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div style={frameStyle} data-win={w.id} onMouseDown={() => api.focusWindow(w.id)}>
      {/* titlebar */}
      <div
        style={barStyle}
        onMouseDown={(e) => api.startDrag(w.id, e)}
        onContextMenu={(e) => onTitleContext?.(e, w.id)}
      >
        <span
          style={{
            width: "21px",
            height: "21px",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            lineHeight: 1,
            flex: "0 0 auto",
            background: "color-mix(in srgb, var(--titlebar-ink) 18%, transparent)",
          }}
        >
          {meta.icon}
        </span>
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
        <div style={{ display: "flex", gap: "3px", flex: "0 0 auto" }} onMouseDown={(e) => e.stopPropagation()}>
          <button className="kw-ctrl" title="minimize" onClick={() => api.minimizeWindow(w.id)}>
            –
          </button>
          {!mobile && (
            <button className="kw-ctrl" title={w.max ? "restore" : "maximize"} onClick={() => api.toggleMax(w.id)}>
              {w.max ? "❐" : "▢"}
            </button>
          )}
          <button className="kw-ctrl kw-ctrl-close" title="close" onClick={() => api.closeWindow(w.id)}>
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
        {w.type === "dms" && <DMsWindow api={api} />}
        {w.type === "notifs" && <NotifsWindow api={api} />}
        {w.type === "edit" && <EditWindow api={api} />}
        {w.type === "settings" && <SettingsWindow api={api} />}
        {w.type === "newgroup" && <NewGroupWindow api={api} winId={w.id} />}
        {w.type === "requests" && <RequestsWindow api={api} />}
      </div>

      {/* resize grip (desktop, non-maximized) */}
      {!mobile && !w.max && (
        <div
          onMouseDown={startResize}
          title="drag to resize"
          style={{ position: "absolute", right: "1px", bottom: "1px", width: "16px", height: "16px", cursor: "nwse-resize", zIndex: 6, background: "linear-gradient(135deg, transparent 45%, color-mix(in srgb, var(--ink) 32%, transparent) 45%, color-mix(in srgb, var(--ink) 32%, transparent) 60%, transparent 60%)" }}
        />
      )}
    </div>
  );
}
