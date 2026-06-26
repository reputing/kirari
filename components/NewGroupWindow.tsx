"use client";

import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import { PEOPLE } from "@/lib/seed";
import { inputStyle } from "./shared";

// New group composer — name the group, toggle-select friends to invite, then
// create. On create the group conversation is inserted and its chat window opens.
export default function NewGroupWindow({ api, winId }: { api: DesktopApi; winId: string }) {
  const { state } = api;
  const ng = state.newGroup;
  const ids = Object.keys(ng.picked).filter((k) => ng.picked[k]);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "16px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", marginBottom: "4px" }}>
        start a group ✦
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
        name it &amp; pick who to invite. you can chat together in one window.
      </p>
      <label style={{ display: "block", marginBottom: "14px" }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-pixel)",
            fontSize: "9.5px",
            color: "var(--ink-soft)",
            marginBottom: "5px",
          }}
        >
          GROUP NAME
        </span>
        <input
          value={ng.name}
          onChange={(e) => api.setGroupName(e.target.value)}
          placeholder="e.g. ✦ sticker squad ✦"
          style={inputStyle}
        />
      </label>
      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "9.5px",
          color: "var(--ink-soft)",
          marginBottom: "8px",
        }}
      >
        INVITE FRIENDS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "16px" }}>
        {Object.keys(PEOPLE).map((id) => {
          const p = PEOPLE[id];
          const on = !!ng.picked[id];
          const style: CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "8px 10px",
            background: on ? "var(--tab-active)" : "var(--panel-2)",
            border: on ? "2px solid var(--accent)" : "var(--border)",
            borderRadius: "var(--radius)",
            cursor: "pointer",
            color: "var(--ink)",
          };
          return (
            <button key={id} style={style} onClick={() => api.toggleMember(id)}>
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  flex: "0 0 auto",
                  borderRadius: "50%",
                  background: p.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontFamily: "var(--font-display)",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, textAlign: "left", fontSize: "13.5px", fontWeight: 700 }}>
                {p.name}
              </span>
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  background: on ? "var(--accent)" : "transparent",
                  color: "var(--on-accent)",
                  border: on ? "none" : "var(--border)",
                }}
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <button
        style={{
          width: "100%",
          padding: "12px",
          border: "none",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          cursor: ids.length ? "pointer" : "not-allowed",
          background: "var(--accent)",
          color: "var(--on-accent)",
          opacity: ids.length ? 1 : 0.45,
          boxShadow: "var(--btn-shadow)",
        }}
        onClick={() => api.createGroup(winId)}
      >
        create group ♡
      </button>
    </div>
  );
}
