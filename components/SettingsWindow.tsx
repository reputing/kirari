"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { ThemeId } from "@/lib/themes";
import { THEMES, THEME_METAS, EDITABLE_VARS, resolveThemeVars, themeSwatches, encodeTheme } from "@/lib/themes";
import type { DesktopApi } from "@/lib/useDesktop";
import { MOODS } from "@/lib/seed";
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

      {/* vibe toggles */}
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

      <button onClick={() => api.openOnb()} style={{ marginTop: "20px", padding: "10px 16px", background: "var(--panel-2)", border: "var(--border)", borderRadius: "var(--radius)", color: "var(--ink-soft)", fontSize: "12.5px", cursor: "pointer" }}>
        sign out · switch page ↩
      </button>
    </div>
  );
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
