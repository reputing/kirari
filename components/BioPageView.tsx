"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { resolveThemeVars } from "@/lib/themes";
import { nameStyleFor, bgFor, initOf } from "@/lib/styleHelpers";
import { Icon } from "@/components/Icon";
import type { Profile, GuestEntry, CustomTheme } from "@/lib/types";

// ============================================================================
// BioPageView — the single source of truth for how a published page looks.
// Used by the public route (/[handle]) AND the dashboard preview so they can
// never drift. `animate` plays the sequential reveal (bg → avatar → name →
// links cascade); `embedded` tightens it to fit inside the dashboard window.
// ============================================================================

export interface BioPageData {
  theme: string;
  customThemes: CustomTheme[];
  mood: string;
  profile: Profile;
  guestbook: GuestEntry[];
  fontDisplay?: string;
  fontBody?: string;
}

export default function BioPageView({
  data,
  animate = true,
  embedded = false,
  onKnock,
  onSign,
}: {
  data: BioPageData;
  animate?: boolean;
  embedded?: boolean;
  onKnock?: () => void;
  onSign?: () => void;
}) {
  const P = data.profile;
  const baseVars = resolveThemeVars(data.theme, data.customThemes);
  const themeVars: Record<string, string> = { ...baseVars };
  if (data.fontDisplay) themeVars["--font-display"] = data.fontDisplay;
  if (data.fontBody) themeVars["--font-body"] = data.fontBody;
  const views = P.counters.views;

  // reveal staging: 0 = nothing, climbs as stages mount in
  const [stage, setStage] = useState(animate ? 0 : 99);
  useEffect(() => {
    if (!animate) return;
    const timers = [120, 360, 600, 840, 1080].map((ms, i) =>
      setTimeout(() => setStage((s) => Math.max(s, i + 1)), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const reveal = (order: number): CSSProperties => ({
    opacity: stage >= order ? 1 : 0,
    transform: stage >= order ? "translateY(0) scale(1)" : "translateY(14px) scale(.98)",
    transition: "opacity .55s cubic-bezier(.2,.7,.2,1), transform .55s cubic-bezier(.2,.7,.2,1)",
  });

  const Wrapper = embedded ? "div" : "div";

  return (
    <Wrapper
      style={{
        ...(themeVars as CSSProperties),
        position: "relative",
        minHeight: embedded ? "100%" : "100vh",
        height: embedded ? "100%" : undefined,
        overflowY: embedded ? "auto" : undefined,
        overflowX: "hidden",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <PageBackground profile={P} embedded={embedded} show={stage >= 1} />

      <main
        style={{
          position: "relative",
          zIndex: 3,
          maxWidth: embedded ? "100%" : "520px",
          margin: "0 auto",
          padding: embedded ? "20px 14px 30px" : "min(9vh, 70px) 20px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <ProfileCard profile={P} mood={data.mood} views={views} reveal={reveal} onKnock={onKnock} />
        <div style={{ ...reveal(4), width: "100%" }}>
          <Links profile={P} onSign={onSign} />
        </div>
        <div style={{ ...reveal(5), width: "100%" }}>
          <Guestbook entries={data.guestbook} profile={P} onSign={onSign} />
        </div>
        {!embedded && (
          <div style={{ ...reveal(5), marginTop: "34px", fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)", opacity: 0.8 }}>
            <a href="/" style={{ color: "inherit", textDecoration: "none" }}>✦ made on kirari.cafe</a>
          </div>
        )}
      </main>
    </Wrapper>
  );
}

// ---- background (pattern / color / image / video) ----
function PageBackground({ profile, embedded, show }: { profile: Profile; embedded: boolean; show: boolean }) {
  const type = profile.pageBgType || "pattern";
  const pos = embedded ? "absolute" : "fixed";
  const base: CSSProperties = {
    position: pos,
    inset: 0,
    zIndex: 0,
    opacity: show ? 1 : 0,
    transition: "opacity .7s ease",
  };

  if (type === "video" && profile.pageBgUrl) {
    return (
      <>
        <video src={profile.pageBgUrl} autoPlay loop muted playsInline style={{ ...base, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ ...base, background: "rgba(0,0,0,.32)" }} />
      </>
    );
  }
  if (type === "image" && profile.pageBgUrl) {
    return (
      <>
        <div style={{ ...base, backgroundImage: `url(${profile.pageBgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ ...base, background: "rgba(0,0,0,.28)" }} />
      </>
    );
  }
  if (type === "color") {
    return <div style={{ ...base, background: profile.pageBgColor || "var(--bg)" }} />;
  }
  return (
    <>
      <div style={{ ...base, background: "var(--bg)" }} />
      <div style={{ ...base, ...bgFor(profile.bg), opacity: show ? 0.5 : 0 }} />
    </>
  );
}

// ---- surface (solid / translucent / cardless) ----
function surface(profile: Profile, extra?: CSSProperties): CSSProperties {
  if (profile.cardless) return { background: "transparent", border: "none", boxShadow: "none", ...extra };
  const shadowK = (profile.shadowStrength ?? 50) / 100;
  if (profile.translucent) {
    const amt = profile.translucentAmt ?? 68;
    return {
      background: `color-mix(in srgb, var(--panel) ${amt}%, transparent)`,
      border: "1px solid color-mix(in srgb, var(--ink) 16%, transparent)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: `0 ${18 * shadowK + 4}px ${46 * shadowK + 8}px -20px rgba(0,0,0,${0.6 * shadowK + 0.15})`,
      ...extra,
    };
  }
  return {
    background: "var(--panel)",
    border: "var(--border)",
    boxShadow: `0 ${14 * shadowK + 2}px ${40 * shadowK + 6}px -16px rgba(0,0,0,${0.5 * shadowK + 0.1})`,
    ...extra,
  };
}

function ProfileCard({ profile, mood, views, reveal, onKnock }: { profile: Profile; mood: string; views: number; reveal: (n: number) => CSSProperties; onKnock?: () => void }) {
  const P = profile;
  const onMedia = P.pageBgType === "image" || P.pageBgType === "video";
  // On media backgrounds, the card can sit over dark/busy areas — give text a
  // shadow and lift soft-ink to a readable tone so nothing disappears.
  const overMedia = onMedia && (P.cardless || P.translucent);
  const textGlow: CSSProperties = overMedia ? { textShadow: "0 2px 12px rgba(0,0,0,.7)" } : {};
  const softInk = overMedia ? "rgba(255,255,255,.82)" : "var(--ink-soft)";
  const inkOnMedia = overMedia ? "#fff" : "var(--ink)";

  // optional 3D tilt on hover
  const cardRef = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    if (!P.tilt || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cardRef.current.style.transform = `perspective(800px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
  }
  function onLeave() {
    if (cardRef.current) cardRef.current.style.transform = "perspective(800px) rotateX(0) rotateY(0)";
  }
  const idleAnim: CSSProperties = P.cardAnim === "float" ? { animation: "cardfloat 5s ease-in-out infinite" } : P.cardAnim === "pulse" ? { animation: "cardpulse 3.5s ease-in-out infinite" } : {};

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        ...surface(P, { borderRadius: "var(--radius)" }),
        ...reveal(3),
        ...idleAnim,
        width: "100%",
        padding: P.cardless ? "0 0 8px" : "26px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        marginBottom: "18px",
        transition: P.tilt ? "transform .12s ease-out" : undefined,
        transformStyle: "preserve-3d",
      }}
    >
      {/* avatar — its own reveal (stage 2) */}
      <div
        style={{
          ...reveal(2),
          position: "relative",
          width: "104px",
          height: "104px",
          borderRadius: P.pfpShape === "circle" ? "50%" : "26px",
          border: "3px solid " + P.pfpColor,
          background: P.pfpUrl
            ? `center/cover url(${P.pfpUrl})`
            : "repeating-linear-gradient(45deg,var(--panel-2),var(--panel-2) 7px,var(--line) 7px,var(--line) 14px)",
          boxShadow: "var(--btn-shadow)",
          marginBottom: "12px",
        }}
      >
        {P.deco !== "none" && !!P.deco && (
          <span style={{ position: "absolute", right: "-10px", top: "-10px", fontSize: "24px", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}>{P.deco}</span>
        )}
      </div>

      <h1 style={{ margin: 0, ...nameStyleFor(P.textFx, 30), ...textGlow }}>{P.name}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", color: softInk, ...textGlow }}>@{P.handle}</span>
        {P.pronouns && <span style={{ fontSize: "10px", padding: "2px 9px", borderRadius: "999px", border: "var(--border)", color: "var(--ink-soft)" }}>{P.pronouns}</span>}
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", marginTop: "12px", padding: "7px 14px", borderRadius: "999px", ...surface(P, { background: P.cardless ? "color-mix(in srgb, var(--panel) 70%, transparent)" : "var(--panel-2)", boxShadow: "none" }) }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#5ed29a", boxShadow: "0 0 6px #5ed29a" }} />
        <span style={{ fontSize: "13px", fontWeight: 700 }}>{mood || "♡ sleepy + online"}</span>
      </div>

      {P.bio && <p style={{ margin: "14px 0 0", fontSize: "14px", lineHeight: 1.55, color: inkOnMedia, maxWidth: "400px", ...textGlow }}>{P.bio}</p>}
      <div style={{ marginTop: "8px", fontFamily: "var(--font-pixel)", fontSize: "10px", color: softInk, ...textGlow }}>{P.since}</div>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        {[["views", views], ["knocks", P.counters.knocks], ["friends", P.counters.friends]].map(([label, n]) => (
          <div key={label as string} style={{ ...surface(P, { background: P.cardless ? "color-mix(in srgb, var(--panel) 70%, transparent)" : "var(--panel-2)", boxShadow: "none" }), borderRadius: "14px", padding: "8px 14px", minWidth: "64px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--accent)" }}>{Number(n).toLocaleString()}</div>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)", letterSpacing: "0.5px" }}>{String(label).toUpperCase()}</div>
          </div>
        ))}
      </div>

      <button
        style={{ width: "100%", marginTop: "16px", padding: "13px", border: "none", borderRadius: "var(--radius)", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "15px", cursor: "pointer", boxShadow: "var(--btn-shadow)" }}
        onClick={onKnock}
      >
        ✉ knock &amp; chat with me
      </button>
    </div>
  );
}

function Links({ profile, onSign }: { profile: Profile; onSign?: () => void }) {
  const social = profile.links.filter((l) => l.icon && l.url);
  return (
    <div style={{ width: "100%" }}>
      {social.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          {social.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" title={l.label} style={{ width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", background: "color-mix(in srgb, var(--panel) 80%, transparent)", border: "var(--border)", textDecoration: "none" }}>
              <Icon id={l.icon} size={19} />
            </a>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {profile.links.map((l) => {
          const inner = (
            <>
              <span style={{ width: "38px", height: "38px", borderRadius: "12px", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                {l.icon ? <Icon id={l.icon} size={18} /> : <span style={{ fontSize: "17px" }}>{l.emoji}</span>}
              </span>
              <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <span style={{ display: "block", fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
                {l.meta && <span style={{ display: "block", fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--ink-soft)" }}>{l.meta}</span>}
              </span>
              <span style={{ color: "var(--ink-soft)", flex: "0 0 auto" }}>{l.kind === "guest" ? "★" : "↗"}</span>
            </>
          );
          const cardStyle: CSSProperties = {
            ...surface(profile, { background: profile.cardless ? "color-mix(in srgb, var(--panel) 78%, transparent)" : "var(--panel-2)", boxShadow: profile.translucent ? undefined : "0 4px 14px -8px rgba(0,0,0,.4)" }),
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "var(--ink)",
            cursor: "pointer",
          };
          return l.url && l.kind !== "guest" ? (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={cardStyle}>{inner}</a>
          ) : (
            <div key={l.id} style={cardStyle} onClick={() => onSign?.()}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

function Guestbook({ entries, profile, onSign }: { entries: GuestEntry[]; profile: Profile; onSign?: () => void }) {
  return (
    <div style={{ width: "100%", marginTop: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "1.5px", color: "var(--ink-soft)" }}>★ GUESTBOOK · {entries.length} SOULS</span>
        <span style={{ flex: 1, height: "2px", background: "var(--line)", borderRadius: "2px" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {entries.map((g) => (
          <div key={g.id} style={{ ...surface(profile, { background: profile.cardless ? "color-mix(in srgb, var(--panel) 70%, transparent)" : "var(--panel-2)", boxShadow: profile.translucent ? undefined : "0 6px 16px -10px rgba(0,0,0,.4)" }), borderRadius: "16px", padding: "12px 14px", borderLeft: "3px solid " + g.color }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "5px" }}>
              <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: g.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontFamily: "var(--font-display)", flex: "0 0 auto" }}>{initOf(g.name)}</span>
              <span style={{ ...nameStyleFor(g.fx, 15), color: g.color }}>{g.name}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--ink-soft)" }}>{g.time}</span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "var(--ink)" }}>{g.text}</p>
          </div>
        ))}
      </div>
      <button onClick={onSign} style={{ width: "100%", marginTop: "12px", padding: "12px", border: "var(--border)", borderRadius: "var(--radius)", background: "color-mix(in srgb, var(--panel) 78%, transparent)", color: "var(--ink)", fontFamily: "var(--font-display)", fontSize: "13px", cursor: "pointer" }}>
        ✎ sign the guestbook
      </button>
    </div>
  );
}
