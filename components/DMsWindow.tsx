"use client";

import { useEffect, useRef, useState } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { getSession } from "@/lib/auth";
import {
  listThreads, loadMessages, sendMessage, loadKnocks, markKnocksRead, knock,
  listGroups, loadGroupMessages, sendGroupMessage, loadGroupMembers, createGroup,
  type DMThread, type DMMessage, type GroupThread,
} from "@/lib/chat";
import { initOf } from "@/lib/styleHelpers";
import { EMOJIS } from "@/lib/seed";
import { uploadAsset, relTime } from "@/lib/store";

// Unified chats: 1:1 DMs + real group chats. Left rail lists both (groups
// marked with ⚇); right pane is the active conversation. Polls for new msgs.
type ActiveChat = { kind: "dm"; thread: DMThread } | { kind: "group"; group: GroupThread };

export default function DMsWindow(_props: { api: DesktopApi }) {
  const [me, setMe] = useState("");
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [groups, setGroups] = useState<GroupThread[]>([]);
  const [knocks, setKnocks] = useState<{ id: string; from: string; thread: string }[]>([]);
  const [active, setActive] = useState<ActiveChat | null>(null);
  const [msgs, setMsgs] = useState<DMMessage[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { getSession().then((s) => setMe(s?.handle || "")); }, []);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    const refresh = async () => {
      const [t, g, k] = await Promise.all([listThreads(me), listGroups(me), loadKnocks(me)]);
      if (!alive) return;
      setThreads(t); setGroups(g); setKnocks(k);
    };
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [me]);

  useEffect(() => {
    if (!active) { setMsgs([]); setMembers([]); return; }
    let alive = true;
    if (active.kind === "dm") markKnocksRead(me, active.thread.id).then(() => setKnocks((k) => k.filter((x) => x.thread !== active.thread.id)));
    if (active.kind === "group") loadGroupMembers(active.group.id).then((m) => { if (alive) setMembers(m); });
    const refresh = async () => {
      const m = active.kind === "dm" ? await loadMessages(active.thread.id) : await loadGroupMessages(active.group.id);
      if (alive) setMsgs(m);
    };
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [active, me]);

  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [msgs]);

  async function send() {
    if (!active || !text.trim()) return;
    const body = text.trim();
    setText(""); setShowEmoji(false);
    const m = active.kind === "dm" ? await sendMessage(active.thread.id, me, body) : await sendGroupMessage(active.group.id, me, body);
    if (m) setMsgs((prev) => [...prev, m]);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !active) return;
    try {
      const { url } = await uploadAsset(f, "bg", me);
      const m = active.kind === "dm" ? await sendMessage(active.thread.id, me, url) : await sendGroupMessage(active.group.id, me, url);
      if (m) setMsgs((prev) => [...prev, m]);
    } catch { /* */ }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function startDm() {
    const to = newHandle.trim().replace(/^@+/, "").toLowerCase();
    if (!to || !me) return;
    const res = await knock(me, to);
    setNewHandle("");
    if (res.ok) {
      const t = await listThreads(me);
      setThreads(t);
      const opened = t.find((x) => x.other === to);
      if (opened) setActive({ kind: "dm", thread: opened });
    } else if (res.error) { alert(res.error); }
  }

  async function makeGroup() {
    if (!groupName.trim() || !me) return;
    const handles = groupMembers.split(/[\s,]+/).map((x) => x.replace(/^@+/, "").toLowerCase()).filter(Boolean);
    const res = await createGroup(me, groupName.trim(), handles);
    if (res.ok && res.groupId) {
      setCreating(false); setGroupName(""); setGroupMembers("");
      const g = await listGroups(me);
      setGroups(g);
      const opened = g.find((x) => x.id === res.groupId);
      if (opened) setActive({ kind: "group", group: opened });
    } else if (res.error) { alert(res.error); }
  }

  if (!me) return <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>sign in to use chats ♡</div>;

  const activeId = active ? (active.kind === "dm" ? active.thread.id : active.group.id) : null;
  const activeTitle = active ? (active.kind === "dm" ? "@" + active.thread.other : "⚇ " + active.group.name) : "";

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* left rail */}
      <div style={{ width: "156px", flex: "0 0 auto", borderRight: "var(--border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "8px", borderBottom: "var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            <input value={newHandle} onChange={(e) => setNewHandle(e.target.value.replace(/^@+/, "").toLowerCase())} placeholder="@handle" style={railInput} onKeyDown={(e) => e.key === "Enter" && startDm()} />
            <button onClick={startDm} style={railBtn} title="start dm">+</button>
          </div>
          <button onClick={() => setCreating((c) => !c)} style={{ ...railBtn, width: "100%", height: "26px", fontSize: "11px" }}>⚇ new group</button>
          {creating && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px", background: "var(--panel-2)", borderRadius: "8px" }}>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="group name" style={railInput} />
              <input value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} placeholder="@a @b @c" style={railInput} />
              <button onClick={makeGroup} style={{ ...railBtn, width: "100%", height: "24px", fontSize: "10px" }}>create</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {knocks.length > 0 && (
            <div style={{ padding: "6px 8px" }}>
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--accent)", marginBottom: "4px" }}>✦ NEW KNOCKS</div>
              {knocks.map((k) => (
                <button key={k.id} onClick={() => { const t = threads.find((x) => x.id === k.thread); if (t) setActive({ kind: "dm", thread: t }); }} style={railRow(false)}>
                  <Av name={k.from} /> <span style={{ fontSize: "11px" }}>@{k.from}</span>
                </button>
              ))}
            </div>
          )}
          {groups.map((g) => (
            <button key={g.id} onClick={() => setActive({ kind: "group", group: g })} style={railRow(activeId === g.id)}>
              <Av name={g.name} group /> <span style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
            </button>
          ))}
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActive({ kind: "dm", thread: t })} style={railRow(activeId === t.id)}>
              <Av name={t.other} /> <span style={{ fontSize: "12px", fontWeight: 600 }}>@{t.other}</span>
            </button>
          ))}
          {threads.length === 0 && groups.length === 0 && knocks.length === 0 && (
            <div style={{ padding: "16px 10px", fontSize: "11px", color: "var(--ink-soft)", textAlign: "center" }}>no chats yet — knock on someone&apos;s page or start one above ♡</div>
          )}
        </div>
      </div>

      {/* conversation */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {active ? (
          <>
            <div style={{ padding: "9px 12px", borderBottom: "var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "14px" }}>{activeTitle}</span>
              {active.kind === "group" && <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>{members.length} members</span>}
            </div>
            <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", minHeight: 0 }}>
              {msgs.length === 0 && <div style={{ textAlign: "center", fontSize: "11px", color: "var(--ink-soft)", marginTop: "20px" }}>say hi ♡</div>}
              {msgs.map((m, i) => {
                const mine = m.sender === me;
                const prev = msgs[i - 1];
                const showAv = !mine && (!prev || prev.sender !== m.sender);
                const img = isImageUrl(m.body);
                return (
                  <div key={m.id} style={{ display: "flex", gap: "7px", alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    {!mine && (showAv ? <Av name={m.sender} /> : <span style={{ width: "24px", flex: "0 0 auto" }} />)}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", maxWidth: "74%" }}>
                      {!mine && active.kind === "group" && showAv && <div style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)", marginLeft: "4px", marginBottom: "2px" }}>@{m.sender}</div>}
                      <div style={{ background: mine ? "var(--accent)" : "var(--panel-2)", color: mine ? "var(--on-accent)" : "var(--ink)", borderRadius: "15px", padding: img ? "5px" : "8px 12px", fontSize: "13px", lineHeight: 1.4, wordBreak: "break-word", ...(mine ? { borderBottomRightRadius: "5px" } : { borderBottomLeftRadius: "5px" }) }}>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.body} alt="attachment" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "10px", display: "block" }} />
                        ) : m.body}
                      </div>
                      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)", marginTop: "2px", padding: "0 3px" }}>{relTime(m.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              {msgs.length > 0 && msgs[msgs.length - 1].sender === me && (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "3px", marginTop: "-4px" }}>
                  <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)" }}>✓ sent</span>
                </div>
              )}
            </div>
            <div style={{ padding: "8px", borderTop: "var(--border)", display: "flex", gap: "6px", alignItems: "center", position: "relative" }}>
              {showEmoji && (
                <div style={{ position: "absolute", left: "8px", right: "8px", bottom: "100%", marginBottom: "8px", background: "var(--panel)", border: "var(--border)", borderRadius: "14px", boxShadow: "0 14px 36px -14px rgba(0,0,0,.55)", padding: "10px", zIndex: 60 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: "2px", maxHeight: "150px", overflowY: "auto" }}>
                    {EMOJIS.map((em, i) => (
                      <button key={i} onClick={() => setText((t) => t + em)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "18px", padding: "3px", borderRadius: "8px", lineHeight: 1 }}>{em}</button>
                    ))}
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
              <button onClick={() => fileRef.current?.click()} title="send an image" style={dmIconBtn}>＋</button>
              <button onClick={() => setShowEmoji((v) => !v)} title="emoji" style={{ ...dmIconBtn, background: showEmoji ? "var(--tab-active)" : "var(--panel)" }}>☺</button>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="message…" style={{ flex: 1, minWidth: 0, border: "var(--border)", borderRadius: "999px", background: "var(--panel-2)", padding: "9px 14px", fontSize: "13px", color: "var(--ink)", outline: "none" }} />
              <button onClick={send} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "999px", padding: "0 16px", height: "38px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "13px", flex: "0 0 auto" }}>send</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", fontSize: "13px" }}>pick a chat ←</div>
        )}
      </div>
    </div>
  );
}

