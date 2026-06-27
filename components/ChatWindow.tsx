"use client";

import { useRef, useState } from "react";
import { initOf } from "@/lib/styleHelpers";
import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { peopleAll, STICKERS, EMOJIS } from "@/lib/seed";

// Quick reactions surfaced on hover/tap; the full set lives in the picker.
const QUICK_REACTS = ["❤️", "😂", "🥺", "👍", "🔥", "✨"];

// Chat window — DMs and group chats. Adds an emoji picker, file attachments,
// message reactions, and (for groups) a member manager to add/remove people.
export default function ChatWindow({ api, convoId }: { api: DesktopApi; convoId: string }) {
  const { state } = api;
  const c = state.convos[convoId];
  const PEOPLE = peopleAll(state.friends);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [manage, setManage] = useState(false);
  const [reactFor, setReactFor] = useState<number | null>(null);
  const [addHandle, setAddHandle] = useState("");

  if (!c) return null;
  const isGroup = c.kind === "group";
  const isDm = !isGroup;

  const senderInfo = (id: string): { name: string; color: string } => {
    if (id === "me") return { name: "you", color: "var(--accent)" };
    const p = PEOPLE[id];
    return p ? { name: p.name, color: p.color } : { name: id, color: "#b08bbf" };
  };

  let title = "";
  let subline = "";
  let dmInit = "";
  let dmAvStyle: CSSProperties = {};

  if (isGroup) {
    title = c.title || "";
    const names = (c.members || []).map((id) => (PEOPLE[id] ? PEOPLE[id].name : id));
    subline = names.length + (names.length === 1 ? " member" : " members") + " · " + names.join(", ");
  } else {
    const p = PEOPLE[c.who as string];
    title = (p ? p.name : c.who) + " ♡";
    subline = c.typing ? "typing…" : "online now ♡";
    dmInit = initOf(p ? p.name : (c.who as string));
    dmAvStyle = {
      width: "36px", height: "36px", flex: "0 0 auto", borderRadius: "50%",
      background: p ? p.color : "#b08bbf", color: "#fff", display: "flex",
      alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "var(--font-display)",
    };
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    api.sendAttachment(convoId, { name: f.name, type: f.type || "file", url });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "9px 12px", flex: "0 0 auto", background: "var(--panel-2)", borderBottom: "var(--border)" }}>
        {isGroup ? (
          <div style={{ width: "36px", height: "36px", flex: "0 0 auto", borderRadius: "13px", background: "var(--accent-2)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontFamily: "var(--font-display)" }}>
            {initOf(title)}
          </div>
        ) : (
          <div style={dmAvStyle}>{dmInit}</div>
        )}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subline}</div>
        </div>
        {isGroup && (
          <button
            onClick={() => setManage((v) => !v)}
            title="manage members"
            style={{ flex: "0 0 auto", border: "var(--border)", background: manage ? "var(--tab-active)" : "var(--panel)", color: "var(--ink)", borderRadius: "10px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-display)" }}
          >
            ⚙ members
          </button>
        )}
      </div>

      {/* member manager (groups) */}
      {isGroup && manage && (
        <div style={{ flex: "0 0 auto", background: "var(--panel)", borderBottom: "var(--border)", padding: "11px 12px" }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", marginBottom: "8px" }}>MEMBERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {(c.members || []).map((id) => {
              const p = PEOPLE[id];
              return (
                <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 6px 4px 9px", background: "var(--panel-2)", border: "var(--border)", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: p ? p.color : "#b08bbf", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontFamily: "var(--font-display)" }}>{initOf(p ? p.name : id)}</span>
                  {p ? p.name : "@" + id}
                  <button onClick={() => api.removeFromGroup(convoId, id)} title="remove" style={{ width: "16px", height: "16px", border: "none", borderRadius: "50%", background: "var(--line)", color: "var(--ink)", cursor: "pointer", fontSize: "10px", lineHeight: 1, padding: 0 }}>✕</button>
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", fontSize: "12px", pointerEvents: "none" }}>@</span>
              <input
                value={addHandle}
                onChange={(e) => setAddHandle(e.target.value.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase())}
                onKeyDown={(e) => { if (e.key === "Enter" && addHandle.trim()) { api.addToGroup(convoId, addHandle); setAddHandle(""); } }}
                placeholder="add someone by handle"
                style={{ width: "100%", border: "var(--border)", borderRadius: "10px", background: "var(--panel-2)", padding: "7px 10px 7px 22px", fontSize: "12.5px", color: "var(--ink)", outline: "none" }}
              />
            </div>
            <button
              onClick={() => { if (addHandle.trim()) { api.addToGroup(convoId, addHandle); setAddHandle(""); } }}
              style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "10px", padding: "0 14px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "12.5px" }}
            >
              add
            </button>
          </div>
        </div>
      )}

      {/* message list */}
      <div
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}
        ref={(el) => { api.msgRefs.current[convoId] = el; }}
        onClick={() => { if (reactFor !== null) setReactFor(null); }}
      >
        {c.messages.map((m, i) => {
          const me = m.from === "me";
          const sticker = m.kind === "sticker";
          const si = senderInfo(m.from);
          const prev = c.messages[i - 1];
          const showName = isGroup && !me && (!prev || prev.from !== m.from);
          const att = m.attachment;
          const isImg = att && att.type.startsWith("image/");

          const bubble: CSSProperties = sticker
            ? { fontSize: "40px", lineHeight: 1, padding: "2px 4px", background: "transparent" }
            : {
                padding: att ? "6px" : "8px 12px",
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
            width: "26px", height: "26px", flex: "0 0 auto", borderRadius: "50%",
            background: si.color, color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "11px", fontFamily: "var(--font-display)",
          };
          const reactions = m.reactions || {};
          const reactionKeys = Object.keys(reactions);

          return (
            <div key={m.id} style={{ display: "flex", gap: "7px", alignItems: "flex-end", justifyContent: me ? "flex-end" : "flex-start" }}>
              {!me && !sticker && <div style={avStyle}>{initOf(si.name)}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: me ? "flex-end" : "flex-start", maxWidth: "78%", position: "relative" }}>
                {showName && <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: si.color, marginLeft: "3px" }}>{si.name}</span>}

                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexDirection: me ? "row-reverse" : "row" }}>
                  <div style={bubble}>
                    {att ? (
                      isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={att.url} alt={att.name} style={{ maxWidth: "190px", maxHeight: "190px", borderRadius: "10px", display: "block" }} />
                      ) : (
                        <a href={att.url} download={att.name} style={{ display: "flex", alignItems: "center", gap: "8px", color: "inherit", textDecoration: "none", padding: "4px 6px" }}>
                          <span style={{ fontSize: "20px" }}>📎</span>
                          <span style={{ fontSize: "12.5px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                        </a>
                      )
                    ) : (
                      m.text
                    )}
                  </div>
                  {/* react trigger */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setReactFor(reactFor === m.id ? null : m.id); }}
                    title="react"
                    style={{ flex: "0 0 auto", width: "22px", height: "22px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "50%", fontSize: "13px", opacity: 0.5, color: "var(--ink-soft)" }}
                  >
                    ☺
                  </button>
                </div>

                {/* reaction chips */}
                {reactionKeys.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "1px" }}>
                    {reactionKeys.map((em) => {
                      const who = reactions[em];
                      const mine = who.includes("me");
                      return (
                        <button
                          key={em}
                          onClick={(e) => { e.stopPropagation(); api.reactToMsg(convoId, m.id, em); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "999px", border: mine ? "1.5px solid var(--accent)" : "1.5px solid var(--line)", background: mine ? "var(--tab-active)" : "var(--panel)", cursor: "pointer", fontSize: "11px", color: "var(--ink)" }}
                        >
                          <span>{em}</span>
                          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--ink-soft)" }}>{who.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* quick-react popover */}
                {reactFor === m.id && (
                  <div style={{ position: "absolute", bottom: "100%", marginBottom: "4px", [me ? "right" : "left"]: 0, display: "flex", gap: "2px", padding: "5px 7px", background: "var(--panel)", border: "var(--border)", borderRadius: "999px", boxShadow: "0 8px 22px -10px rgba(0,0,0,.5)", zIndex: 50 } as CSSProperties}>
                    {QUICK_REACTS.map((em) => (
                      <button key={em} onClick={(e) => { e.stopPropagation(); api.reactToMsg(convoId, m.id, em); setReactFor(null); }} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "18px", padding: "1px 3px", borderRadius: "8px", lineHeight: 1 }}>{em}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {c.typing && (
          <div style={{ display: "flex", gap: "7px", alignItems: "flex-end", justifyContent: "flex-start" }}>
            <div style={{ display: "flex", gap: "4px", padding: "10px 12px", background: "var(--bubble-them)", borderRadius: "15px", borderBottomLeftRadius: "5px" }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--bubble-them-ink)", animation: `bounce 1.3s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{ flex: "0 0 auto", borderTop: "var(--border)", background: "var(--panel-2)", padding: "8px 10px", position: "relative" }}>
        {/* emoji picker popover */}
        {showEmoji && (
          <Picker title="emoji" onClose={() => setShowEmoji(false)} items={EMOJIS} onPick={(em) => api.setConvoDraft(convoId, c.draft + em)} />
        )}
        {showStickers && (
          <Picker title="stickers" big onClose={() => setShowStickers(false)} items={STICKERS} onPick={(st) => { api.sendSticker(convoId, st); setShowStickers(false); }} />
        )}

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input ref={fileRef} type="file" hidden onChange={onPickFile} />
          <ComposerBtn label="attach a file" onClick={() => fileRef.current?.click()}>📎</ComposerBtn>
          <ComposerBtn label="stickers" active={showStickers} onClick={() => { setShowStickers((v) => !v); setShowEmoji(false); }}>✿</ComposerBtn>
          <ComposerBtn label="emoji" active={showEmoji} onClick={() => { setShowEmoji((v) => !v); setShowStickers(false); }}>☺</ComposerBtn>
          <input
            value={c.draft}
            onChange={(e) => api.setConvoDraft(convoId, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); api.sendMsg(convoId); } }}
            placeholder={isGroup ? "message the group…" : "say something nice…"}
            style={{ flex: 1, minWidth: 0, background: "var(--panel)", border: "var(--border)", borderRadius: "999px", padding: "9px 14px", fontSize: "13.5px", color: "var(--ink)", outline: "none" }}
          />
          <button
            onClick={() => api.sendMsg(convoId)}
            style={{ width: "40px", height: "40px", flex: "0 0 auto", border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "50%", cursor: "pointer", fontSize: "15px", boxShadow: "var(--btn-shadow)" }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

function ComposerBtn({ children, label, active, onClick }: { children: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ width: "34px", height: "34px", flex: "0 0 auto", border: "var(--border)", background: active ? "var(--tab-active)" : "var(--panel)", color: "var(--ink)", borderRadius: "50%", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
    >
      {children}
    </button>
  );
}

function Picker({ title, items, onPick, onClose, big }: { title: string; items: string[]; onPick: (s: string) => void; onClose: () => void; big?: boolean }) {
  return (
    <div style={{ position: "absolute", left: "10px", right: "10px", bottom: "100%", marginBottom: "8px", background: "var(--panel)", border: "var(--border)", borderRadius: "16px", boxShadow: "0 14px 36px -14px rgba(0,0,0,.55)", padding: "10px", zIndex: 60 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ flex: 1, fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", letterSpacing: "0.5px" }}>{title.toUpperCase()}</span>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-soft)", fontSize: "13px" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${big ? 6 : 8}, 1fr)`, gap: "2px", maxHeight: "168px", overflowY: "auto" }}>
        {items.map((it, i) => (
          <button key={i} onClick={() => onPick(it)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: big ? "24px" : "19px", padding: "4px", borderRadius: "8px", lineHeight: 1 }}>{it}</button>
        ))}
      </div>
    </div>
  );
}
