"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ThemeId } from "@/lib/themes";
import { THEMES, THEME_METAS, EDITABLE_VARS, resolveThemeVars, themeSwatches, encodeTheme } from "@/lib/themes";
import type { DesktopApi } from "@/lib/useDesktop";
import { MOODS, FONTS, BADGES } from "@/lib/seed";
import { uploadAsset, renameHandle, adminUpdatePage } from "@/lib/store";
import { getSession, signOut, changePassword } from "@/lib/auth";
import { SectionLabel } from "./shared";

const TOGGLE_DEFS: { key: keyof DesktopApi["state"]["toggles"]; label: string; desc: string }[] = [
  { key: "knock", label: "let strangers knock", desc: "anyone can start a chat from your links" },
  { key: "counter", label: "show visitor counter", desc: "display your visits + knocks publicly" },
  { key: "statusBlink", label: "blink my status light", desc: "pulse the dot next to your mood" },
  { key: "sounds", label: "play cute sounds", desc: "soft chimes on new messages (＾• ω •＾)" },
  { key: "rain", label: "sparkle rain", desc: "let hearts + stars drift down the page" },
];

const BUILT_INS: ThemeId[] = ["sugar", "angel", "kuro", "ostan"];

// Settings — skin picker (built-ins + custom skins), a full skin editor with
// import/export codes, vibe toggles, and mood chips.
export default function SettingsWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importErr, setImportErr] = useState("");
  const [copied, setCopied] = useState(false);

  const activeCustom = state.customThemes.find((c) => c.id === state.theme) || null;

  function doImport() {
    setImportErr("");
    const ok = api.importTheme(importCode);
    if (ok) { setImportCode(""); setImportOpen(false); }
    else setImportErr("that code didn't look right ✦");
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "16px" }}>
      <SectionLabel mt="0 0 11px">✦ SKIN</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px" }}>
        {BUILT_INS.map((id) => (
          <SkinCard
            key={id}
            active={state.theme === id}
            name={THEME_METAS[id].name}
            sub={THEME_METAS[id].sub}
            sw={THEME_METAS[id].sw}
            onClick={() => api.setTheme(id)}
          />
        ))}
        {state.customThemes.map((ct) => (
          <SkinCard
            key={ct.id}
            active={state.theme === ct.id}
            name={ct.name}
            sub={ct.sub}
            sw={themeSwatches(ct.id, state.customThemes)}
            custom
            onClick={() => api.setTheme(ct.id)}
          />
        ))}
        {/* new skin */}
        <button
          onClick={() => api.createCustomTheme(state.theme)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "12px", minHeight: "64px", background: "var(--panel-2)", border: "2px dashed var(--line)", borderRadius: "var(--radius)", cursor: "pointer", color: "var(--ink-soft)" }}
        >
          <span style={{ fontSize: "20px", color: "var(--accent)" }}>＋</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "12.5px", color: "var(--ink)" }}>new skin</span>
        </button>
      </div>

      {/* import */}
      <div style={{ marginTop: "10px" }}>
        {!importOpen ? (
          <button onClick={() => setImportOpen(true)} style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            ⇩ import a skin code
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px", background: "var(--panel-2)", border: "var(--border)", borderRadius: "var(--radius)" }}>
            <textarea
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="paste a KIRARI~ skin code"
              rows={2}
              style={{ width: "100%", border: "var(--border)", borderRadius: "10px", background: "var(--panel)", padding: "8px", fontSize: "11px", color: "var(--ink)", outline: "none", resize: "vertical", fontFamily: "monospace" }}
            />
            {importErr && <span style={{ fontSize: "11px", color: "var(--accent)" }}>{importErr}</span>}
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={doImport} style={btn("var(--accent)", "var(--on-accent)")}>import</button>
              <button onClick={() => { setImportOpen(false); setImportErr(""); }} style={btn("var(--panel)", "var(--ink-soft)", true)}>cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* skin editor (only when a custom skin is active) */}
      {activeCustom && (
        <SkinEditor
          api={api}
          themeId={activeCustom.id}
          onCopy={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}
          copied={copied}
        />
      )}

      {/* fonts (per-element) */}
      <SectionLabel mt="20px 0 8px">✦ FONTS</SectionLabel>
      <FontRow label="display / headings" value={state.fontDisplay || ""} onPick={(v) => api.setFont("display", v)} />
      <FontRow label="body / text" value={state.fontBody || ""} onPick={(v) => api.setFont("body", v)} />

      {/* dashboard wallpaper */}
      <SectionLabel mt="20px 0 8px">✦ DASHBOARD WALLPAPER</SectionLabel>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {(["theme", "color", "image"] as const).map((t) => {
          const on = (state.dashBgType || "theme") === t;
          return (
            <button key={t} onClick={() => api.setDashBg({ type: t })} style={{ flex: 1, padding: "8px", borderRadius: "12px", border: on ? "2px solid var(--accent)" : "var(--border)", background: on ? "var(--tab-active)" : "var(--panel-2)", color: "var(--ink)", cursor: "pointer", fontSize: "12px", fontWeight: on ? 700 : 400 }}>{t}</button>
          );
        })}
      </div>
      {(state.dashBgType || "theme") === "color" && (
        <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((state.dashBgColor || "").trim()) ? state.dashBgColor : "#f3ecff"} onChange={(e) => api.setDashBg({ color: e.target.value })} style={{ width: "30px", height: "30px", border: "var(--border)", borderRadius: "8px", padding: 0, cursor: "pointer", background: "none" }} />
          <span style={{ fontSize: "12.5px" }}>desktop background color</span>
        </label>
      )}
      {state.dashBgType === "image" && (
        <DashImageRow current={state.dashBgUrl} handle={state.profile.handle} onUrl={(u) => api.setDashBg({ url: u })} />
      )}

      <SectionLabel mt="20px 0 8px">✦ YOUR VIBE</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {TOGGLE_DEFS.map((g) => {
          const on = state.toggles[g.key];
          return (
            <div key={g.key} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px 2px", borderBottom: "1px dashed var(--line)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{g.label}</div>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>{g.desc}</div>
              </div>
              <button onClick={() => api.toggle(g.key)} style={{ position: "relative", width: "46px", height: "26px", flex: "0 0 auto", border: "none", cursor: "pointer", borderRadius: "999px", background: on ? "var(--accent)" : "var(--line)", transition: "background .2s" }}>
                <span style={{ position: "absolute", top: "3px", left: on ? "23px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)", transition: "left .2s" }} />
              </button>
            </div>
          );
        })}
      </div>

      {/* status / mood */}
      <SectionLabel mt="20px 0 10px">✦ STATUS</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {MOODS.map((m) => (
          <button key={m} onClick={() => api.setMood(m)} style={{ padding: "7px 12px", fontSize: "12.5px", cursor: "pointer", borderRadius: "999px", border: m === state.mood ? "2px solid var(--accent)" : "var(--border)", background: m === state.mood ? "var(--tab-active)" : "var(--panel-2)", color: m === state.mood ? "var(--accent)" : "var(--ink)", fontWeight: m === state.mood ? 700 : 400 }}>
            {m}
          </button>
        ))}
      </div>

      {/* badges */}
      <SectionLabel mt="20px 0 8px">✦ BADGES</SectionLabel>
      <BadgePicker api={api} />

      {/* account */}
      <SectionLabel mt="20px 0 8px">✦ ACCOUNT</SectionLabel>
      <AccountPanel api={api} />
    </div>
  );
}

