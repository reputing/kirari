"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { MOODS } from "@/lib/seed";
import { inputStyle } from "./shared";

// Onboarding wizard — 4 steps over a blurred backdrop: claim handle (with live
// availability check), pick a starter mood, drop first links, and a welcome
// confirmation. A 4-segment progress bar tracks position.
export default function Onboarding({ api }: { api: DesktopApi }) {
  const { state } = api;
  if (!state.onboarding) return null;

  const h = state.onbHandle.trim().toLowerCase();
  const taken = ["admin", "yuki", "star", "root", "kirari", "mod"];
  const tooShort = h.length > 0 && h.length < 3;
  const isTaken = taken.includes(h);
  const onbAvail = h.length >= 3 && !isTaken;

  let availText = "your link: kirari.cafe/@" + (h || "…");
  if (tooShort) availText = "too short — 3+ characters pls";
  else if (isTaken) availText = "@" + h + " is taken ;; try another";
  else if (onbAvail) availText = "✓ @" + h + " is available!";

  const availStyle: CSSProperties = {
    marginTop: "10px",
    fontFamily: "var(--font-pixel)",
    fontSize: "11px",
    color: onbAvail ? "var(--accent-2)" : tooShort || isTaken ? "var(--accent)" : "var(--ink-soft)",
  };

  const onb0 = state.onbStep === 0;
  const onb1 = state.onbStep === 1;
  const onb2 = state.onbStep === 2;
  const onb3 = state.onbStep === 3;
  const canNext = onb0 ? onbAvail : true;
  const nextLabel = onb3 ? "enter my page ♡" : "next →";
  const handlePreview = "kirari.cafe/@" + (state.onbHandle.trim() || state.profile.handle);

  const nextStyle: CSSProperties = {
    flex: 1,
    padding: "11px 18px",
    border: "none",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-display)",
    fontSize: "14px",
    cursor: canNext ? "pointer" : "not-allowed",
    background: "var(--accent)",
    color: "var(--on-accent)",
    opacity: canNext ? 1 : 0.45,
    boxShadow: "var(--btn-shadow)",
  };

  const linkPlaceholders = ["e.g. my art gallery ✿", "e.g. now playing ♫", "e.g. shop / commissions ✩"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(20,10,20,.55)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: "22px",
      }}
    >
      <div
        style={{
          width: "min(440px,100%)",
          background: "var(--panel)",
          border: "var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          padding: "26px",
          position: "relative",
          animation: "popin .3s ease both",
        }}
      >
        <button
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "28px",
            height: "28px",
            border: "var(--border)",
            background: "var(--panel-2)",
            borderRadius: "50%",
            cursor: "pointer",
            color: "var(--ink-soft)",
            fontSize: "13px",
          }}
          onClick={() => api.closeOnb()}
        >
          ✕
        </button>

        {/* progress dots */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: "5px",
                borderRadius: "999px",
                background: i <= state.onbStep ? "var(--accent)" : "var(--line)",
                transition: "background .2s",
              }}
            ></span>
          ))}
        </div>

        {onb0 && (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "23px", lineHeight: 1.15 }}>
              claim your ✦ kirari ✦
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "8px 0 16px", lineHeight: 1.5 }}>
              pick a handle — this becomes your link + your door for chats.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--panel-2)",
                border: "var(--border)",
                borderRadius: "var(--radius)",
                padding: "4px 4px 4px 13px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "13px",
                  color: "var(--ink-soft)",
                  whiteSpace: "nowrap",
                }}
              >
                kirari.cafe/@
              </span>
              <input
                value={state.onbHandle}
                onChange={(e) => api.setOnbHandle(e.target.value)}
                placeholder="yourname"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  padding: "8px 6px",
                  fontSize: "15px",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div style={availStyle}>{availText}</div>
          </>
        )}

        {onb1 && (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "23px", lineHeight: 1.15 }}>
              pick your starter mood ♡
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "8px 0 16px", lineHeight: 1.5 }}>
              set the vibe visitors see first. you can change it anytime.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {MOODS.map((m) => (
                <button
                  key={m}
                  style={{
                    padding: "8px 13px",
                    fontSize: "13px",
                    cursor: "pointer",
                    borderRadius: "999px",
                    border: m === state.onbMood ? "2px solid var(--accent)" : "var(--border)",
                    background: m === state.onbMood ? "var(--tab-active)" : "var(--panel-2)",
                    color: m === state.onbMood ? "var(--accent)" : "var(--ink)",
                    fontWeight: m === state.onbMood ? 700 : 400,
                  }}
                  onClick={() => api.pickOnbMood(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}

        {onb2 && (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "23px", lineHeight: 1.15 }}>
              drop your first links ✿
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "8px 0 16px", lineHeight: 1.5 }}>
              add up to 3 to start — art, music, shop, anything.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {state.onbLinks.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => api.setOnbLink(i, e.target.value)}
                  placeholder={linkPlaceholders[i]}
                  style={inputStyle}
                />
              ))}
            </div>
          </>
        )}

        {onb3 && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: "46px" }}>✦♡✦</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", marginTop: "6px" }}>
              welcome to kirari ♡
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.5 }}>
              your page is live at
              <br />
              <span style={{ fontFamily: "var(--font-pixel)", color: "var(--accent)" }}>{handlePreview}</span>
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
          {state.onbStep > 0 && (
            <button
              style={{
                padding: "11px 18px",
                background: "var(--panel-2)",
                border: "var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--ink)",
                fontSize: "14px",
                cursor: "pointer",
              }}
              onClick={() => api.onbPrev()}
            >
              back
            </button>
          )}
          <button
            style={nextStyle}
            onClick={() => {
              if (!canNext) return;
              if (onb3) api.finishOnb();
              else api.onbNext();
            }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
