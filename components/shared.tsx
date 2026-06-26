import type { CSSProperties } from "react";

// Shared form input style used by the edit, new-group, and onboarding windows.
export const inputStyle: CSSProperties = {
  width: "100%",
  background: "var(--panel-2)",
  border: "var(--border)",
  borderRadius: "var(--radius)",
  padding: "9px 12px",
  fontSize: "13.5px",
  color: "var(--ink)",
  outline: "none",
  fontFamily: "var(--font-body)",
  resize: "vertical",
};

// Small reusable section divider with an eyebrow label (✦ LABEL ───).
export function SectionLabel({ children, mt }: { children: string; mt?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: mt || "0 0 10px" }}>
      <span
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "10px",
          letterSpacing: "1px",
          color: "var(--ink-soft)",
        }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: "1px", background: "var(--line)" }}></span>
    </div>
  );
}