// ---- account: display name, handle, password, sign out, admin ----
function AccountPanel({ api }: { api: DesktopApi }) {
  const { state } = api;
  const [session, setSession] = useState<{ handle: string; isAdmin: boolean } | null>(null);
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [handle, setHandleInput] = useState(state.profile.handle);

  useEffect(() => { getSession().then(setSession); }, []);
  useEffect(() => { setHandleInput(state.profile.handle); }, [state.profile.handle]);

  async function doPw() {
    setPwMsg("");
    const r = await changePassword(curPw, newPw);
    setPwMsg(r.ok ? "password changed ✓" : (r.error || "failed"));
    if (r.ok) { setCurPw(""); setNewPw(""); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <FieldRow label="display name">
        <input value={state.profile.name} onChange={(e) => api.setProfileVal("name", e.target.value)} style={acctIn()} placeholder="your name" />
      </FieldRow>
      <FieldRow label="handle (your url)">
        <div style={{ display: "flex", gap: "6px" }}>
          <input value={handle} onChange={(e) => setHandleInput(e.target.value.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase())} style={acctIn()} placeholder="handle" />
          <button onClick={async () => {
            const h = handle.trim();
            if (!h || h === state.profile.handle) return;
            const res = await renameHandle(state.profile.handle, h);
            if (res.ok) { api.setProfileVal("handle", h); alert("✦ handle changed to @" + h + " — your old URL is now free."); }
            else alert(res.error || "couldn't change handle");
          }} style={acctBtn()}>save</button>
        </div>
      </FieldRow>

      <div style={{ borderTop: "1px dashed var(--line)", paddingTop: "10px", marginTop: "2px" }}>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", marginBottom: "7px" }}>CHANGE PASSWORD</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="current password" style={acctIn()} />
          <div style={{ display: "flex", gap: "6px" }}>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="new password" style={acctIn()} />
            <button onClick={doPw} style={acctBtn()}>update</button>
          </div>
          {pwMsg && <span style={{ fontSize: "11px", color: pwMsg.includes("✓") ? "#3bbf86" : "var(--accent)" }}>{pwMsg}</span>}
        </div>
      </div>

      {session?.isAdmin && <AdminPanel />}

      <button
        onClick={async () => { await signOut(); window.location.href = "/"; }}
        style={{ marginTop: "8px", padding: "10px 16px", background: "var(--panel-2)", border: "var(--border)", borderRadius: "var(--radius)", color: "var(--ink-soft)", fontSize: "12.5px", cursor: "pointer" }}
      >
        sign out ↩
      </button>
    </div>
  );
}

// ---- badge picker (self-pick non-admin badges) ----
function BadgePicker({ api }: { api: DesktopApi }) {
  const owned = api.state.profile.badges || [];
  const colors = api.state.profile.badgeColors || {};
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { getSession().then((s) => setIsAdmin(!!s?.isAdmin)); }, []);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
      {BADGES.map((b) => {
        const on = owned.includes(b.id);
        // admin-only badges are locked for normal users, but an admin (e.g. 777)
        // CAN equip them on their own profile.
        const locked = b.admin && !on && !isAdmin;
        const color = colors[b.id] || b.color;
        return (
          <div key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
            <button
              disabled={locked}
              onClick={() => {
                const next = on ? owned.filter((x) => x !== b.id) : [...owned, b.id];
                api.setProfileVal("badges", next);
              }}
              title={locked ? "granted by staff only" : b.label}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, cursor: locked ? "not-allowed" : "pointer", color: on ? "#fff" : "var(--ink)", background: on ? color : "var(--panel-2)", border: on ? "none" : "var(--border)", opacity: locked ? 0.4 : 1 }}
            >
              <span>{b.icon}</span>{b.label}{b.admin && " ★"}
            </button>
            {on && (
              <label title="badge color" style={{ width: "20px", height: "20px", borderRadius: "6px", overflow: "hidden", border: "var(--border)", cursor: "pointer", flex: "0 0 auto", background: color }}>
                <input
                  type="color"
                  value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : b.color}
                  onChange={(e) => api.setProfileVal("badgeColors", { ...colors, [b.id]: e.target.value })}
                  style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- admin panel (@x only): grant/revoke any badge to any handle ----
function AdminPanel() {
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  async function apply(badgeId: string, grant: boolean) {
    const h = target.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
    if (!h) { setMsg("enter a handle"); return; }
    setWorking(true); setMsg("");
    const res = await adminUpdatePage(h, (page) => {
      const badges = new Set(page.profile.badges || []);
      if (grant) badges.add(badgeId); else badges.delete(badgeId);
      return { ...page, profile: { ...page.profile, badges: Array.from(badges) } };
    });
    setMsg(res.ok ? `${grant ? "granted" : "revoked"} ${badgeId} ${grant ? "to" : "from"} @${h} ✓` : (res.error || "failed"));
    setWorking(false);
  }

  return (
    <div style={{ marginTop: "10px", padding: "12px", borderRadius: "var(--radius)", background: "var(--panel-2)", border: "2px solid var(--accent)" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", marginBottom: "8px" }}>★ admin panel</div>
      <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target handle (e.g. nex)" style={{ ...acctIn(), marginBottom: "8px" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
        {BADGES.filter((b) => b.admin).map((b) => (
          <div key={b.id} style={{ display: "flex", gap: "3px" }}>
            <button disabled={working} onClick={() => apply(b.id, true)} style={{ padding: "5px 9px", borderRadius: "8px", border: "none", background: b.color, color: "#fff", fontSize: "10.5px", fontWeight: 700, cursor: "pointer" }}>+{b.label}</button>
            <button disabled={working} onClick={() => apply(b.id, false)} title="revoke" style={{ padding: "5px 7px", borderRadius: "8px", border: "var(--border)", background: "var(--panel)", color: "var(--ink-soft)", fontSize: "10.5px", cursor: "pointer" }}>−</button>
          </div>
        ))}
      </div>
      {msg && <div style={{ fontSize: "11px", marginTop: "8px", color: msg.includes("✓") ? "#3bbf86" : "var(--accent)" }}>{msg}</div>}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", marginBottom: "4px" }}>{label.toUpperCase()}</span>
      {children}
    </label>
  );
}
function acctIn(): CSSProperties {
  return { flex: 1, width: "100%", border: "var(--border)", borderRadius: "10px", background: "var(--panel)", padding: "8px 11px", fontSize: "12.5px", color: "var(--ink)", outline: "none" };
}
function acctBtn(): CSSProperties {
  return { border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "10px", padding: "0 14px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "12.5px", flex: "0 0 auto" };
}

function SkinCard({ active, name, sub, sw, custom, onClick }: { active: boolean; name: string; sub: string; sw: [string, string, string]; custom?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "var(--panel-2)", border: active ? "2px solid var(--accent)" : "var(--border)", borderRadius: "var(--radius)", cursor: "pointer", color: "var(--ink)", boxShadow: active ? "var(--btn-shadow)" : "none", position: "relative" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {sw.map((c, i) => (
          <span key={i} style={{ width: "14px", height: "14px", borderRadius: "50%", background: c, border: "2px solid rgba(255,255,255,.75)", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
        ))}
      </div>
      <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>{custom ? "★ " + sub : sub}</div>
      </div>
      {active && <span style={{ color: "var(--accent)", fontSize: "15px" }}>✓</span>}
    </button>
  );
}

function SkinEditor({ api, themeId, onCopy, copied }: { api: DesktopApi; themeId: string; onCopy: () => void; copied: boolean }) {
  const { state } = api;
  const ct = state.customThemes.find((c) => c.id === themeId)!;
  const vars = resolveThemeVars(themeId, state.customThemes);

  function setVar(key: string, value: string) {
    api.updateCustomTheme(themeId, { vars: { [key]: value } });
  }

  return (
    <div style={{ marginTop: "16px", padding: "14px", background: "var(--panel-2)", border: "var(--border)", borderRadius: "var(--radius)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", letterSpacing: "1px", color: "var(--ink-soft)" }}>✎ EDITING SKIN</span>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }} />
        <button onClick={() => api.deleteCustomTheme(themeId)} title="delete skin" style={{ border: "none", background: "transparent", color: "var(--ink-soft)", cursor: "pointer", fontSize: "12px" }}>🗑 delete</button>
      </div>

      {/* name + sub */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <input value={ct.name} onChange={(e) => api.updateCustomTheme(themeId, { name: e.target.value })} placeholder="skin name" style={editIn()} />
        <input value={ct.sub} onChange={(e) => api.updateCustomTheme(themeId, { sub: e.target.value })} placeholder="tagline" style={editIn()} />
      </div>

      {/* editable vars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        {EDITABLE_VARS.map((ev) => {
          const val = vars[ev.key] || "";
          if (ev.kind === "color") {
            const isPlain = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val.trim());
            return (
              <label key={ev.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="color"
                  value={isPlain ? val.trim() : "#ffffff"}
                  onChange={(e) => setVar(ev.key, e.target.value)}
                  style={{ width: "26px", height: "26px", padding: 0, border: "var(--border)", borderRadius: "8px", background: "none", cursor: "pointer", flex: "0 0 auto" }}
                />
                <span style={{ fontSize: "11.5px", color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.label}</span>
              </label>
            );
          }
          return (
            <label key={ev.key} style={{ display: "flex", flexDirection: "column", gap: "3px", gridColumn: "1 / -1" }}>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--ink-soft)" }}>{ev.label.toUpperCase()}</span>
              <input value={val} onChange={(e) => setVar(ev.key, e.target.value)} style={{ ...editIn(), fontFamily: "monospace", fontSize: "11px" }} />
            </label>
          );
        })}
      </div>

      {/* export */}
      <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => {
            const code = encodeTheme(ct);
            if (navigator.clipboard) navigator.clipboard.writeText(code).then(onCopy, onCopy);
            else onCopy();
          }}
          style={btn("var(--accent)", "var(--on-accent)")}
        >
          {copied ? "copied ✓" : "⧉ copy share code"}
        </button>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)", flex: 1 }}>
          share this code so friends can use your skin
        </span>
      </div>
    </div>
  );
}

function editIn(): CSSProperties {
  return { flex: 1, minWidth: 0, width: "100%", border: "var(--border)", borderRadius: "10px", background: "var(--panel)", padding: "7px 10px", fontSize: "12.5px", color: "var(--ink)", outline: "none" };
}
function btn(bg: string, fg: string, outline?: boolean): CSSProperties {
  return { border: outline ? "var(--border)" : "none", background: bg, color: fg, fontFamily: "var(--font-display)", fontSize: "12.5px", padding: "8px 14px", borderRadius: "10px", cursor: "pointer" };
}

// Font picker row — choose a font for display or body. "" = theme default.
function FontRow({ label, value, onPick }: { label: string; value: string; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
      <span style={{ flex: "0 0 96px", fontSize: "12px", color: "var(--ink-soft)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onPick(e.target.value)}
        style={{ flex: 1, border: "var(--border)", borderRadius: "10px", background: "var(--panel-2)", padding: "8px 10px", fontSize: "12.5px", color: "var(--ink)", outline: "none", cursor: "pointer", fontFamily: value || "inherit" }}
      >
        {FONTS.map((f) => (
          <option key={f.id} value={f.value}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}

// Dashboard wallpaper image uploader.
function DashImageRow({ current, handle, onUrl }: { current?: string; handle: string; onUrl: (u: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(f: File) {
    setBusy(true);
    try { const res = await uploadAsset(f, "bg", handle || "me"); onUrl(res.url); if (res.temporary) alert("⚠ media storage isn't connected — this wallpaper only shows in your browser this session."); }
    catch (e) { alert(e instanceof Error ? e.message : "upload failed"); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)" }}>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
        <span style={{ width: "34px", height: "34px", flex: "0 0 auto", borderRadius: "8px", background: current ? `center/cover url(${current})` : "var(--panel-2)", border: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", color: "var(--ink-soft)" }}>{current ? "" : "🖼"}</span>
        <button onClick={() => ref.current?.click()} disabled={busy} style={{ flex: 1, textAlign: "left", border: "none", background: "transparent", cursor: busy ? "wait" : "pointer", fontSize: "12.5px", color: "var(--ink)", fontWeight: 600 }}>{busy ? "uploading…" : current ? "replace ✦" : "upload desktop wallpaper"}</button>
        {current && !busy && <button onClick={() => onUrl("")} title="remove" style={{ border: "var(--border)", background: "var(--panel-2)", borderRadius: "6px", width: "24px", height: "24px", cursor: "pointer", color: "var(--ink-soft)", fontSize: "11px" }}>✕</button>}
      </div>
    </div>
  );
}
