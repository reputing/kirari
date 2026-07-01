"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { listPages, loadStats, loadPresence, adminDeletePage, adminUpdatePage, relTime, ONLINE_WINDOW_MS, type PublishedPage } from "@/lib/store";
import {
  listBanned, setBanned, listMods, setMod, signupsLocked, setSignupsLocked, canModerate,
} from "@/lib/auth";
import { listInvites, createInvites, revokeInvite, INVITE_PRICE_USD, type Invite } from "@/lib/invites";
import { BADGES } from "@/lib/seed";
import { inputStyle, SectionLabel } from "./shared";

// ============================================================================
// AdminWindow — the @777 control room. Admins get everything; mods get the
// account + invite + ban tools (no appointing other mods, no lockdown).
// Everything runs against the same store the rest of the app uses, so it works
// locally today and against Supabase the moment it's wired.
// ============================================================================

type Tab = "accounts" | "invites" | "safety";

interface Row {
  page: PublishedPage;
  views: number;
  lastSeen: number;
  ip?: string;
}

export default function AdminWindow({ api }: { api: DesktopApi }) {
  const isAdmin = api.session?.role === "admin";
  const canMod = canModerate(api.session);
  const [tab, setTab] = useState<Tab>("accounts");

  if (!canMod) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--ink-soft)", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "26px" }}>⚿</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--ink)" }}>staff only</div>
        <div style={{ fontSize: "12.5px" }}>this room is for admins and mods.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--panel)" }}>
      <div style={{ display: "flex", gap: "4px", padding: "10px 12px 0", flex: "0 0 auto" }}>
        {(["accounts", "invites", "safety"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
            {t === "accounts" ? "◈ accounts" : t === "invites" ? "✦ invites" : "⚠ safety"}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ alignSelf: "center", fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)", paddingRight: "4px" }}>
          {isAdmin ? "admin" : "mod"} · @{api.session?.handle}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 14px 18px" }}>
        {tab === "accounts" && <Accounts />}
        {tab === "invites" && <Invites by={api.session?.handle || "admin"} />}
        {tab === "safety" && <Safety isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- accounts
function Accounts() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [banned, setBannedList] = useState<string[]>([]);

  const load = useCallback(async () => {
    setBannedList(listBanned());
    const pages = await listPages(300);
    const withStats = await Promise.all(pages.map(async (p) => {
      const [st, seen] = await Promise.all([loadStats(p.handle), loadPresence(p.handle)]);
      return { page: p, views: st.views || p.profile.counters?.views || 0, lastSeen: seen } as Row;
    }));
    withStats.sort((a, b) => (a.page.profile.uid ?? 1e9) - (b.page.profile.uid ?? 1e9));
    setRows(withStats);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(handle: string) {
    if (!confirm(`Delete @${handle}? This wipes their page and guestbook. This can't be undone.`)) return;
    setBusy(handle);
    await adminDeletePage(handle);
    setBusy(null);
    load();
  }
  function toggleBan(handle: string) {
    const on = !banned.includes(handle);
    setBanned(handle, on);
    setBannedList(listBanned());
  }
  async function grantBadge(handle: string, badgeId: string) {
    await adminUpdatePage(handle, (p) => {
      const cur = new Set(p.profile.badges || []);
      if (cur.has(badgeId)) cur.delete(badgeId); else cur.add(badgeId);
      return { ...p, profile: { ...p.profile, badges: Array.from(cur) } };
    });
    load();
  }

  if (!rows) return <Loading />;
  const filtered = rows.filter((r) => {
    const s = (r.page.handle + " " + (r.page.profile.name || "")).toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search handle or name…" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={load} style={ghostBtn}>↻ refresh</button>
      </div>
      <SectionLabel>{`${filtered.length} accounts`}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map((r) => {
          const P = r.page.profile;
          const online = r.lastSeen > 0 && Date.now() - r.lastSeen < ONLINE_WINDOW_MS;
          const isBan = banned.includes(r.page.handle);
          return (
            <div key={r.page.handle} style={{ border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)", borderRadius: "13px", padding: "11px 12px", background: isBan ? "color-mix(in srgb, #e0484d 10%, var(--panel-2))" : "var(--panel-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: "34px", height: "34px", flex: "0 0 auto", borderRadius: P.pfpShape === "circle" ? "50%" : "10px", background: P.pfpUrl ? `center/cover url(${P.pfpUrl})` : "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "14px" }}>
                  {P.pfpUrl ? "" : (P.name || r.page.handle).slice(0, 1).toUpperCase()}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{P.name || r.page.handle}</span>
                    {P.uid != null && <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>#{P.uid}</span>}
                    {isBan && <span style={pill("#e0484d")}>banned</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>@{r.page.handle}{P.domain ? " · " + P.domain : ""}</div>
                </div>
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: online ? "#3bbf86" : "var(--ink-soft)" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: online ? "#5ed29a" : "#8b909c" }} />
                    {online ? "online" : r.lastSeen ? relTime(r.lastSeen) : "—"}
                  </div>
                  <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)", marginTop: "2px" }}>{Number(r.views).toLocaleString()} views</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "9px", alignItems: "center" }}>
                <a href={"/" + r.page.handle} target="_blank" rel="noreferrer" style={miniBtn}>view page</a>
                <button onClick={() => toggleBan(r.page.handle)} style={{ ...miniBtn, color: isBan ? "#3bbf86" : "#e0484d" }}>{isBan ? "unban" : "ban"}</button>
                <button onClick={() => del(r.page.handle)} disabled={busy === r.page.handle} style={{ ...miniBtn, color: "#e0484d", opacity: busy === r.page.handle ? 0.5 : 1 }}>delete</button>
                <span style={{ flex: 1 }} />
                <BadgeGranter current={P.badges || []} onToggle={(b) => grantBadge(r.page.handle, b)} />
              </div>
            </div>
          );
        })}
        {!filtered.length && <Empty>no accounts match.</Empty>}
      </div>
      <p style={{ fontSize: "10.5px", color: "var(--ink-soft)", marginTop: "12px", lineHeight: 1.5 }}>
        IP addresses appear here once server-side capture is enabled in Supabase (an edge function writes the visitor IP to page_stats). Until then this shows last-seen presence.
      </p>
    </div>
  );
}

function BadgeGranter({ current, onToggle }: { current: string[]; onToggle: (b: string) => void }) {
  const [open, setOpen] = useState(false);
  const admins = BADGES.filter((b) => b.admin);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={miniBtn}>badges ▾</button>
      {open && (
        <div style={{ position: "absolute", right: 0, bottom: "100%", marginBottom: "6px", background: "var(--panel)", border: "1px solid color-mix(in srgb, var(--ink) 16%, transparent)", borderRadius: "11px", boxShadow: "0 16px 40px -18px rgba(0,0,0,.5)", padding: "8px", width: "168px", zIndex: 5 }}>
          {admins.map((b) => {
            const on = current.includes(b.id);
            return (
              <button key={b.id} onClick={() => onToggle(b.id)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "6px 8px", borderRadius: "8px", border: "none", cursor: "pointer", background: on ? "var(--tab-active)" : "transparent", color: "var(--ink)", fontSize: "12px", textAlign: "left" }}>
                <span style={{ color: b.color }}>{b.icon}</span>{b.label}{on ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- invites
function Invites({ by }: { by: string }) {
  const [list, setList] = useState<Invite[] | null>(null);
  const [n, setN] = useState(5);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { listInvites().then(setList); }, []);
  useEffect(() => { load(); }, [load]);

  async function mint() {
    setBusy(true);
    await createInvites(by, n);
    setBusy(false);
    load();
  }
  async function revoke(code: string) {
    await revokeInvite(code);
    load();
  }
  function copy(code: string) { try { navigator.clipboard?.writeText(code); } catch { /* */ } }

  if (!list) return <Loading />;
  const unused = list.filter((i) => !i.usedBy);
  const used = list.filter((i) => i.usedBy);

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
        <input type="number" min={1} max={50} value={n} onChange={(e) => setN(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} style={{ ...inputStyle, width: "72px" }} />
        <button onClick={mint} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>{busy ? "minting…" : "mint codes"}</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>{unused.length} live · {used.length} used</span>
      </div>

      <SectionLabel>live codes</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        {unused.map((i) => (
          <div key={i.code} style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)", borderRadius: "10px", padding: "8px 11px", background: "var(--panel-2)" }}>
            <code style={{ fontFamily: "var(--font-pixel)", fontSize: "13px", color: "var(--accent)", letterSpacing: "0.5px" }}>{i.code}</code>
            {i.paid && <span style={pill("#e7b24a")}>paid ${INVITE_PRICE_USD}</span>}
            <span style={{ flex: 1 }} />
            <button onClick={() => copy(i.code)} style={miniBtn}>copy</button>
            <button onClick={() => revoke(i.code)} style={{ ...miniBtn, color: "#e0484d" }}>revoke</button>
          </div>
        ))}
        {!unused.length && <Empty>no live codes — mint some.</Empty>}
      </div>

      <SectionLabel>redeemed</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {used.slice(0, 40).map((i) => (
          <div key={i.code} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ink-soft)", padding: "5px 4px" }}>
            <code style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", opacity: 0.7, textDecoration: "line-through" }}>{i.code}</code>
            <span style={{ flex: 1 }} />
            <span>@{i.usedBy} · {i.usedAt ? relTime(i.usedAt) : ""}</span>
          </div>
        ))}
        {!used.length && <Empty>none redeemed yet.</Empty>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ safety
function Safety({ isAdmin }: { isAdmin: boolean }) {
  const [locked, setLocked] = useState(false);
  const [banned, setBannedList] = useState<string[]>([]);
  const [mods, setModsList] = useState<string[]>([]);
  const [banInput, setBanInput] = useState("");
  const [modInput, setModInput] = useState("");
  useEffect(() => { setLocked(signupsLocked()); setBannedList(listBanned()); setModsList(listMods()); }, []);

  function toggleLock() { const v = !locked; setSignupsLocked(v); setLocked(v); }
  function addBan() { const h = banInput.replace(/^@+/, "").toLowerCase().trim(); if (!h) return; setBanned(h, true); setBannedList(listBanned()); setBanInput(""); }
  function unban(h: string) { setBanned(h, false); setBannedList(listBanned()); }
  function addMod() { const h = modInput.replace(/^@+/, "").toLowerCase().trim(); if (!h) return; setMod(h, true); setModsList(listMods()); setModInput(""); }
  function unmod(h: string) { setMod(h, false); setModsList(listMods()); }

  return (
    <div>
      <SectionLabel>raid protection</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)", borderRadius: "13px", padding: "12px 14px", background: locked ? "color-mix(in srgb, #e0484d 12%, var(--panel-2))" : "var(--panel-2)", marginBottom: "18px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "var(--ink)" }}>pause all signups</div>
          <div style={{ fontSize: "11.5px", color: "var(--ink-soft)", marginTop: "2px" }}>emergency switch during a raid. admins can still create accounts.</div>
        </div>
        <button onClick={toggleLock} disabled={!isAdmin} title={isAdmin ? "" : "admins only"} style={{ ...toggle(locked), opacity: isAdmin ? 1 : 0.5 }}>
          <span style={knob(locked)} />
        </button>
      </div>

      <SectionLabel>banned handles</SectionLabel>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input value={banInput} onChange={(e) => setBanInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBan()} placeholder="handle to ban" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={addBan} style={{ ...primaryBtn, background: "#e0484d" }}>ban</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
        {banned.map((h) => (
          <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "color-mix(in srgb, #e0484d 14%, var(--panel-2))", border: "1px solid color-mix(in srgb, #e0484d 40%, transparent)", borderRadius: "999px", padding: "4px 6px 4px 11px", fontSize: "12px", color: "var(--ink)" }}>
            @{h}<button onClick={() => unban(h)} title="unban" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-soft)", fontSize: "12px" }}>✕</button>
          </span>
        ))}
        {!banned.length && <Empty>no one is banned.</Empty>}
      </div>

      {isAdmin && (
        <>
          <SectionLabel>moderators</SectionLabel>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <input value={modInput} onChange={(e) => setModInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMod()} placeholder="handle to make a mod" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addMod} style={primaryBtn}>add mod</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {mods.map((h) => (
              <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--panel-2)", border: "1px solid color-mix(in srgb, var(--ink) 16%, transparent)", borderRadius: "999px", padding: "4px 6px 4px 11px", fontSize: "12px", color: "var(--ink)" }}>
                @{h}<button onClick={() => unmod(h)} title="remove mod" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-soft)", fontSize: "12px" }}>✕</button>
              </span>
            ))}
            {!mods.length && <Empty>no mods appointed.</Empty>}
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ atoms
function Loading() { return <div style={{ color: "var(--ink-soft)", fontSize: "12.5px", padding: "20px 4px" }}>loading…</div>; }
function Empty({ children }: { children: string }) { return <div style={{ color: "var(--ink-soft)", fontSize: "12px", padding: "8px 2px" }}>{children}</div>; }
function pill(c: string): CSSProperties { return { fontFamily: "var(--font-pixel)", fontSize: "8px", color: "#fff", background: c, borderRadius: "999px", padding: "2px 7px" }; }
function tabBtn(on: boolean): CSSProperties {
  return { padding: "8px 13px", border: "none", borderRadius: "10px 10px 0 0", cursor: "pointer", background: on ? "var(--panel-2)" : "transparent", color: on ? "var(--ink)" : "var(--ink-soft)", fontFamily: "var(--font-display)", fontSize: "12.5px", fontWeight: on ? 700 : 400 };
}
const ghostBtn: CSSProperties = { border: "1px solid color-mix(in srgb, var(--ink) 16%, transparent)", background: "transparent", color: "var(--ink)", borderRadius: "10px", padding: "9px 12px", fontSize: "12px", cursor: "pointer", flex: "0 0 auto" };
const primaryBtn: CSSProperties = { border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "10px", padding: "10px 14px", fontFamily: "var(--font-display)", fontSize: "12.5px", cursor: "pointer", flex: "0 0 auto" };
const miniBtn: CSSProperties = { border: "1px solid color-mix(in srgb, var(--ink) 14%, transparent)", background: "var(--panel)", color: "var(--ink)", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", textDecoration: "none", display: "inline-block" };
function toggle(on: boolean): CSSProperties { return { width: "44px", height: "25px", borderRadius: "999px", border: "none", cursor: "pointer", background: on ? "#e0484d" : "color-mix(in srgb, var(--ink) 22%, transparent)", position: "relative", flex: "0 0 auto", transition: "background .15s ease" }; }
function knob(on: boolean): CSSProperties { return { position: "absolute", top: "3px", left: on ? "22px" : "3px", width: "19px", height: "19px", borderRadius: "50%", background: "#fff", transition: "left .15s ease", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }; }
