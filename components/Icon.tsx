"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { SOCIAL_ICONS, findIcon } from "@/lib/socialIcons";

// Render a social icon by id at a given size, inheriting color via currentColor.
export function Icon({ id, size = 18 }: { id?: string; size?: number }) {
  const ic = findIcon(id);
  if (!ic) {
    return <span style={{ fontSize: size * 0.9 + "px", lineHeight: 1 }}>✦</span>;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <path d={ic.path} />
    </svg>
  );
}

// A searchable grid of all icons; calls onPick(id) on select.
export function IconPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = query
    ? SOCIAL_ICONS.filter((i) => (i.name + " " + i.kw + " " + i.id).toLowerCase().includes(query))
    : SOCIAL_ICONS;

  const wrap: CSSProperties = {
    background: "var(--panel)",
    border: "var(--border)",
    borderRadius: "16px",
    boxShadow: "0 16px 40px -14px rgba(0,0,0,.55)",
    padding: "12px",
    width: "300px",
    maxWidth: "92vw",
  };

  return (
    <div style={wrap} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search 100+ icons…"
          style={{ flex: 1, border: "var(--border)", borderRadius: "10px", background: "var(--panel-2)", padding: "8px 11px", fontSize: "13px", color: "var(--ink)", outline: "none" }}
        />
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-soft)", fontSize: "14px" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px", maxHeight: "220px", overflowY: "auto" }}>
        {list.map((ic) => (
          <button
            key={ic.id}
            onClick={() => { onPick(ic.id); onClose(); }}
            title={ic.name}
            style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", border: "var(--border)", background: "var(--panel-2)", borderRadius: "10px", cursor: "pointer", color: "var(--ink)" }}
          >
            <Icon id={ic.id} size={18} />
          </button>
        ))}
        {list.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", fontSize: "12px", color: "var(--ink-soft)" }}>
            no icons match “{q}”
          </div>
        )}
      </div>
    </div>
  );
}
