"use client";

import { useEffect, useRef, useState } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { getSession } from "@/lib/auth";
import { listThreads, loadMessages, sendMessage, loadKnocks, markKnocksRead, knock, type DMThread, type DMMessage } from "@/lib/chat";
import { initOf } from "@/lib/styleHelpers";

// Real cross-account DMs. Lists your threads + incoming knocks on the left,
// the open conversation on the right. Polls every few seconds for new messages
// (near-real-time without a socket).
export default function DMsWindow(_props: { api: DesktopApi }) {
  const [me, setMe] = useState<string>("");
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [knocks, setKnocks] = useState<{ id: string; from: string; thread: string }[]>([]);
  const [active, setActive] = useState<DMThread | null>(null);
  const [msgs, setMsgs] = useState<DMMessage[]>([]);
  const [text, setText] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  // identify me
  useEffect(() => { getSession().then((s) => setMe(s?.handle || "")); }, []);

  // load threads + knocks, poll
  useEffect(() => {
    if (!me) return;
    let alive = true;
    const refresh = async () => {
      const [t, k] = await Promise.all([listThreads(me), loadKnocks(me)]);
      if (!alive) return;
      setThreads(t); setKnocks(k);
    };
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [me]);

  // load + poll the active thread's messages
  useEffect(() => {
    if (!active) { setMsgs([]); return; }
    markKnocksRead(me, active.id).then(() => setKnocks((k) => k.filter((x) => x.thread !== active.id)));
    let alive = true;
    const refresh = async () => {
      const m = await loadMessages(active.id);
      if (alive) setMsgs(m);
    };
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [active]);

  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [msgs]);

  async function send() {
    if (!active || !text.trim()) return;
    const body = text.trim();
    setText("");
    const m = await sendMessage(active.id, me, body);
    if (m) setMsgs((prev) => [...prev, m]);
  }

  async function startNew() {
    const to = newHandle.trim();
    if (!to || !me) return;
    const res = await knock(me, to);
    setNewHandle("");
    if (res.ok) {
      const t = await listThreads(me);
      setThreads(t);
      const opened = t.find((x) => x.other === to.replace(/^@+/, "").toLowerCase());
      if (opened) setActive(opened);
    }
  }

  if (!me) {
    return <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>sign in to use chats ♡</div>;
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* left: threads + knocks + new */}
      <div style={{ width: "150px", flex: "0 0 auto", borderRight: "var(--border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "8px", borderBottom: "var(--border)" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            <input value={newHandle} onChange={(e) => setNewHandle(e.target.value.replace(/^@+/, "").toLowerCase())} placeholder="@handle" style={{ flex: 1, minWidth: 0, border: "var(--border)", borderRadius: "8px", background: "var(--panel-2)", padding: "6px 8px", fontSize: "11px", color: "var(--ink)", outline: "none" }} onKeyDown={(e) => e.key === "Enter" && startNew()} />
            <button onClick={startNew} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "8px", padding: "0 9px", cursor: "pointer", fontSize: "13px" }}>+</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {knocks.length > 0 && (
            <div style={{ padding: "6px 8px" }}>
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--accent)", marginBottom: "4px" }}>✦ NEW KNOCKS</div>
              {knocks.map((k) => (
                <button key={k.id} onClick={() => { const t = threads.find((x) => x.id === k.thread); if (t) setActive(t); }} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", border: "none", background: "var(--tab-active)", borderRadius: "8px", padding: "6px", cursor: "pointer", marginBottom: "3px", color: "var(--ink)" }}>
                  <Av name={k.from} /> <span style={{ fontSize: "11px" }}>@{k.from}</span>
                </button>
              ))}
            </div>
          )}
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", border: "none", background: active?.id === t.id ? "var(--tab-active)" : "transparent", borderLeft: active?.id === t.id ? "3px solid var(--accent)" : "3px solid transparent", padding: "8px", cursor: "pointer", color: "var(--ink)" }}>
              <Av name={t.other} /> <span style={{ fontSize: "12px", fontWeight: 600 }}>@{t.other}</span>
            </button>
          ))}
          {threads.length === 0 && knocks.length === 0 && (
            <div style={{ padding: "16px 10px", fontSize: "11px", color: "var(--ink-soft)", textAlign: "center" }}>no chats yet — knock on someone&apos;s page, or start one above ♡</div>
          )}
        </div>
      </div>

      {/* right: conversation */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {active ? (
          <>
            <div style={{ padding: "9px 12px", borderBottom: "var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Av name={active.other} /> <span style={{ fontFamily: "var(--font-display)", fontSize: "14px" }}>@{active.other}</span>
            </div>
            <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "7px", minHeight: 0 }}>
              {msgs.length === 0 && <div style={{ textAlign: "center", fontSize: "11px", color: "var(--ink-soft)", marginTop: "20px" }}>say hi ♡</div>}
              {msgs.map((m) => {
                const mine = m.sender === me;
                return (
                  <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "75%", background: mine ? "var(--accent)" : "var(--panel-2)", color: mine ? "var(--on-accent)" : "var(--ink)", borderRadius: "14px", padding: "8px 12px", fontSize: "13px", lineHeight: 1.4 }}>
                    {m.body}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "8px", borderTop: "var(--border)", display: "flex", gap: "6px" }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="message…" style={{ flex: 1, border: "var(--border)", borderRadius: "999px", background: "var(--panel-2)", padding: "9px 14px", fontSize: "13px", color: "var(--ink)", outline: "none" }} />
              <button onClick={send} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "999px", padding: "0 16px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "13px" }}>send</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", fontSize: "13px" }}>pick a chat ←</div>
        )}
      </div>
    </div>
  );
}

function Av({ name }: { name: string }) {
  return <span style={{ width: "24px", height: "24px", flex: "0 0 auto", borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "var(--font-display)" }}>{initOf(name)}</span>;
}
