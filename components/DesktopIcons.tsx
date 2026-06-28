"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import type { DesktopApi } from "@/lib/useDesktop";

export interface IconDef {
  id: string;
  icon: string;
  label: string;
  badge?: number;
  open: () => void;
}

// Free-floating desktop icons. Each sits at a default grid slot unless the user
// has dragged it (positions live in state.iconPos). A single click opens the
// app; dragging relocates it and snaps to an even grid. Right-click bubbles up
// to the desktop menu.
export default function DesktopIcons({
  api,
  defs,
  onIconContext,
}: {
  api: DesktopApi;
  defs: IconDef[];
  onIconContext: (e: React.MouseEvent, def: IconDef) => void;
}) {
  const s = api.state;

  return (
    <>
      {defs.map((d, i) => (
        <DesktopIcon
          key={d.id}
          api={api}
          def={d}
          index={i}
          pos={s.iconPos[d.id]}
          onIconContext={onIconContext}
        />
      ))}
    </>
  );
}

function defaultPos(index: number) {
  // a vertical column down the left, wrapping after 7
  const col = Math.floor(index / 7);
  const row = index % 7;
  return { x: 16 + col * 92, y: 16 + row * 84 };
}

function DesktopIcon({
  api,
  def,
  index,
  pos,
  onIconContext,
}: {
  api: DesktopApi;
  def: IconDef;
  index: number;
  pos?: { x: number; y: number };
  onIconContext: (e: React.MouseEvent, def: IconDef) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ mx: 0, my: 0, x: 0, y: 0 });
  const p = pos || defaultPos(index);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement as HTMLElement;
    const pr = parent.getBoundingClientRect();
    dragging.current = true;
    moved.current = false;
    start.current = { mx: e.clientX, my: e.clientY, x: p.x, y: p.y };

    const move = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - start.current.mx;
      const dy = ev.clientY - start.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      let nx = start.current.x + dx;
      let ny = start.current.y + dy;
      nx = Math.max(0, Math.min(nx, pr.width - 76));
      ny = Math.max(0, Math.min(ny, pr.height - 76));
      el.style.left = nx + "px";
      el.style.top = ny + "px";
      start.current.x = nx;
      start.current.y = ny;
      start.current.mx = ev.clientX;
      start.current.my = ev.clientY;
    };
    const up = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (moved.current) {
        // snap to the same even grid the default layout uses, so dropped icons
        // always line up instead of landing at arbitrary pixel offsets
        const GX = 92, GY = 84, OX = 16, OY = 16;
        const sx = Math.max(0, Math.round((start.current.x - OX) / GX) * GX + OX);
        const sy = Math.max(0, Math.round((start.current.y - OY) / GY) * GY + OY);
        el.style.left = sx + "px";
        el.style.top = sy + "px";
        api.setIconPos(def.id, sx, sy);
      } else {
        // a clean click (no drag) opens the app — single click, no double-click
        def.open();
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const style: CSSProperties = {
    position: "absolute",
    left: p.x + "px",
    top: p.y + "px",
    width: "76px",
    height: "78px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    padding: "6px 2px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: "14px",
    zIndex: 2,
    userSelect: "none",
  };

  return (
    <button
      ref={ref}
      style={style}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => onIconContext(e, def)}
      title={def.label}
    >
      {/* app-icon squircle */}
      <span
        style={{
          position: "relative",
          width: "52px",
          height: "52px",
          borderRadius: "15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          color: "var(--on-accent)",
          background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 88%, #fff) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 75%, #000) 100%)",
          boxShadow: "0 8px 18px -8px rgba(0,0,0,.55), inset 0 1.5px 1px rgba(255,255,255,.55), inset 0 -2px 3px rgba(0,0,0,.18)",
          border: "1px solid rgba(255,255,255,.35)",
          textShadow: "0 1px 2px rgba(0,0,0,.25)",
        }}
      >
        {def.icon}
        {!!def.badge && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: "#ff3b6b",
              color: "#fff",
              fontFamily: "var(--font-pixel)",
              fontSize: "8px",
              minWidth: "17px",
              height: "17px",
              padding: "0 4px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--bg, #fff)",
              boxShadow: "0 2px 5px -1px rgba(0,0,0,.4)",
            }}
          >
            {def.badge}
          </span>
        )}
      </span>
      <span
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "9px",
          color: "var(--ink)",
          textShadow: "0 1px 3px var(--panel), 0 0 6px var(--panel)",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "0.2px",
        }}
      >
        {def.label}
      </span>
    </button>
  );
}
