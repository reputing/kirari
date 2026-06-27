"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { TextFx, BgPattern, PfpShape } from "@/lib/types";
import { nameStyleFor, bgFor } from "@/lib/styleHelpers";
import { inputStyle, SectionLabel } from "./shared";
import { Icon, IconPicker } from "./Icon";
import { uploadAsset } from "@/lib/store";

const BGS: [BgPattern, string][] = [
  ["none", "plain"],
  ["dots", "dots"],
  ["grid", "grid"],
  ["gingham", "gingham"],
  ["stripes", "stripes"],
  ["hearts", "hearts"],
];
const FXS: [TextFx, string][] = [
  ["none", "plain"],
  ["glow", "glow"],
  ["rainbow", "rainbow"],
  ["sticker", "sticker"],
  ["retro3d", "retro 3d"],
];
const PCOLORS = ["var(--accent)", "#ffd36e", "#7be0c0", "#7cc0ff", "#c79bff"];
const DECOS: [string, string][] = [
  ["♡", "♡"],
  ["★", "★"],
  ["✿", "✿"],
  ["none", "—"],
];
const SHAPES: [PfpShape, string][] = [
  ["rounded", "▢"],
  ["circle", "◯"],
];

// Edit window — full personalization surface: page background, portrait frame
// (shape / color / charm), name effect with live preview, about-you fields, and
// a reorderable links list. "Save" opens/focuses the profile window.
export default function EditWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const P = state.profile;
  const hasDeco = P.deco !== "none" && !!P.deco;
  const [iconPickerFor, setIconPickerFor] = useState<string | null>(null);

  const pfpPreview: CSSProperties = {
    position: "relative",
    width: "64px",
    height: "64px",
    flex: "0 0 auto",
    borderRadius: P.pfpShape === "circle" ? "50%" : "16px",
    border: "3px solid " + P.pfpColor,
    background:
      "repeating-linear-gradient(45deg,var(--panel-2),var(--panel-2) 6px,var(--line) 6px,var(--line) 12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "16px" }}>
      {/* page background */}
      <SectionLabel>✦ PAGE BACKGROUND</SectionLabel>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {BGS.map(([id, label]) => (
          <button
            key={id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "6px",
              background: "transparent",
              border: P.bg === id ? "2px solid var(--accent)" : "var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              color: "var(--ink-soft)",
            }}
            onClick={() => api.setProfileVal("bg", id)}
            title={label}
          >
            <span style={{ width: "42px", height: "30px", borderRadius: "6px", display: "block", ...bgFor(id) }}></span>
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* page style: background type + media + card style */}
      <SectionLabel>✦ PAGE STYLE (public)</SectionLabel>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
        {(["pattern", "color", "image", "video"] as const).map((t) => {
          const on = (P.pageBgType || "pattern") === t;
          return (
            <button
              key={t}
              onClick={() => api.setProfileVal("pageBgType", t)}
              style={{ flex: 1, minWidth: "64px", padding: "8px 6px", borderRadius: "12px", border: on ? "2px solid var(--accent)" : "var(--border)", background: on ? "var(--tab-active)" : "var(--panel-2)", color: "var(--ink)", cursor: "pointer", fontSize: "12px", fontWeight: on ? 700 : 400 }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {(P.pageBgType || "pattern") === "color" && (
        <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((P.pageBgColor || "").trim()) ? P.pageBgColor : "#ffe6f3"} onChange={(e) => api.setProfileVal("pageBgColor", e.target.value)} style={{ width: "30px", height: "30px", border: "var(--border)", borderRadius: "8px", padding: 0, cursor: "pointer", background: "none" }} />
          <span style={{ fontSize: "12.5px" }}>solid background color</span>
        </label>
      )}

      {((P.pageBgType === "image") || (P.pageBgType === "video")) && (
        <div style={{ marginBottom: "10px" }}>
          <FileRow
            label={P.pageBgType === "video" ? "upload background video" : "upload background image"}
            accept={P.pageBgType === "video" ? "video/*" : "image/*"}
            current={P.pageBgUrl}
            kind="bg"
            handle={P.handle}
            onFile={(url) => api.setProfileVal("pageBgUrl", url)}
            onClear={() => api.setProfileVal("pageBgUrl", undefined)}
          />
          <input
            value={P.pageBgUrl && P.pageBgUrl.startsWith("blob:") ? "" : (P.pageBgUrl || "")}
            onChange={(e) => api.setProfileVal("pageBgUrl", e.target.value || undefined)}
            placeholder="…or paste a URL"
            style={{ ...inputStyle, marginTop: "6px", fontSize: "12px" }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <MiniToggle label="translucent card" on={!!P.translucent} disabled={!!P.cardless} onClick={() => api.setProfileVal("translucent", !P.translucent)} />
        <MiniToggle label="no card (bare)" on={!!P.cardless} onClick={() => api.setProfileVal("cardless", !P.cardless)} />
      </div>

      {/* avatar + audio uploads */}
      <SectionLabel>✦ AVATAR &amp; AUDIO</SectionLabel>
      <div style={{ marginBottom: "8px" }}>
        <FileRow label="upload avatar image" accept="image/*" current={P.pfpUrl} kind="avatar" handle={P.handle} onFile={(url) => api.setProfileVal("pfpUrl", url)} onClear={() => api.setProfileVal("pfpUrl", undefined)} round />
      </div>
      <div style={{ marginBottom: "8px" }}>
        <FileRow label="upload page audio (plays on visit)" accept="audio/*" current={P.audioUrl} kind="audio" handle={P.handle} isAudio onFile={(url) => api.setProfileVal("audioUrl", url)} onClear={() => api.setProfileVal("audioUrl", undefined)} />
      </div>
      <input
        value={P.audioTitle || ""}
        onChange={(e) => api.setProfileVal("audioTitle", e.target.value)}
        placeholder="track title (shown in the player)"
        style={{ ...inputStyle, marginBottom: "16px", fontSize: "12.5px" }}
      />

      {/* portrait */}
      <SectionLabel>✦ PORTRAIT</SectionLabel>
      <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={pfpPreview}>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "8px",
              color: "var(--ink-soft)",
              background: "var(--panel)",
              padding: "2px 4px",
              borderRadius: "5px",
            }}
          >
            pfp
          </span>
          {hasDeco && (
            <span
              style={{
                position: "absolute",
                right: "-8px",
                top: "-8px",
                fontSize: "18px",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))",
              }}
            >
              {P.deco}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ControlRow label="shape">
            {SHAPES.map(([id, label]) => (
              <button
                key={id}
                style={{
                  width: "30px",
                  height: "28px",
                  cursor: "pointer",
                  borderRadius: "7px",
                  border: P.pfpShape === id ? "2px solid var(--accent)" : "var(--border)",
                  background: P.pfpShape === id ? "var(--tab-active)" : "var(--panel)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
                onClick={() => api.setProfileVal("pfpShape", id)}
              >
                {label}
              </button>
            ))}
          </ControlRow>
          <ControlRow label="frame">
            {PCOLORS.map((c) => (
              <button
                key={c}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  background: c,
                  border: P.pfpColor === c ? "2.5px solid var(--ink)" : "2px solid #fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                }}
                onClick={() => api.setProfileVal("pfpColor", c)}
              ></button>
            ))}
          </ControlRow>
          <ControlRow label="charm">
            {DECOS.map(([id, label]) => (
              <button
                key={id}
                style={{
                  minWidth: "26px",
                  height: "26px",
                  padding: "0 6px",
                  cursor: "pointer",
                  borderRadius: "7px",
                  border: P.deco === id ? "2px solid var(--accent)" : "var(--border)",
                  background: P.deco === id ? "var(--tab-active)" : "var(--panel)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
                onClick={() => api.setProfileVal("deco", id)}
              >
                {label}
              </button>
            ))}
          </ControlRow>
        </div>
      </div>

      {/* name effect */}
      <SectionLabel>✦ NAME EFFECT</SectionLabel>
      <div style={{ marginBottom: "8px" }}>
        <span style={nameStyleFor(P.textFx, 24)}>{P.name}</span>
      </div>
      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "16px" }}>
        {FXS.map(([id, label]) => (
          <button
            key={id}
            style={{
              padding: "7px 12px",
              fontFamily: "var(--font-pixel)",
              fontSize: "11px",
              cursor: "pointer",
              borderRadius: "999px",
              border: P.textFx === id ? "2px solid var(--accent)" : "var(--border)",
              background: P.textFx === id ? "var(--tab-active)" : "var(--panel)",
              color: P.textFx === id ? "var(--accent)" : "var(--ink)",
            }}
            onClick={() => api.setProfileVal("textFx", id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* about you */}
      <SectionLabel>✦ ABOUT YOU</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <label style={{ display: "block" }}>
          <FieldLabel>DISPLAY NAME</FieldLabel>
          <input value={P.name} onChange={(e) => api.setP("name", e.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <label style={{ flex: 1 }}>
            <FieldLabel>HANDLE</FieldLabel>
            <input value={P.handle} onChange={(e) => api.setP("handle", e.target.value)} style={inputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            <FieldLabel>PRONOUNS</FieldLabel>
            <input
              value={P.pronouns}
              onChange={(e) => api.setP("pronouns", e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <label style={{ display: "block" }}>
          <FieldLabel>BIO</FieldLabel>
          <textarea
            value={P.bio}
            onChange={(e) => api.setP("bio", e.target.value)}
            rows={3}
            style={inputStyle}
          />
        </label>
      </div>

      {/* my links */}
      <SectionLabel mt="16px 0 10px">✦ MY LINKS</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {P.links.map((l) => (
          <div
            key={l.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              background: "var(--panel-2)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
              padding: "8px 9px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <button
                onClick={() => setIconPickerFor(iconPickerFor === l.id ? null : l.id)}
                title="choose icon"
                style={{
                  width: "30px",
                  height: "30px",
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  border: "none",
                  borderRadius: "calc(var(--radius) - 8px)",
                  cursor: "pointer",
                }}
              >
                {l.icon ? <Icon id={l.icon} size={16} /> : <span style={{ fontSize: "15px" }}>{l.emoji}</span>}
              </button>
              <input
                value={l.label}
                onChange={(e) => api.setLinkLabel(l.id, e.target.value)}
                placeholder="link title"
                style={{ flex: 1, minWidth: 0, background: "var(--panel)", border: "var(--border)", borderRadius: "calc(var(--radius) - 6px)", padding: "6px 9px", fontSize: "12.5px", color: "var(--ink)", outline: "none" }}
              />
              <SmallBtn onClick={() => api.moveLink(l.id, -1)}>↑</SmallBtn>
              <SmallBtn onClick={() => api.moveLink(l.id, 1)}>↓</SmallBtn>
              <button
                style={{ width: "26px", height: "26px", flex: "0 0 auto", border: "var(--border)", background: "var(--panel)", borderRadius: "6px", cursor: "pointer", color: "var(--accent)", fontSize: "12px" }}
                onClick={() => api.removeLink(l.id)}
              >
                ✕
              </button>
            </div>
            {l.kind !== "guest" && (
              <input
                value={l.url || ""}
                onChange={(e) => api.setLinkField(l.id, "url", e.target.value)}
                placeholder="https://… (where it links)"
                style={{ width: "100%", background: "var(--panel)", border: "var(--border)", borderRadius: "calc(var(--radius) - 6px)", padding: "6px 9px", fontSize: "11.5px", color: "var(--ink)", outline: "none", fontFamily: "monospace" }}
              />
            )}
            {iconPickerFor === l.id && (
              <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 80, marginTop: "4px" }} onMouseDown={(e) => e.stopPropagation()}>
                <IconPicker onPick={(id) => api.setLinkField(l.id, "icon", id)} onClose={() => setIconPickerFor(null)} />
              </div>
            )}
          </div>
        ))}
        <button
          style={{
            padding: "9px",
            background: "transparent",
            border: "1.5px dashed var(--line)",
            borderRadius: "var(--radius)",
            color: "var(--ink-soft)",
            fontSize: "12.5px",
            cursor: "pointer",
          }}
          onClick={() => api.addLink()}
        >
          + add a link
        </button>
      </div>

      <button
        style={{
          marginTop: "16px",
          width: "100%",
          padding: "12px",
          background: "var(--panel-2)",
          color: "var(--ink)",
          border: "var(--border)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          cursor: "pointer",
        }}
        onClick={() => api.openWindow("profile")}
      >
        ◱ preview in dashboard
      </button>
      <button
        style={{
          width: "100%",
          marginTop: "8px",
          padding: "12px",
          background: "var(--accent)",
          color: "var(--on-accent)",
          border: "none",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: "var(--btn-shadow)",
        }}
        onClick={() => {
          if (typeof window !== "undefined" && P.handle) window.open("/" + P.handle, "_blank");
        }}
      >
        view my live page ↗
      </button>
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)", width: "42px" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        display: "block",
        fontFamily: "var(--font-pixel)",
        fontSize: "9.5px",
        color: "var(--ink-soft)",
        marginBottom: "5px",
      }}
    >
      {children}
    </span>
  );
}

function SmallBtn({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      style={{
        width: "26px",
        height: "26px",
        flex: "0 0 auto",
        border: "var(--border)",
        background: "var(--panel)",
        borderRadius: "6px",
        cursor: "pointer",
        color: "var(--ink)",
        fontSize: "11px",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Upload a file via the store (Supabase Storage when configured, else object
// URL) → resulting URL. Shows current state + clear button.
function FileRow({ label, accept, current, onFile, onClear, round, isAudio, kind, handle }: { label: string; accept: string; current?: string; onFile: (url: string) => void; onClear: () => void; round?: boolean; isAudio?: boolean; kind: "avatar" | "audio" | "bg"; handle: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const has = !!current;
  const isImg = accept.startsWith("image");
  async function pick(f: File) {
    setBusy(true);
    try {
      const url = await uploadAsset(f, kind, handle || "me");
      onFile(url);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)" }}>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
      {has && isImg ? (
        <span style={{ width: "34px", height: "34px", flex: "0 0 auto", borderRadius: round ? "50%" : "8px", background: `center/cover url(${current})`, border: "var(--border)" }} />
      ) : (
        <span style={{ width: "34px", height: "34px", flex: "0 0 auto", borderRadius: round ? "50%" : "8px", background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "var(--ink-soft)" }}>{isAudio ? "♪" : isImg ? "🖼" : "🎞"}</span>
      )}
      <button onClick={() => ref.current?.click()} disabled={busy} style={{ flex: 1, textAlign: "left", border: "none", background: "transparent", cursor: busy ? "wait" : "pointer", fontSize: "12.5px", color: "var(--ink)", fontWeight: 600 }}>
        {busy ? "uploading…" : has ? "replace ✦" : label}
      </button>
      {has && !busy && (
        <button onClick={onClear} title="remove" style={{ border: "var(--border)", background: "var(--panel-2)", borderRadius: "6px", width: "24px", height: "24px", cursor: "pointer", color: "var(--ink-soft)", fontSize: "11px", flex: "0 0 auto" }}>✕</button>
      )}
    </div>
  );
}

// A compact pill toggle used for translucent / cardless.
function MiniToggle({ label, on, onClick, disabled }: { label: string; on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => { if (!disabled) onClick(); }}
      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px 8px", borderRadius: "12px", border: on ? "2px solid var(--accent)" : "var(--border)", background: on ? "var(--tab-active)" : "var(--panel-2)", color: disabled ? "var(--ink-soft)" : "var(--ink)", cursor: disabled ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: on ? 700 : 400, opacity: disabled ? 0.5 : 1 }}
    >
      <span style={{ width: "13px", height: "13px", borderRadius: "4px", border: on ? "none" : "2px solid var(--line)", background: on ? "var(--accent)" : "transparent", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>{on ? "✓" : ""}</span>
      {label}
    </button>
  );
}
