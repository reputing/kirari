"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { THEMES, THEME_METAS, type ThemeId } from "@/lib/themes";

// ============================================================================
// kirari.cafe — landing page.
// Concept: the page IS a desktop you boot into. A draggable welcome window,
// a live re-skinnable biolink preview, and a retro login/signup dialog, all on
// the dreamy wallpaper. No backend yet — auth is faked and routes to the
// dashboard; structured so Supabase Auth drops in at handleAuth().
// ============================================================================

const ORDER: ThemeId[] = ["sugar", "angel", "kuro", "ostan"];

export default function Landing() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeId>("sugar");
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");

  const T = THEMES[theme];
  const vars = T.vars as CSSProperties;

  return (
    <div
      style={{
        ...vars,
        minHeight: "100vh",
        background: "var(--bg)",
        backgroundAttachment: "fixed",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <Sparkles />
      <MenuBar
        onGetStarted={() => { setMode("signup"); setAuthOpen(true); }}
        onLogin={() => { setMode("login"); setAuthOpen(true); }}
      />

      <main style={{ position: "relative", zIndex: 2, maxWidth: "1140px", margin: "0 auto", padding: "0 24px" }}>
        <Hero theme={theme} setTheme={setTheme} onClaim={() => { setMode("signup"); setAuthOpen(true); }} />
        <Marquee />
        <FeatureWindows />
        <SkinStrip theme={theme} setTheme={setTheme} />
        <BootCta onClaim={() => { setMode("signup"); setAuthOpen(true); }} />
      </main>

      <FooterBar />

      {authOpen && (
        <AuthDialog
          mode={mode}
          setMode={setMode}
          onClose={() => setAuthOpen(false)}
          onAuthed={() => router.push("/dashboard")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- menu bar
function MenuBar({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) {
  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: "16px",
        height: "38px", padding: "0 16px", background: "var(--titlebar)", color: "var(--titlebar-ink)",
        borderBottom: "2px solid rgba(255,255,255,.4)", fontFamily: "var(--font-pixel)", fontSize: "12px",
      }}
    >
      <span style={{ fontFamily: "var(--font-display)", fontSize: "15px" }}>✦ kirari.cafe</span>
      <div style={{ flex: 1 }} />
      <button onClick={onLogin} style={menuBtn(false)}>log in</button>
      <button onClick={onGetStarted} style={menuBtn(true)}>claim handle</button>
    </div>
  );
}
function menuBtn(primary: boolean): CSSProperties {
  return {
    border: primary ? "none" : "1px solid rgba(255,255,255,.55)",
    background: primary ? "rgba(255,255,255,.92)" : "transparent",
    color: primary ? "var(--accent)" : "var(--titlebar-ink)",
    fontFamily: "var(--font-display)", fontSize: "12px", padding: "4px 12px", borderRadius: "8px", cursor: "pointer",
  };
}

// -------------------------------------------------------------------- hero
function Hero({ theme, setTheme, onClaim }: { theme: ThemeId; setTheme: (t: ThemeId) => void; onClaim: () => void }) {
  const [handle, setHandle] = useState("");
  return (
    <section className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,.95fr)", gap: "40px", alignItems: "center", minHeight: "76vh", paddingTop: "54px" }}>
      <div>
        <span style={{ display: "inline-block", fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "1px", color: "var(--ink-soft)", border: "var(--border)", borderRadius: "999px", padding: "5px 12px", marginBottom: "20px", background: "var(--panel)" }}>
          ✦ a biolink that boots like a desktop
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(38px, 6vw, 66px)", lineHeight: 1.02, margin: "0 0 18px", color: "var(--ink)", letterSpacing: "-0.5px" }}>
          your whole internet,<br />
          <span style={{ color: "var(--accent)" }}>one little window</span>
          <span style={{ animation: "blink 1.05s steps(1) infinite" }}> ▌</span>
        </h1>
        <p style={{ fontSize: "16.5px", lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: "480px", margin: "0 0 26px" }}>
          claim a handle, dress up your page with your own audio, video backdrops and 100+ icons, then knock-and-chat with whoever signs your guestbook. it&apos;s your room on the web — drag the furniture wherever you like.
        </p>
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", padding: "8px", maxWidth: "440px", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", paddingLeft: "12px", color: "var(--ink-soft)", fontFamily: "var(--font-display)", fontSize: "14px", whiteSpace: "nowrap" }}>
            kirari.cafe/
          </div>
          <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s+/g, "").toLowerCase())} placeholder="yourname"
            style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: "15px", fontFamily: "var(--font-display)", color: "var(--ink)" }}
            onKeyDown={(e) => e.key === "Enter" && onClaim()} />
          <button onClick={onClaim} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "14px", padding: "0 18px", borderRadius: "calc(var(--radius) - 6px)", cursor: "pointer", boxShadow: "var(--btn-shadow)", whiteSpace: "nowrap" }}>
            claim it ♡
          </button>
        </div>
        <div style={{ marginTop: "14px", fontFamily: "var(--font-pixel)", fontSize: "11px", color: "var(--ink-soft)" }}>
          free forever · no card · 2.8k pages booted today
        </div>
      </div>
      <PreviewWindow theme={theme} setTheme={setTheme} handle={handle || "yuki"} />
    </section>
  );
}

