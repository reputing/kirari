"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { nameStyleFor, bgFor } from "@/lib/styleHelpers";

// Profile / biolink window body. Renders the owner's customized page:
// framed portrait, animated name effect, mood + status dot, bio, counters,
// the knock CTA, link cards, and the guestbook CTA.
export default function ProfileWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const P = state.profile;

  const pageStyle: CSSProperties = {
    height: "100%",
    overflowY: "auto",
    padding: "18px",
    ...bgFor(P.bg),
  };
  const pfpStyle: CSSProperties = {
    position: "relative",
    width: "88px",
    height: "88px",
    flex: "0 0 auto",
    borderRadius: P.pfpShape === "circle" ? "50%" : "20px",
    border: "3px solid " + P.pfpColor,
    background:
      "repeating-linear-gradient(45deg,var(--panel-2),var(--panel-2) 7px,var(--line) 7px,var(--line) 14px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "var(--btn-shadow)",
  };
  const hasDeco = P.deco !== "none" && !!P.deco;
  const decoStyle: CSSProperties = {
    position: "absolute",
    right: "-9px",
    top: "-9px",
    fontSize: "21px",
    filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))",
  };
  const dotStyle: CSSProperties = {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    background: "var(--accent-2)",
    boxShadow: "0 0 6px var(--accent-2)",
    display: "inline-block",
    flex: "0 0 auto",
    animation: state.toggles.statusBlink ? "blink 1.1s steps(1,end) infinite" : "none",
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div style={pfpStyle}>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "8.5px",
              color: "var(--ink-soft)",
              background: "var(--panel)",
              padding: "2px 5px",
              borderRadius: "6px",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            moe
            <br />
            portrait
          </span>
          {hasDeco && <span style={decoStyle}>{P.deco}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
          <div style={nameStyleFor(P.textFx, 25)}>{P.name}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              flexWrap: "wrap",
              marginTop: "6px",
            }}
          >
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", color: "var(--ink-soft)" }}>
              @{P.handle}
            </span>
            <span
              style={{
                fontSize: "10.5px",
                background: "var(--panel-2)",
                border: "var(--border)",
                borderRadius: "999px",
                padding: "1px 8px",
                color: "var(--ink-soft)",
              }}
            >
              {P.pronouns}
            </span>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              marginTop: "9px",
              background: "var(--panel-2)",
              border: "var(--border)",
              borderRadius: "999px",
              padding: "5px 11px",
              fontSize: "12.5px",
            }}
          >
            <span style={dotStyle}></span>
            {state.mood}
          </div>
        </div>
      </div>

      <p style={{ margin: "15px 0 0", fontSize: "14px", lineHeight: 1.6, textWrap: "pretty" } as CSSProperties}>
        {P.bio}
      </p>
      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "10.5px",
          color: "var(--ink-soft)",
          marginTop: "9px",
        }}
      >
        {P.since}
      </div>

      {state.toggles.counter && (
        <div style={{ display: "flex", gap: "9px", marginTop: "15px" }}>
          <Counter value={P.counters.views.toLocaleString("en-US")} label="VISITS" />
          <Counter value={String(P.counters.knocks)} label="KNOCKS" />
          <Counter value={String(P.counters.friends)} label="FRIENDS" />
        </div>
      )}

      <button
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1px",
          width: "100%",
          marginTop: "15px",
          padding: "12px",
          background: "var(--accent)",
          color: "var(--on-accent)",
          border: "none",
          borderRadius: "var(--radius)",
          cursor: "pointer",
          boxShadow: "var(--btn-shadow)",
        }}
        onClick={() => api.openDM("momoka")}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}>✉ knock &amp; chat with me</span>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", opacity: 0.85 }}>
          opens a dm window ♡
        </span>
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "18px 0 11px",
          color: "var(--ink-soft)",
        }}
      >
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }}></span>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "10.5px", letterSpacing: "1px" }}>
          ✦ my links ✦
        </span>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }}></span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {P.links.map((l) => (
          <button
            key={l.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              width: "100%",
              padding: "10px 12px",
              background: "var(--panel-2)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              color: "var(--ink)",
              textAlign: "left",
              boxShadow: "var(--btn-shadow)",
            }}
            onClick={() => {
              if (l.kind === "guest") api.openWindow("guestbook");
            }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                background: "var(--accent)",
                color: "var(--on-accent)",
                borderRadius: "calc(var(--radius) - 8px)",
              }}
            >
              {l.emoji}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {l.label}
              </span>
              {l.meta && (
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-pixel)",
                    fontSize: "9.5px",
                    color: "var(--ink-soft)",
                  }}
                >
                  {l.meta}
                </span>
              )}
            </span>
            <span style={{ fontSize: "14px", color: "var(--ink-soft)", flex: "0 0 auto" }}>
              {l.kind === "guest" ? "★" : "↗"}
            </span>
          </button>
        ))}
      </div>

      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          width: "100%",
          marginTop: "13px",
          padding: "10px",
          background: "transparent",
          border: "1.5px dashed var(--line)",
          borderRadius: "var(--radius)",
          cursor: "pointer",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-pixel)",
          fontSize: "11px",
        }}
        onClick={() => api.openWindow("guestbook")}
      >
        ★ sign my guestbook · 48 souls ★
      </button>
    </div>
  );
}

function Counter({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        background: "var(--panel-2)",
        border: "var(--border)",
        borderRadius: "var(--radius)",
        padding: "9px 5px",
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: "18px" }}>{value}</div>
      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "8.5px",
          color: "var(--ink-soft)",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
    </div>
  );
}
