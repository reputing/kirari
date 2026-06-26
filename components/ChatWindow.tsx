"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { PEOPLE, STICKERS } from "@/lib/seed";

// Chat window — handles both DMs and group chats. Header adapts (single avatar
// vs stacked member avatars). Messages render with per-sender colors; stickers
// render large with no bubble; a 3-dot typing indicator shows while a fake
// reply is queued.
export default function ChatWindow({ api, convoId }: { api: DesktopApi; convoId: string }) {
  const { state } = api;
  const c = state.convos[convoId];
  if (!c) return null;

  const isGroup = c.kind === "group";
  const isDm = !isGroup;

  const senderInfo = (id: string): { name: string; color: string } => {
    if (id === "me") return { name: "you", color: "var(--accent)" };
    const p = PEOPLE[id];
    return p ? { name: p.name, color: p.color } : { name: id, color: "#999" };
  };

  let title = "";
  let subline = "";
  let dmInit = "";
  let dmAvStyle: CSSProperties = {};
  let memberAvatars: { init: string; style: CSSProperties }[] = [];

  if (isGroup) {
    title = c.title || "";
    subline = (c.members || []).map((id) => (PEOPLE[id] ? PEOPLE[id].name : id)).join(", ");
    memberAvatars = (c.members || []).slice(0, 4).map((id, i) => ({
      init: (PEOPLE[id] ? PEOPLE[id].name : id).charAt(0).toUpperCase(),
      style: {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        background: PEOPLE[id] ? PEOPLE[id].color : "#999",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontFamily: "var(--font-display)",
        marginLeft: i ? "-8px" : "0",
        border: "2px solid var(--panel-2)",
      },
    }));
  } else {
    const p = PEOPLE[c.who as string];
    title = (p ? p.name : c.who) + " ♡";
    subline = c.typing ? "typing…" : "online now ♡";
    dmInit = (p ? p.name : (c.who as string)).charAt(0).toUpperCase();
    dmAvStyle = {
      width: "36px",
      height: "36px",
      flex: "0 0 auto",
      borderRadius: "50%",
      background: p ? p.color : "#999",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "15px",
      fontFamily: "var(--font-display)",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "9px 12px",
          flex: "0 0 auto",
          background: "var(--panel-2)",
          borderBottom: "var(--border)",
        }}
      >
        {isGroup && (
          <div style={{ display: "flex", flex: "0 0 auto" }}>
            {memberAvatars.map((ma, i) => (
              <span key={i} style={ma.style}>
                {ma.init}
              </span>
            ))}
          </div>
        )}
        {isDm && <div style={dmAvStyle}>{dmInit}</div>}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>
            {subline}
          </div>
        </div>
      </div>

      {/* message list */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
        ref={(el) => {
          api.msgRefs.current[convoId] = el;
        }}
      >
        {c.messages.map((m, i) => {
          const me = m.from === "me";
          const sticker = m.kind === "sticker";
          const si = senderInfo(m.from);
          const prev = c.messages[i - 1];
          const showName = isGroup && !me && (!prev || prev.from !== m.from);
          const bubble: CSSProperties = sticker
            ? { fontSize: "40px", lineHeight: 1, padding: "2px 4px", background: "transparent" }
            : {
                padding: "8px 12px",
                borderRadius: "15px",
                fontSize: "13.5px",
                lineHeight: 1.45,
                background: me ? "var(--bubble-me)" : "var(--bubble-them)",
                color: me ? "var(--bubble-me-ink)" : "var(--bubble-them-ink)",
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                wordBreak: "break-word",
                ...(me ? { borderBottomRightRadius: "5px" } : { borderBottomLeftRadius: "5px" }),
              };
          const avStyle: CSSProperties = {
            width: "26px",
            height: "26px",
            flex: "0 0 auto",
            borderRadius: "50%",
            background: si.color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontFamily: "var(--font-display)",
          };
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: "7px",
                alignItems: "flex-end",
                justifyContent: me ? "flex-end" : "flex-start",
              }}
            >
              {!me && !sticker && <div style={avStyle}>{si.name.charAt(0).toUpperCase()}</div>}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  alignItems: me ? "flex-end" : "flex-start",
                  maxWidth: "76%",
                }}
              >
                {showName && (
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "9.5px",
                      color: si.color,
                      marginLeft: "3px",
                    }}
                  >
                    {si.name}
                  </span>
                )}
                <div style={bubble}>{m.text}</div>
              </div>
            </div>
          );
        })}
        {c.typing && (
          <div style={{ display: "flex", gap: "7px", alignItems: "flex-end", justifyContent: "flex-start" }}>
            <div
              style={{
                display: "flex",
                gap: "4px",
                padding: "10px 12px",
                background: "var(--bubble-them)",
                borderRadius: "15px",
                borderBottomLeftRadius: "5px",
              }}
            >
              {[0, 0.2, 0.4].map((d, i) => (
                <span
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--bubble-them-ink)",
                    animation: `bounce 1.3s ease-in-out ${d}s infinite`,
                  }}
                ></span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div
        style={{
          flex: "0 0 auto",
          borderTop: "var(--border)",
          background: "var(--panel-2)",
          padding: "8px 10px",
        }}
      >
        <div style={{ display: "flex", gap: "2px", overflowX: "auto", paddingBottom: "6px" }}>
          {STICKERS.map((st, i) => (
            <button
              key={i}
              style={{
                flex: "0 0 auto",
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
                padding: "2px 5px",
                borderRadius: "8px",
                lineHeight: 1,
              }}
              onClick={() => api.sendSticker(convoId, st)}
            >
              {st}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
          <input
            value={c.draft}
            onChange={(e) => api.setConvoDraft(convoId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                api.sendMsg(convoId);
              }
            }}
            placeholder={isGroup ? "message the group…" : "say something nice…"}
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--panel)",
              border: "var(--border)",
              borderRadius: "999px",
              padding: "9px 14px",
              fontSize: "13.5px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <button
            style={{
              width: "40px",
              height: "40px",
              flex: "0 0 auto",
              border: "none",
              background: "var(--accent)",
              color: "var(--on-accent)",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "15px",
              boxShadow: "var(--btn-shadow)",
            }}
            onClick={() => api.sendMsg(convoId)}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
