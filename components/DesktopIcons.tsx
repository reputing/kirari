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
// has dragged it (positions live in state.iconPos). Double-click opens the app;
// a single drag relocates it. Right-click bubbles up to the desktop menu.
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
      if (moved.current) api.setIconPos(def.id, start.current.x, start.current.y);
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
      onDoubleClick={() => def.open()}
      onContextMenu={(e) => onIconContext(e, def)}
      title={def.label}
    >
      {/* bubble */}
      <span
        style={{
          position: "relative",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "23px",
          color: "var(--on-accent)",
          background: "var(--titlebar)",
          boxShadow: "0 6px 14px -6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.5)",
          border: "2px solid rgba(255,255,255,.55)",
        }}
      >
        {def.icon}
        {!!def.badge && (
          <span
            style={{
              position: "absolute",
              top: "-3px",
              right: "-3px",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontFamily: "var(--font-pixel)",
              fontSize: "8px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid var(--panel)",
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
