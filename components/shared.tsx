import type { CSSProperties } from "react";

// Shared form input style used by the edit, new-group, and onboarding windows.
// Consistent modern radius/border regardless of the (sometimes very round or
// very sharp) theme radius, so form fields read clean across all skins.
export const inputStyle: CSSProperties = {
  width: "100%",
  background: "color-mix(in srgb, var(--panel-2) 80%, var(--panel))",
  border: "1px solid color-mix(in srgb, var(--ink) 14%, transparent)",
  borderRadius: "11px",
  padding: "10px 13px",
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
  fontFamily: "var(--font-body)",
  resize: "vertical",
  transition: "border-color .14s ease, box-shadow .14s ease",
};

// Small reusable section divider with an eyebrow label. Clean uppercase eyebrow
// + a fading hairline (drops the harsh pixel-font + flat rule that read dated).
export function SectionLabel({ children, mt }: { children: string; mt?: string }) {
  const text = children.replace(/^✦\s*/, "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: mt || "0 0 11px" }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: "10.5px",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
          flex: "0 0 auto",
        }}
      >
        {text}
      </span>
      <span style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, color-mix(in srgb, var(--ink) 18%, transparent), transparent)" }}></span>
    </div>
  );
}