function isImageUrl(s: string): boolean {
  return /^(blob:|data:image)/.test(s) || /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(s);
}
const dmIconBtn: React.CSSProperties = { width: "34px", height: "34px", flex: "0 0 auto", border: "var(--border)", background: "var(--panel)", color: "var(--ink)", borderRadius: "50%", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 };
const railInput: React.CSSProperties = { flex: 1, minWidth: 0, border: "var(--border)", borderRadius: "8px", background: "var(--panel-2)", padding: "6px 8px", fontSize: "11px", color: "var(--ink)", outline: "none" };
const railBtn: React.CSSProperties = { border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "8px", padding: "0 9px", cursor: "pointer", fontSize: "12px", flex: "0 0 auto" };
function railRow(active: boolean): React.CSSProperties {
  return { display: "flex", alignItems: "center", gap: "7px", width: "100%", border: "none", background: active ? "var(--tab-active)" : "transparent", borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent", padding: "8px", cursor: "pointer", color: "var(--ink)", marginBottom: "2px" };
}

function Av({ name, group }: { name: string; group?: boolean }) {
  return <span style={{ width: "24px", height: "24px", flex: "0 0 auto", borderRadius: group ? "8px" : "50%", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "var(--font-display)" }}>{group ? "⚇" : initOf(name)}</span>;
}