// ---------------------------------------------------- draggable preview window
function PreviewWindow({ theme, setTheme, handle }: { theme: ThemeId; setTheme: (t: ThemeId) => void; handle: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  function onDown(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev: MouseEvent) => { if (!drag.current) return; setPos({ x: ev.clientX - drag.current.dx, y: ev.clientY - drag.current.dy }); };
    const up = () => { drag.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  }
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <div ref={ref} style={{ width: "340px", maxWidth: "100%", transform: `translate(${pos.x}px, ${pos.y}px)`, background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div onMouseDown={onDown} style={{ display: "flex", alignItems: "center", gap: "8px", height: "32px", padding: "0 10px", background: "var(--titlebar)", color: "var(--titlebar-ink)", cursor: "grab", userSelect: "none" }}>
          <span style={{ fontSize: "11px" }}>❀</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "12.5px", flex: 1 }}>kirari.cafe/@{handle}</span>
          <span style={dot("#ffd76b")} /><span style={dot("#7ee0a8")} /><span style={dot("#ff8fa0")} />
        </div>
        <div style={{ padding: "18px 16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: "66px", height: "66px", borderRadius: "20px", border: "3px solid var(--accent)", background: "repeating-linear-gradient(45deg, var(--panel-2), var(--panel-2) 6px, var(--tab-active) 6px, var(--tab-active) 12px)", marginBottom: "10px" }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--accent)" }}>{handle} ☆彡</div>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)", marginTop: "3px" }}>♡ sleepy + online</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "14px" }}>
            {["✿ my art gallery", "♫ now playing: dream pop", "★ sign my guestbook"].map((l) => (
              <div key={l} style={{ background: "var(--panel-2)", border: "var(--border)", borderRadius: "calc(var(--radius) - 8px)", padding: "9px 12px", fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>{l}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "16px" }}>
            {ORDER.map((id) => (
              <button key={id} onClick={() => setTheme(id)} title={THEME_METAS[id].name}
                style={{ width: "20px", height: "20px", borderRadius: "50%", cursor: "pointer", border: theme === id ? "2px solid var(--ink)" : "2px solid transparent", background: (THEMES[id].vars as Record<string, string>)["--accent"], boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "9px", fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>↑ try a skin · drag the window ✦</div>
        </div>
      </div>
    </div>
  );
}
function dot(c: string): CSSProperties {
  return { width: "9px", height: "9px", borderRadius: "50%", background: c, display: "inline-block" };
}

// ----------------------------------------------------------------- marquee
function Marquee() {
  const items = "♡ drag-and-drop windows ✦ your own audio player ✦ video backgrounds ✦ 100+ social icons ✦ guestbooks ✦ knock-to-chat ✦ group rooms ✦ make-your-own skins ♡";
  return (
    <div style={{ margin: "10px 0 50px", border: "var(--border)", borderRadius: "999px", background: "var(--panel)", overflow: "hidden", whiteSpace: "nowrap", fontFamily: "var(--font-pixel)", fontSize: "12px", color: "var(--ink-soft)" }}>
      <div style={{ display: "inline-block", padding: "9px 0", animation: "marq 22s linear infinite" }}>
        <span style={{ paddingRight: "40px" }}>{items}</span><span style={{ paddingRight: "40px" }}>{items}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- feature windows
function FeatureWindows() {
  const feats = [
    { icon: "✎", title: "dress it up", body: "portraits, charms, name effects, page patterns, video & gif backdrops. pick from 100+ platform icons or upload your own." },
    { icon: "♫", title: "your sound on load", body: "drop in a track and it plays the moment someone opens your page. no click-to-enter gate — they land right in your world." },
    { icon: "✉", title: "knock & chat", body: "visitors knock, you answer. dm 1:1 or spin up group rooms, react to messages, send stickers and attachments." },
    { icon: "★", title: "a guestbook worth signing", body: "translucent cards, custom name effects, your background behind every signature. proof people stopped by." },
  ];
  return (
    <section style={{ marginBottom: "56px" }}>
      <Eyebrow>what&apos;s inside</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))", gap: "16px" }}>
        {feats.map((f) => (
          <div key={f.title} style={{ background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "0 10px 26px -18px rgba(0,0,0,.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "30px", padding: "0 10px", background: "var(--titlebar)", color: "var(--titlebar-ink)", fontFamily: "var(--font-display)", fontSize: "12px" }}>
              <span>{f.icon}</span><span style={{ flex: 1 }}>{f.title}.exe</span><span style={{ fontSize: "10px", opacity: 0.8 }}>▢ ✕</span>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", marginBottom: "7px", color: "var(--ink)" }}>{f.title}</div>
              <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.55, color: "var(--ink-soft)" }}>{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------- skins strip
function SkinStrip({ theme, setTheme }: { theme: ThemeId; setTheme: (t: ThemeId) => void }) {
  return (
    <section style={{ marginBottom: "56px" }}>
      <Eyebrow>four skins, or roll your own</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
        {ORDER.map((id) => {
          const m = THEME_METAS[id]; const v = THEMES[id].vars as Record<string, string>; const active = theme === id;
          return (
            <button key={id} onClick={() => setTheme(id)} style={{ textAlign: "left", cursor: "pointer", background: "var(--panel)", border: active ? "2px solid var(--accent)" : "var(--border)", borderRadius: "var(--radius)", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ height: "44px", borderRadius: "12px", background: v["--bg"], border: "1px solid rgba(0,0,0,.06)" }} />
              <div style={{ display: "flex", gap: "5px" }}><span style={dot(v["--accent"])} /><span style={dot(v["--accent-2"])} /><span style={dot(v["--ink"])} /></div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--ink)" }}>{m.name}</div>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>{m.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: "14px", fontSize: "13px", color: "var(--ink-soft)", textAlign: "center" }}>
        not enough? the skin editor lets you mix your own palette, fonts and background — then share it as a code ✦
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- boot CTA
function BootCta({ onClaim }: { onClaim: () => void }) {
  return (
    <section style={{ textAlign: "center", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", padding: "44px 24px", marginBottom: "56px", boxShadow: "var(--shadow)" }}>
      <div style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", color: "var(--ink-soft)", marginBottom: "10px" }}>✦ ready when you are</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,4vw,40px)", margin: "0 0 18px", color: "var(--ink)" }}>
        boot up your page <span style={{ color: "var(--accent)" }}>in 30 seconds</span>
      </h2>
      <button onClick={onClaim} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "16px", padding: "13px 30px", borderRadius: "var(--radius)", cursor: "pointer", boxShadow: "var(--btn-shadow)" }}>
        claim your handle ♡
      </button>
    </section>
  );
}

// ------------------------------------------------------------------- footer
function FooterBar() {
  return (
    <div style={{ position: "relative", zIndex: 2, marginTop: "10px", height: "40px", display: "flex", alignItems: "center", gap: "10px", padding: "0 16px", background: "var(--titlebar)", color: "var(--titlebar-ink)", fontFamily: "var(--font-pixel)", fontSize: "11px", borderTop: "2px solid rgba(255,255,255,.4)" }}>
      <span style={{ background: "var(--accent-2)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "12px", padding: "3px 11px", borderRadius: "5px" }}>▣ start</span>
      <span style={{ flex: 1 }}>made with ♡ for the old web</span>
      <span>kirari.cafe</span>
    </div>
  );
}

// --------------------------------------------------------------- auth dialog
function AuthDialog({ mode, setMode, onClose, onAuthed }: { mode: "login" | "signup"; setMode: (m: "login" | "signup") => void; onClose: () => void; onAuthed: () => void }) {
  const [email, setEmail] = useState(""); const [handle, setHandle] = useState(""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  // SWAP POINT: replace with Supabase Auth (signUp + insert profile / signInWithPassword).
  function handleAuth() {
    setErr("");
    if (!email.trim() || !pw.trim() || (mode === "signup" && !handle.trim())) { setErr("fill everything in to continue ♡"); return; }
    setBusy(true); setTimeout(() => onAuthed(), 650);
  }
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(40,20,40,.34)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "380px", maxWidth: "100%", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "32px", padding: "0 10px", background: "var(--titlebar)", color: "var(--titlebar-ink)" }}>
          <span style={{ fontSize: "11px" }}>✦</span>
          <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "12.5px" }}>{mode === "signup" ? "claim-handle.exe" : "log-in.exe"}</span>
          <button onClick={onClose} style={{ width: "19px", height: "17px", border: "1px solid rgba(255,255,255,.5)", borderRadius: "3px", background: "rgba(255,255,255,.15)", color: "var(--titlebar-ink)", cursor: "pointer", fontSize: "10px", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "18px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {(["signup", "login"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", borderRadius: "calc(var(--radius) - 10px)", border: mode === m ? "2px solid var(--accent)" : "var(--border)", background: mode === m ? "var(--tab-active)" : "var(--panel-2)", color: "var(--ink)", fontFamily: "var(--font-display)", fontSize: "13px", cursor: "pointer" }}>
                {m === "signup" ? "claim handle" : "log in"}
              </button>
            ))}
          </div>
          <Field label="EMAIL"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={field()} /></Field>
          {mode === "signup" && (
            <Field label="HANDLE">
              <div style={{ display: "flex", alignItems: "center", border: "var(--border)", borderRadius: "calc(var(--radius) - 10px)", background: "var(--panel-2)", padding: "0 10px" }}>
                <span style={{ color: "var(--ink-soft)", fontSize: "13px", fontFamily: "var(--font-display)" }}>kirari.cafe/</span>
                <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s+/g, "").toLowerCase())} placeholder="yourname" style={{ ...field(), border: "none", background: "transparent", padding: "9px 4px" }} />
              </div>
            </Field>
          )}
          <Field label="PASSWORD"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" style={field()} onKeyDown={(e) => e.key === "Enter" && handleAuth()} /></Field>
          {err && <div style={{ fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>{err}</div>}
          <button onClick={handleAuth} disabled={busy} style={{ width: "100%", padding: "12px", border: "none", borderRadius: "calc(var(--radius) - 8px)", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "14px", cursor: busy ? "wait" : "pointer", boxShadow: "var(--btn-shadow)", opacity: busy ? 0.8 : 1 }}>
            {busy ? "booting…" : mode === "signup" ? "claim it & enter ♡" : "enter ♡"}
          </button>
          <div style={{ textAlign: "center", marginTop: "12px", fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)" }}>
            {mode === "signup" ? "no card · free forever" : "welcome back ✦"}
          </div>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "12px" }}>
      <span style={{ display: "block", fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)", marginBottom: "5px", letterSpacing: "0.5px" }}>{label}</span>
      {children}
    </label>
  );
}
function field(): CSSProperties {
  return { width: "100%", border: "var(--border)", borderRadius: "calc(var(--radius) - 10px)", background: "var(--panel-2)", padding: "9px 12px", fontSize: "13.5px", color: "var(--ink)", outline: "none", fontFamily: "var(--font-body)" };
}

// ------------------------------------------------------------------ helpers
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "1.5px", color: "var(--ink-soft)", textTransform: "uppercase" }}>✦ {children}</span>
      <span style={{ flex: 1, height: "2px", background: "var(--line)", borderRadius: "2px" }} />
    </div>
  );
}
function Sparkles() {
  const [spans, setSpans] = useState<{ left: string; top: string; size: string; delay: string; char: string }[]>([]);
  useEffect(() => {
    const chars = ["✦", "✧", "♡", "★", "✿"];
    setSpans(Array.from({ length: 22 }).map((_, i) => ({
      left: ((i * 41 + 7) % 100) + "%", top: ((i * 23 + 11) % 100) + "%", size: 9 + (i % 4) * 4 + "px", delay: (i % 6) * -0.9 + "s", char: chars[i % chars.length],
    })));
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      {spans.map((s, i) => (
        <span key={i} style={{ position: "absolute", left: s.left, top: s.top, fontSize: s.size, color: "var(--deco)", opacity: 0.5, textShadow: "0 0 8px currentColor", animation: `twinkle 3s ease-in-out ${s.delay} infinite` }}>{s.char}</span>
      ))}
    </div>
  );
}
