"use client";

import type { CSSProperties } from "react";
import { initOf } from "@/lib/styleHelpers";
import type { DesktopApi } from "@/lib/useDesktop";
import { inputStyle } from "./shared";

// New group composer — name the group, toggle-select known friends, invite
// anyone else by their @handle (added as pending invites), then create. On
// create the group conversation is inserted and its chat window opens.
export default function NewGroupWindow({ api, winId }: { api: DesktopApi; winId: string }) {
  const { state } = api;
  const ng = state.newGroup;
  // only the user's real friends (empty for fresh accounts — no demo people)
  const PEOPLE = state.friends;
  const friendIds = Object.keys(PEOPLE);
  const pickedIds = Object.keys(ng.picked).filter((k) => ng.picked[k]);
  const total = pickedIds.length + ng.invites.length;

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
        {friendIds.length === 0 && (
          <div style={{ padding: "14px", textAlign: "center", fontSize: "12px", color: "var(--ink-soft)", border: "1px dashed var(--line)", borderRadius: "var(--radius)" }}>
            no friends yet — invite anyone by their @handle below ♡
          </div>
        )}
        {friendIds.map((id) => {
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
                {initOf(p.name)}
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

      {/* invite by handle */}
      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "9.5px",
          color: "var(--ink-soft)",
          marginBottom: "8px",
        }}
      >
        INVITE BY HANDLE
      </div>
      <div style={{ display: "flex", gap: "7px", marginBottom: ng.invites.length ? "10px" : "16px" }}>
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
            value={ng.handleDraft}
            onChange={(e) => api.setGroupHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") api.addGroupInvite();
            }}
            placeholder="add anyone by handle"
            style={{ ...inputStyle, paddingLeft: "24px" }}
          />
        </div>
        <button
          style={{
            padding: "0 15px",
            border: "none",
            borderRadius: "var(--radius)",
            background: "var(--accent-2)",
            color: "var(--on-accent)",
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            cursor: ng.handleDraft.trim() ? "pointer" : "not-allowed",
            opacity: ng.handleDraft.trim() ? 1 : 0.45,
            flex: "0 0 auto",
          }}
          onClick={() => api.addGroupInvite()}
        >
          add
        </button>
      </div>
      {ng.invites.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {ng.invites.map((h) => (
            <span
              key={h}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 7px 5px 10px",
                background: "var(--tab-active)",
                border: "2px solid var(--accent)",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              @{h}
              <button
                onClick={() => api.removeGroupInvite(h)}
                style={{
                  width: "16px",
                  height: "16px",
                  border: "none",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  cursor: "pointer",
                  fontSize: "10px",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
                title="remove"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        style={{
          width: "100%",
          padding: "12px",
          border: "none",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          cursor: total ? "pointer" : "not-allowed",
          background: "var(--accent)",
          color: "var(--on-accent)",
          opacity: total ? 1 : 0.45,
          boxShadow: "var(--btn-shadow)",
        }}
        onClick={() => api.createGroup(winId)}
      >
        create group ♡
      </button>
    </div>
  );
}
