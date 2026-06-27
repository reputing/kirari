"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";

export interface MenuItem {
  label: string;
  icon?: string;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
}

// A small Windows-style right-click menu, positioned at (x,y) in viewport space.
export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    // attach on the next tick so the same click/contextmenu that opened the
    // menu doesn't immediately close it
    const id = window.setTimeout(() => {
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      window.addEventListener("resize", close);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  // keep on-screen
  const W = 196;
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - W - 8);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - items.length * 34 - 12);

  const wrap: CSSProperties = {
    position: "fixed",
    left: Math.max(6, left),
    top: Math.max(6, top),
    width: W + "px",
    zIndex: 100000,
    background: "var(--panel)",
    border: "var(--border)",
    borderRadius: "12px",
    boxShadow: "0 14px 36px -12px rgba(0,0,0,.5)",
    padding: "5px",
    overflow: "hidden",
  };

  return (
    <div style={wrap} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} style={{ height: "1px", background: "var(--line)", margin: "4px 6px" }} />
        ) : (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => {
              if (it.disabled) return;
              it.onClick?.();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              width: "100%",
              padding: "8px 10px",
              border: "none",
              background: "transparent",
              borderRadius: "8px",
              cursor: it.disabled ? "default" : "pointer",
              color: it.disabled ? "var(--ink-soft)" : "var(--ink)",
              fontSize: "12.5px",
              fontFamily: "var(--font-body)",
              textAlign: "left",
              opacity: it.disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!it.disabled) (e.currentTarget as HTMLButtonElement).style.background = "var(--tab-active)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <span style={{ width: "16px", flex: "0 0 auto", textAlign: "center" }}>{it.checked ? "✓" : it.icon || ""}</span>
            <span style={{ flex: 1 }}>{it.label}</span>
          </button>
        )
      )}
    </div>
  );
}
