"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { inputStyle, SectionLabel } from "./shared";

// Friend requests hub — incoming requests you can Accept / Decline, a field to
// send a new request by @handle, and a list of your outgoing pending requests.
export default function RequestsWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const incoming = state.requests.filter((r) => r.dir === "in");
  const outgoing = state.requests.filter((r) => r.dir === "out");

  const avatar = (handle: string, color: string): CSSProperties => ({
    width: "34px",
    height: "34px",
    flex: "0 0 auto",
    borderRadius: "50%",
    background: color,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontFamily: "var(--font-display)",
  });

  const pill = (bg: string, fg: string): CSSProperties => ({
    padding: "6px 12px",
    border: "none",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-display)",
    fontSize: "12px",
    cursor: "pointer",
    background: bg,
    color: fg,
    flex: "0 0 auto",
  });

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "14px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", marginBottom: "4px" }}>
        friend requests ♡
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
        accept knocks from new mutuals, or send a request by their handle.
      </p>

      {/* send a request */}
      <SectionLabel>ADD BY HANDLE</SectionLabel>
      <div style={{ display: "flex", gap: "7px", marginBottom: "16px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span
            style={{
              position: "absolute",
              left: "11px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-soft)",
              fontSize: "13px",
              pointerEvents: "none",
            }}
          >
            @
          </span>
          <input
            value={state.reqDraft}
            onChange={(e) => api.setReqDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") api.sendRequest();
            }}
            placeholder="their handle"
            style={{ ...inputStyle, paddingLeft: "24px" }}
          />
        </div>
        <button
          style={{
            ...pill("var(--accent)", "var(--on-accent)"),
            padding: "0 16px",
            boxShadow: "var(--btn-shadow)",
            opacity: state.reqDraft.trim() ? 1 : 0.45,
            cursor: state.reqDraft.trim() ? "pointer" : "not-allowed",
          }}
          onClick={() => api.sendRequest()}
        >
          send
        </button>
      </div>

      {/* incoming */}
      <SectionLabel>{"INCOMING" + (incoming.length ? " · " + incoming.length : "")}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {incoming.length === 0 && (
          <div style={{ fontSize: "12px", color: "var(--ink-soft)", padding: "6px 2px" }}>
            no new requests — your door is quiet ✦
          </div>
        )}
        {incoming.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px",
              background: "var(--panel-2)",
              border: "var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <span style={avatar(r.handle, r.color)}>{r.handle.charAt(0).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700 }}>@{r.handle}</div>
              {r.note && (
                <div style={{ fontSize: "11.5px", color: "var(--ink-soft)", lineHeight: 1.35 }}>
                  {r.note}
                </div>
              )}
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--ink-soft)", marginTop: "2px" }}>
                {r.time}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: "0 0 auto" }}>
              <button style={pill("var(--accent)", "var(--on-accent)")} onClick={() => api.acceptRequest(r.id)}>
                accept
              </button>
              <button
                style={{ ...pill("transparent", "var(--ink-soft)"), border: "var(--border)" }}
                onClick={() => api.declineRequest(r.id)}
              >
                decline
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* outgoing */}
      {outgoing.length > 0 && (
        <>
          <SectionLabel>SENT · PENDING</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {outgoing.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  background: "var(--panel-2)",
                  border: "var(--border)",
                  borderRadius: "var(--radius)",
                  opacity: 0.85,
                }}
              >
                <span style={avatar(r.handle, r.color)}>{r.handle.charAt(0).toUpperCase()}</span>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 700 }}>@{r.handle}</span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "9px",
                    color: "var(--ink-soft)",
                    border: "var(--border)",
                    borderRadius: "999px",
                    padding: "3px 9px",
                    flex: "0 0 auto",
                  }}
                >
                  pending
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
