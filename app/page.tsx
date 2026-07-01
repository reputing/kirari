"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { THEMES, THEME_METAS, resolveThemeVars, type ThemeId } from "@/lib/themes";
import { getSession, signUp, signIn, handleAvailable } from "@/lib/auth";
import { listPages, type PublishedPage } from "@/lib/store";
import { nameStyleFor, bgFor, initOf } from "@/lib/styleHelpers";
import { DOMAINS, DEFAULT_DOMAIN } from "@/lib/domains";
import { INVITE_ONLY, INVITE_PRICE_USD, purchaseInvite } from "@/lib/invites";
import type { TextFx, BgPattern, PfpShape } from "@/lib/types";

// ============================================================================
// kirari.cafe — landing page.
// The whole thing lives inside a single re-skinnable theme root: pick a skin
// (or let it auto-cycle) and every surface morphs at once. The feature sections
// aren't screenshots — they're the real components running live.
// ============================================================================

const ORDER: ThemeId[] = ["sugar", "angel", "kuro", "ostan", "noir", "cyber"];

export default function Landing() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeId>("sugar");
  const [autoSkin, setAutoSkin] = useState(true);
  const pickTheme = (t: ThemeId) => { setAutoSkin(false); setTheme(t); };
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [domain, setDomain] = useState(DEFAULT_DOMAIN);
  const [session, setSession] = useState<{ handle: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    getSession().then(setSession);
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      if (q.get("signup") === "1") { setMode("signup"); setAuthOpen(true); }
      else if (q.get("login") === "1") { setMode("login"); setAuthOpen(true); }
    }
  }, []);

  // auto-cycle skins so the range is visible; stops once you pick one
  useEffect(() => {
    if (!autoSkin) return;
    const id = setInterval(() => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]), 4200);
    return () => clearInterval(id);
  }, [autoSkin]);

  const openAuth = (m: "login" | "signup") => { setMode(m); setAuthOpen(true); };
  const vars = THEMES[theme].vars as CSSProperties;

  return (
    <div style={{ ...vars, minHeight: "100vh", background: "var(--bg)", backgroundAttachment: "fixed", color: "var(--ink)", fontFamily: "var(--font-body)", position: "relative", overflowX: "hidden", transition: "background .6s ease" }}>
      <Sparkles />
      <Nav session={session} onAuth={openAuth} onDash={() => router.push("/dashboard")} />
      <Hero theme={theme} pickTheme={pickTheme} onClaim={() => openAuth("signup")} domain={domain} setDomain={setDomain} />
      <Pillars />
      <Features />
      <Domains domain={domain} setDomain={setDomain} onClaim={() => openAuth("signup")} />
      <SkinsGallery theme={theme} pickTheme={pickTheme} />
      <ExampleGallery />
      <Compare />
      <Faq />
      <BigCta onClaim={() => openAuth("signup")} domain={domain} setDomain={setDomain} />
      <Footer />
      {authOpen && <AuthDialog mode={mode} setMode={setMode} domain={domain} setDomain={setDomain} onClose={() => setAuthOpen(false)} onAuthed={() => router.push("/dashboard")} />}
    </div>
  );
}

// ---------------------------------------------------------------- primitives
function Container({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>;
}

function Reveal({ children, style, delayMs = 0 }: { children: React.ReactNode; style?: CSSProperties; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(26px)", transition: `opacity .65s ease ${delayMs}ms, transform .65s cubic-bezier(.2,.7,.2,1) ${delayMs}ms`, ...style }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "1.6px", color: "var(--ink-soft)", textTransform: "uppercase" }}>{children}</span>
      <span style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, color-mix(in srgb, var(--ink) 18%, transparent), transparent)" }} />
    </div>
  );
}

function SectionTitle({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: "34px" }}>
      <div style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "1.6px", color: "var(--accent)", textTransform: "uppercase", marginBottom: "10px" }}>{kicker}</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.08, margin: 0, color: "var(--ink)", letterSpacing: "-0.4px" }}>{title}</h2>
      {sub && <p style={{ fontSize: "15.5px", lineHeight: 1.6, color: "var(--ink-soft)", margin: "12px 0 0", maxWidth: "560px" }}>{sub}</p>}
    </div>
  );
}

function dot(c: string): CSSProperties {
  return { width: "9px", height: "9px", borderRadius: "50%", background: c, display: "inline-block" };
}

function TiltCard({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(820px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
  }
  function leave() { if (ref.current) ref.current.style.transform = "perspective(820px) rotateX(0deg) rotateY(0deg)"; }
  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={leave} style={{ transition: "transform .14s ease-out", transformStyle: "preserve-3d", willChange: "transform", ...style }}>
      {children}
    </div>
  );
}

function surface(extra?: CSSProperties): CSSProperties {
  return { background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", boxShadow: "0 18px 44px -26px rgba(0,0,0,.5)", ...extra };
}

// -------------------------------------------------------------------- nav
function Nav({ session, onAuth, onDash }: { session: { handle: string; isAdmin: boolean } | null; onAuth: (m: "login" | "signup") => void; onDash: () => void }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "color-mix(in srgb, var(--titlebar) 82%, transparent)", color: "var(--titlebar-ink)", borderBottom: "1px solid rgba(255,255,255,.18)" }}>
      <Container style={{ display: "flex", alignItems: "center", gap: "18px", height: "52px", padding: "0 24px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "17px" }}>✦ kirari.cafe</span>
        <a href="/explore" style={navLink}>explore</a>
        <a href="#features" style={navLink}>features</a>
        <a href="#skins" style={navLink}>skins</a>
        <div style={{ flex: 1 }} />
        {session ? (
          <>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", opacity: 0.95 }}>@{session.handle}{session.isAdmin ? " ★" : ""}</span>
            <button onClick={onDash} style={navBtn(true)}>open dashboard</button>
          </>
        ) : (
          <>
            <button onClick={() => onAuth("login")} style={navBtn(false)}>log in</button>
            <button onClick={() => onAuth("signup")} style={navBtn(true)}>claim handle</button>
          </>
        )}
      </Container>
    </div>
  );
}
const navLink: CSSProperties = { fontFamily: "var(--font-pixel)", fontSize: "11px", color: "inherit", textDecoration: "none", opacity: 0.8 };
function navBtn(primary: boolean): CSSProperties {
  return { border: primary ? "none" : "1px solid rgba(255,255,255,.5)", background: primary ? "rgba(255,255,255,.94)" : "transparent", color: primary ? "var(--accent)" : "var(--titlebar-ink)", fontFamily: "var(--font-display)", fontSize: "12.5px", padding: "6px 14px", borderRadius: "9px", cursor: "pointer" };
}

// -------------------------------------------------------------------- hero
function Hero({ theme, pickTheme, onClaim, domain, setDomain }: { theme: ThemeId; pickTheme: (t: ThemeId) => void; onClaim: () => void; domain: string; setDomain: (d: string) => void }) {
  const [handle, setHandle] = useState("");
  return (
    <Container style={{ paddingTop: "56px", paddingBottom: "36px" }}>
      <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,.95fr)", gap: "44px", alignItems: "center", minHeight: "74vh" }}>
        <div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "0.6px", color: "var(--ink-soft)", border: "var(--border)", borderRadius: "999px", padding: "6px 13px", marginBottom: "22px", background: "var(--panel)" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#5ed29a", boxShadow: "0 0 6px #5ed29a" }} />
            a bio link that boots like a desktop
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 6.4vw, 72px)", lineHeight: 1.0, margin: "0 0 20px", color: "var(--ink)", letterSpacing: "-1px" }}>
            your whole internet,<br />
            <span style={{ color: "var(--accent)" }}>one little window</span>
            <span style={{ animation: "blink 1.05s steps(1) infinite" }}> ▌</span>
          </h1>
          <p style={{ fontSize: "17px", lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: "480px", margin: "0 0 26px" }}>
            most link-in-bios are just a list. kirari is a little desktop you live in. your own music on load, draggable windows, video backdrops, and a door people can knock on to start talking.
          </p>
          <ClaimBar handle={handle} setHandle={setHandle} onClaim={onClaim} domain={domain} setDomain={setDomain} />
          <div style={{ display: "flex", gap: "7px", marginTop: "15px", flexWrap: "wrap" }}>
            {["free forever", "no email", "yours in 30s"].map((t) => (
              <span key={t} style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)", background: "var(--panel)", border: "var(--border)", borderRadius: "999px", padding: "5px 12px" }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginTop: "22px" }}>
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)" }}>SKIN</span>
            {ORDER.map((id) => (
              <button key={id} onClick={() => pickTheme(id)} title={THEME_METAS[id].name}
                style={{ width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", border: theme === id ? "2px solid var(--ink)" : "2px solid transparent", background: (THEMES[id].vars as Record<string, string>)["--accent"], boxShadow: "0 2px 6px -2px rgba(0,0,0,.35)", transition: "transform .15s", transform: theme === id ? "scale(1.16)" : "scale(1)" }} />
            ))}
          </div>
        </div>
        <HeroScene theme={theme} pickTheme={pickTheme} handle={handle || "yourname"} domain={domain} />
      </div>
    </Container>
  );
}

function ClaimBar({ handle, setHandle, onClaim, domain, setDomain }: { handle: string; setHandle: (v: string) => void; onClaim: () => void; domain: string; setDomain: (d: string) => void }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "stretch", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", padding: "8px", maxWidth: "470px", boxShadow: "var(--shadow)" }}>
      <select value={domain} onChange={(e) => setDomain(e.target.value)} title="pick your domain"
        style={{ border: "none", background: "transparent", outline: "none", color: "var(--ink-soft)", fontFamily: "var(--font-display)", fontSize: "14px", cursor: "pointer", maxWidth: "128px", paddingLeft: "8px" }}>
        {DOMAINS.filter((d) => !d.premium).map((d) => <option key={d.id} value={d.id}>{d.label}/</option>)}
      </select>
      <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s+/g, "").toLowerCase())} placeholder="yourname"
        style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: "15px", fontFamily: "var(--font-display)", color: "var(--ink)" }}
        onKeyDown={(e) => e.key === "Enter" && onClaim()} />
      <button onClick={onClaim} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "14px", padding: "0 20px", borderRadius: "calc(var(--radius) - 6px)", cursor: "pointer", boxShadow: "var(--btn-shadow)", whiteSpace: "nowrap" }}>claim it</button>
    </div>
  );
}

// A profile window with a chat window peeking behind it, tilted in perspective.
function HeroScene({ theme, pickTheme, handle, domain }: { theme: ThemeId; pickTheme: (t: ThemeId) => void; handle: string; domain: string }) {
  const [flat, setFlat] = useState(false);
  return (
    <div style={{ perspective: "1600px", display: "flex", justifyContent: "center", padding: "6px 0" }} onMouseEnter={() => setFlat(true)} onMouseLeave={() => setFlat(false)}>
      <div style={{ position: "relative", width: "320px", height: "450px", transformStyle: "preserve-3d", transform: flat ? "rotateY(0deg) rotateX(0deg)" : "rotateY(-13deg) rotateX(6deg)", transition: "transform .55s cubic-bezier(.2,.7,.2,1)" }}>
        <div style={surface({ position: "absolute", top: "78px", left: "-84px", width: "196px", transform: "translateZ(-80px) rotate(-5deg)", overflow: "hidden" })}>
          <div style={{ height: "26px", background: "var(--titlebar)", color: "var(--titlebar-ink)", display: "flex", alignItems: "center", padding: "0 9px", fontFamily: "var(--font-display)", fontSize: "10.5px" }}>✉ momo ♡</div>
          <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <Bubble>knock knock ♡</Bubble>
            <Bubble me>omg hi!!</Bubble>
            <Bubble>be my moot?</Bubble>
          </div>
        </div>
        <div style={surface({ position: "absolute", top: 0, right: 0, width: "292px", zIndex: 2, transform: "translateZ(40px)", overflow: "hidden" })}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", height: "30px", padding: "0 10px", background: "var(--titlebar)", color: "var(--titlebar-ink)" }}>
            <span style={{ fontSize: "10px" }}>❀</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "11.5px", flex: 1 }}>{domain}/@{handle}</span>
            <span style={dot("#ffd76b")} /><span style={dot("#7ee0a8")} /><span style={dot("#ff8fa0")} />
          </div>
          <div style={{ padding: "16px 14px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "58px", height: "58px", borderRadius: "18px", border: "3px solid var(--accent)", background: "repeating-linear-gradient(45deg, var(--panel-2), var(--panel-2) 6px, var(--tab-active) 6px, var(--tab-active) 12px)", marginBottom: "9px" }} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: "17px", color: "var(--accent)" }}>{handle}</div>
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)", marginTop: "3px" }}>♡ online</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
              {["✿ my links", "♫ now playing", "★ guestbook"].map((l) => (
                <div key={l} style={{ background: "var(--panel-2)", border: "var(--border)", borderRadius: "calc(var(--radius) - 8px)", padding: "8px 11px", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)" }}>{l}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "13px", flexWrap: "wrap" }}>
              {ORDER.map((id) => (
                <button key={id} onClick={() => pickTheme(id)} title={THEME_METAS[id].name}
                  style={{ width: "18px", height: "18px", borderRadius: "50%", cursor: "pointer", border: theme === id ? "2px solid var(--ink)" : "2px solid transparent", background: (THEMES[id].vars as Record<string, string>)["--accent"] }} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "8px", fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--ink-soft)" }}>tap a skin, hover to straighten</div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return <div style={{ alignSelf: me ? "flex-end" : "flex-start", background: me ? "var(--bubble-me)" : "var(--bubble-them)", color: me ? "var(--bubble-me-ink)" : "var(--bubble-them-ink)", borderRadius: "12px", [me ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: "4px", padding: "6px 9px", fontSize: "10px", maxWidth: "88%" } as CSSProperties}>{children}</div>;
}

// ----------------------------------------------------------------- pillars
function Pillars() {
  const items: { icon: string; title: string; body: string }[] = [
    { icon: "▤", title: "a room, not a list", body: "draggable windows, a dock, wallpaper, a taskbar. it's a tiny operating system, not another vertical stack of buttons." },
    { icon: "✉", title: "knock & chat, built in", body: "visitors knock from your page and you actually talk. real 1:1 DMs and group rooms with reactions and attachments." },
    { icon: "✦", title: "reskins in real time", body: "six built-in skins plus a full editor for your own palette, fonts and background. share it as a code." },
  ];
  return (
    <Container style={{ padding: "24px 24px 48px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {items.map((it, i) => (
          <Reveal key={it.title} delayMs={i * 90}>
            <div style={surface({ padding: "22px", height: "100%" })}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", marginBottom: "14px" }}>{it.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--ink)", marginBottom: "7px" }}>{it.title}</div>
              <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.55, color: "var(--ink-soft)" }}>{it.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Container>
  );
}

// ---------------------------------------------------------------- domains
function Domains({ domain, setDomain, onClaim }: { domain: string; setDomain: (d: string) => void; onClaim: () => void }) {
  const pick = DOMAINS.filter((d) => !d.premium);
  const premium = DOMAINS.filter((d) => d.premium);
  const ghosts = ["@velvet", "@moth", "@static", "@peony", "@0dd", "@lace", "@sable", "@quill", "@rue", "@vesper"];
  return (
    <Container style={{ padding: "44px 24px" }}>
      <Reveal>
        <div style={surface({ overflow: "hidden", background: "linear-gradient(150deg, color-mix(in srgb, var(--ink) 92%, #000), color-mix(in srgb, var(--ink) 78%, var(--accent)))" })}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "0" }}>
            {/* left: live preview with faded handles behind a search chip */}
            <div style={{ position: "relative", minHeight: "260px", padding: "30px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.14, pointerEvents: "none" }}>
                {ghosts.map((g, i) => (
                  <span key={g} style={{ position: "absolute", left: (i * 29 + 6) % 88 + "%", top: (i * 37 + 8) % 82 + "%", whiteSpace: "nowrap", color: "#fff", fontFamily: "var(--font-pixel)", fontSize: 11 + (i % 3) * 2 + "px" }}>
                    {pick[i % pick.length].label}/{g}
                  </span>
                ))}
              </div>
              <button onClick={onClaim} title="claim it" style={{ position: "relative", width: "86%", background: "var(--accent)", border: "none", borderRadius: "18px", padding: "16px", cursor: "pointer", boxShadow: "0 20px 50px -20px rgba(0,0,0,.7)" }}>
                <div style={{ background: "#fff", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#222", fontSize: "15px" }}>⌕</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#222" }}>{domain}/@yourname</span>
                </div>
              </button>
            </div>
            {/* right: the domain list */}
            <div style={{ padding: "34px 30px", color: "#fff" }}>
              <span style={{ display: "inline-block", fontFamily: "var(--font-pixel)", fontSize: "10px", letterSpacing: "1.6px", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.22)", borderRadius: "999px", padding: "5px 12px", marginBottom: "16px" }}>DOMAINS</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.2vw,38px)", margin: "0 0 12px", lineHeight: 1.05, letterSpacing: "-0.5px" }}>one handle, your pick of domains</h2>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,.7)", margin: "0 0 20px", maxWidth: "380px" }}>claim your name once and wear whichever domain fits your vibe. pick it at signup, change it whenever.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }}>
                {pick.map((d) => {
                  const on = domain === d.id;
                  return (
                    <button key={d.id} onClick={() => setDomain(d.id)} style={{ display: "flex", alignItems: "center", gap: "9px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 0" }}>
                      <span style={{ width: "18px", height: "18px", borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", background: on ? "var(--accent)" : "rgba(255,255,255,.16)", color: "#fff" }}>✓</span>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: on ? "#fff" : "rgba(255,255,255,.85)", fontWeight: on ? 700 : 400 }}>{d.label}</span>
                    </button>
                  );
                })}
                {premium.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "2px 0", opacity: 0.9 }}>
                    <span style={{ width: "18px", height: "18px", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#ffd76b" }}>♛</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#ffd76b" }}>{d.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "18px", color: "rgba(255,255,255,.7)", fontSize: "13px" }}>
                <span style={{ fontSize: "16px" }}>＋</span> and more to come
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Container>
  );
}

// ---------------------------------------------------------------- features
function Features() {
  return (
    <div id="features">
      <ShowcaseRow
        kicker="dress it up"
        title={<>customize <span style={{ color: "var(--accent)" }}>everything</span>, live</>}
        sub="portraits, name effects, page patterns, video backdrops. no menus of doom, just click and watch it change. this preview is the real editor running below."
        demo={<DemoDressUp />}
      />
      <ShowcaseRow
        kicker="knock & chat"
        title={<>they knock. <span style={{ color: "var(--accent)" }}>you answer.</span></>}
        sub="every visitor can start a conversation from your page. DMs, group rooms, reactions, read receipts, image drops. a bio link that talks back."
        demo={<DemoChat />}
        flip
      />
      <ShowcaseRow
        kicker="your sound on load"
        title={<>music the second <span style={{ color: "var(--accent)" }}>they land</span></>}
        sub="drop a track and it plays on visit with a live visualizer. no gate, no wall — your world starts the moment the page opens."
        demo={<DemoSound />}
      />
      <ShowcaseRow
        kicker="a guestbook worth signing"
        title={<>proof people <span style={{ color: "var(--accent)" }}>stopped by</span></>}
        sub="translucent cards, custom name effects, your background behind every signature. try it, it actually posts."
        demo={<DemoGuestbook />}
        flip
      />
    </div>
  );
}

function ShowcaseRow({ kicker, title, sub, demo, flip }: { kicker: string; title: React.ReactNode; sub: string; demo: React.ReactNode; flip?: boolean }) {
  return (
    <Container style={{ padding: "34px 24px" }}>
      <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "44px", alignItems: "center" }}>
        <Reveal style={{ order: flip ? 2 : 1 }}>
          <SectionTitle kicker={kicker} title={title} sub={sub} />
        </Reveal>
        <Reveal delayMs={120} style={{ order: flip ? 1 : 2, display: "flex", justifyContent: "center" }}>
          {demo}
        </Reveal>
      </div>
    </Container>
  );
}

// ---- demo 1: live customizer -------------------------------------------------
function DemoDressUp() {
  const bgs: BgPattern[] = ["dots", "grid", "gingham", "stripes", "hearts"];
  const fxs: TextFx[] = ["glow", "gradient", "neon", "aurora", "shimmer", "chrome"];
  const shapes: PfpShape[] = ["circle", "rounded"];
  const [bg, setBg] = useState<BgPattern>("hearts");
  const [fx, setFx] = useState<TextFx>("gradient");
  const [shape, setShape] = useState<PfpShape>("circle");
  return (
    <div style={surface({ width: "340px", maxWidth: "100%", overflow: "hidden" })}>
      <div style={{ height: "150px", position: "relative", ...bgFor(bg) }}>
        <div style={{ position: "absolute", left: "50%", bottom: "-30px", transform: "translateX(-50%)", width: "64px", height: "64px", borderRadius: shape === "circle" ? "50%" : "18px", border: "3px solid var(--accent)", background: "repeating-linear-gradient(45deg, var(--panel-2), var(--panel-2) 7px, var(--tab-active) 7px, var(--tab-active) 14px)", boxShadow: "var(--btn-shadow)" }} />
      </div>
      <div style={{ padding: "38px 16px 16px", textAlign: "center" }}>
        <h3 style={{ margin: 0, ...nameStyleFor(fx, 26) }}>aria</h3>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)", marginTop: "4px" }}>@aria ♡ online</div>
      </div>
      <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <ChipRow label="pattern" items={bgs} value={bg} onPick={(v) => setBg(v as BgPattern)} />
        <ChipRow label="name fx" items={fxs} value={fx} onPick={(v) => setFx(v as TextFx)} />
        <ChipRow label="portrait" items={shapes} value={shape} onPick={(v) => setShape(v as PfpShape)} />
      </div>
    </div>
  );
}
function ChipRow({ label, items, value, onPick }: { label: string; items: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", letterSpacing: "0.6px", color: "var(--ink-soft)", marginBottom: "5px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {items.map((it) => {
          const on = value === it;
          return <button key={it} onClick={() => onPick(it)} style={{ padding: "5px 10px", borderRadius: "999px", fontSize: "10.5px", cursor: "pointer", border: on ? "2px solid var(--accent)" : "var(--border)", background: on ? "var(--tab-active)" : "var(--panel-2)", color: on ? "var(--accent)" : "var(--ink)", fontWeight: on ? 700 : 400, fontFamily: "var(--font-body)" }}>{it}</button>;
        })}
      </div>
    </div>
  );
}

// ---- demo 2: live-typing chat -----------------------------------------------
function DemoChat() {
  const script = [
    { me: false, t: "knock knock ♡ found u thru ur guestbook" },
    { me: true, t: "omg hi!! tysm for knocking" },
    { me: false, t: "ur page is unreal, be moots?" },
    { me: true, t: "YES ♡ adding u right now" },
  ];
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !started.current) { started.current = true; run(); io.disconnect(); }
    }), { threshold: 0.4 });
    io.observe(el);
    let timers: ReturnType<typeof setTimeout>[] = [];
    function run() {
      let d = 400;
      script.forEach((_, i) => {
        timers.push(setTimeout(() => setTyping(true), d));
        d += 850;
        timers.push(setTimeout(() => { setTyping(false); setCount(i + 1); }, d));
        d += 550;
      });
    }
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} style={surface({ width: "320px", maxWidth: "100%", overflow: "hidden" })}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "34px", padding: "0 11px", background: "var(--titlebar)", color: "var(--titlebar-ink)", fontFamily: "var(--font-display)", fontSize: "12.5px" }}>✉ momo ♡</div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "220px", justifyContent: "flex-end" }}>
        {script.slice(0, count).map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
            <div style={{ background: m.me ? "var(--bubble-me)" : "var(--bubble-them)", color: m.me ? "var(--bubble-me-ink)" : "var(--bubble-them-ink)", borderRadius: "15px", [m.me ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: "5px", padding: "8px 12px", fontSize: "13px", lineHeight: 1.4, maxWidth: "80%" } as CSSProperties}>{m.t}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", gap: "4px", padding: "10px 12px", background: "var(--bubble-them)", borderRadius: "15px", borderBottomLeftRadius: "5px", alignSelf: "flex-start" }}>
            {[0, 0.2, 0.4].map((x, i) => <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--bubble-them-ink)", animation: `bounce 1.3s ease-in-out ${x}s infinite` }} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- demo 3: player with live visualizer ------------------------------------
function DemoSound() {
  const [playing, setPlaying] = useState(true);
  return (
    <div style={surface({ width: "320px", maxWidth: "100%", padding: "18px" })}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={() => setPlaying((p) => !p)} style={{ width: "46px", height: "46px", borderRadius: "50%", border: "none", background: "var(--accent)", color: "var(--on-accent)", cursor: "pointer", fontSize: "16px", flex: "0 0 auto", boxShadow: "var(--btn-shadow)" }}>{playing ? "❚❚" : "►"}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>strawberry moon</div>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)", marginTop: "2px" }}>{playing ? "♫ playing on load" : "paused"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "28px", flex: "0 0 auto" }}>
          {[0.2, 0.5, 0.35, 0.7, 0.45].map((_, i) => (
            <span key={i} style={{ width: "4px", height: "100%", background: "var(--accent)", borderRadius: "2px", transformOrigin: "bottom", animation: `eq ${0.7 + i * 0.15}s ease-in-out infinite`, animationPlayState: playing ? "running" : "paused", opacity: playing ? 1 : 0.4 }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: "16px", height: "6px", borderRadius: "999px", background: "var(--panel-2)", overflow: "hidden" }}>
        <div style={{ width: "44%", height: "100%", background: "var(--accent)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}><span>1:58</span><span>4:25</span></div>
    </div>
  );
}

// ---- demo 4: working guestbook ----------------------------------------------
function DemoGuestbook() {
  const palette = ["#ff7ec0", "#7cc0ff", "#67cbb0", "#c3a3ff", "#ffd36e"];
  const [entries, setEntries] = useState<{ name: string; text: string; color: string }[]>([
    { name: "ren", text: "first!! ur page is so cute omg", color: "#7cc0ff" },
    { name: "kaito", text: "the frosted card goes hard", color: "#67cbb0" },
  ]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  function sign() {
    if (!text.trim()) return;
    setEntries((e) => [{ name: name.trim() || "anon", text: text.trim(), color: palette[e.length % palette.length] }, ...e]);
    setText("");
  }
  return (
    <div style={surface({ width: "340px", maxWidth: "100%", overflow: "hidden" })}>
      <div style={{ padding: "13px", background: "var(--panel-2)", borderBottom: "var(--border)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", marginBottom: "8px" }}>leave a mark ♡</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="you" style={{ flex: "0 0 34%", minWidth: 0, border: "var(--border)", borderRadius: "10px", background: "var(--panel)", padding: "8px 10px", fontSize: "12px", color: "var(--ink)", outline: "none" }} />
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sign()} placeholder="say something sweet" style={{ flex: 1, minWidth: 0, border: "var(--border)", borderRadius: "10px", background: "var(--panel)", padding: "8px 10px", fontSize: "12px", color: "var(--ink)", outline: "none" }} />
          <button onClick={sign} style={{ border: "none", background: "var(--accent)", color: "var(--on-accent)", borderRadius: "10px", padding: "0 13px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "12.5px" }}>sign</button>
        </div>
      </div>
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "184px", overflowY: "auto" }}>
        {entries.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: "9px", alignItems: "flex-start", animation: i === 0 ? "popin .3s ease" : undefined }}>
            <span style={{ width: "26px", height: "26px", flex: "0 0 auto", borderRadius: "50%", background: g.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "var(--font-display)" }}>{initOf(g.name)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "12.5px", color: g.color }}>{g.name}</div>
              <div style={{ fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.4 }}>{g.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- skins gallery
function SkinsGallery({ theme, pickTheme }: { theme: ThemeId; pickTheme: (t: ThemeId) => void }) {
  return (
    <Container style={{ padding: "40px 24px" }} >
      <div id="skins" />
      <Reveal><SectionTitle kicker="skins" title={<>six skins, or <span style={{ color: "var(--accent)" }}>roll your own</span></>} sub="tap one to reskin this entire page. then open the editor and mix your own palette, fonts and background." /></Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        {ORDER.map((id, i) => {
          const m = THEME_METAS[id]; const v = THEMES[id].vars as Record<string, string>; const active = theme === id;
          return (
            <Reveal key={id} delayMs={i * 60}>
              <button onClick={() => pickTheme(id)} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "var(--panel)", border: active ? "2px solid var(--accent)" : "var(--border)", borderRadius: "var(--radius)", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: active ? "var(--btn-shadow)" : "none" }}>
                <div style={{ height: "48px", borderRadius: "12px", background: v["--bg"], border: "1px solid rgba(0,0,0,.06)" }} />
                <div style={{ display: "flex", gap: "5px" }}><span style={dot(v["--accent"])} /><span style={dot(v["--accent-2"])} /><span style={dot(v["--ink"])} /></div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--ink)" }}>{m.name}</div>
                  <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>{m.sub}</div>
                </div>
              </button>
            </Reveal>
          );
        })}
      </div>
    </Container>
  );
}

// ----------------------------------------------------- real example pages
function ExampleGallery() {
  const [pages, setPages] = useState<PublishedPage[]>([]);
  useEffect(() => { listPages(40).then(setPages).catch(() => {}); }, []);
  const shown = pages.filter((p) => p.profile.pfpUrl && !["you", "yuki"].includes(p.handle)).slice(0, 8);
  if (!shown.length) return null;
  return (
    <Container style={{ padding: "40px 24px" }}>
      <Reveal><SectionTitle kicker="in the wild" title={<>pages people <span style={{ color: "var(--accent)" }}>actually made</span></>} sub="real, live kirari pages. every card is themed in that person's own skin." /></Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
        {shown.map((p, i) => {
          const v = resolveThemeVars(p.theme, p.customThemes || []) as Record<string, string>;
          const P = p.profile;
          const frame = P.pfpColor && P.pfpColor !== "none" ? P.pfpColor : v["--accent"];
          return (
            <Reveal key={p.handle} delayMs={i * 50}>
              <a href={"/" + p.handle} style={{ textDecoration: "none" }}>
                <TiltCard style={{ ...(v as CSSProperties), background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "0 16px 34px -18px rgba(0,0,0,.5)", cursor: "pointer" }}>
                  <div style={{ height: "74px", background: v["--bg"], position: "relative" }}>
                    <div style={{ position: "absolute", left: "14px", bottom: "-22px", width: "46px", height: "46px", borderRadius: P.pfpShape === "circle" ? "50%" : "14px", border: "3px solid " + frame, background: P.pfpUrl ? `center/cover url(${P.pfpUrl})` : "var(--panel-2)" }} />
                  </div>
                  <div style={{ padding: "27px 14px 15px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{P.name || p.handle}</div>
                    <div style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)" }}>@{p.handle}</div>
                    {P.bio && <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{P.bio.replace(/\s*·\s*/g, ", ")}</div>}
                  </div>
                </TiltCard>
              </a>
            </Reveal>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: "18px" }}>
        <a href="/explore" style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}>browse everyone →</a>
      </div>
    </Container>
  );
}

// ------------------------------------------------------------------ compare
function Compare() {
  const rows = [
    ["one scrollable list of links", "a desktop with windows you arrange"],
    ["static, same as everyone", "reskins live, six themes plus your own"],
    ["no way to reach you", "knock to chat, DMs and group rooms"],
    ["their logo on your page", "your audio, your wallpaper, your guestbook"],
    ["a link, and that's it", "a little corner of the web you own"],
  ];
  return (
    <Container style={{ padding: "40px 24px" }}>
      <Reveal><SectionTitle kicker="the difference" title={<>a link list, or <span style={{ color: "var(--accent)" }}>a place</span></>} /></Reveal>
      <Reveal delayMs={100}>
        <div style={surface({ overflow: "hidden" })}>
          {rows.map(([a, b], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: i ? "var(--border)" : "none" }}>
              <div style={{ padding: "15px 18px", fontSize: "13.5px", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: "9px", borderRight: "var(--border)" }}>
                <span style={{ color: "var(--ink-soft)", opacity: 0.6 }}>✕</span> {a}
              </div>
              <div style={{ padding: "15px 18px", fontSize: "13.5px", color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "9px", background: "color-mix(in srgb, var(--accent) 7%, transparent)" }}>
                <span style={{ color: "var(--accent)" }}>✦</span> {b}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Container>
  );
}

// ---------------------------------------------------------------------- faq
function Faq() {
  const qa = [
    ["is it actually free?", "yes. free forever, no email and no card. claim a handle and you're in."],
    ["do i need to know how to code?", "no. everything is drag, click and pick. the skin editor is sliders and swatches, not css."],
    ["can i use my own music and video?", "yep. upload a track that plays on load and a video or image backdrop for your page."],
    ["how do people message me?", "they knock from your page. you answer in DMs or spin up a group room, with reactions and image drops."],
    ["can i make my own theme?", "the skin editor mixes your palette, fonts and background, then hands you a code to share or reuse."],
  ];
  const [open, setOpen] = useState(0);
  return (
    <Container style={{ padding: "40px 24px" }}>
      <Reveal><SectionTitle kicker="questions" title={<>the short <span style={{ color: "var(--accent)" }}>answers</span></>} /></Reveal>
      <Reveal delayMs={100}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "760px" }}>
          {qa.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={surface({ overflow: "hidden" })}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "15px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "var(--font-display)", fontSize: "15px" }}>
                  <span style={{ flex: 1 }}>{q}</span>
                  <span style={{ color: "var(--accent)", fontSize: "18px", transition: "transform .2s", transform: isOpen ? "rotate(45deg)" : "none" }}>＋</span>
                </button>
                <div style={{ maxHeight: isOpen ? "160px" : "0", overflow: "hidden", transition: "max-height .3s ease" }}>
                  <p style={{ margin: 0, padding: "0 18px 16px", fontSize: "13.5px", lineHeight: 1.6, color: "var(--ink-soft)" }}>{a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </Container>
  );
}

// ---------------------------------------------------------------- big cta
function BigCta({ onClaim, domain, setDomain }: { onClaim: () => void; domain: string; setDomain: (d: string) => void }) {
  const [handle, setHandle] = useState("");
  return (
    <Container style={{ padding: "30px 24px 60px" }}>
      <Reveal>
        <div style={surface({ padding: "clamp(36px, 6vw, 64px) 24px", textAlign: "center", position: "relative", overflow: "hidden" })}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 50% -20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "1.5px", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: "14px" }}>ready when you are</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 48px)", margin: "0 0 22px", color: "var(--ink)", letterSpacing: "-0.5px" }}>
              boot up your page <span style={{ color: "var(--accent)" }}>in 30 seconds</span>
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ClaimBar handle={handle} setHandle={setHandle} onClaim={onClaim} domain={domain} setDomain={setDomain} />
            </div>
          </div>
        </div>
      </Reveal>
    </Container>
  );
}

// ------------------------------------------------------------------- footer
function Footer() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <footer style={{ position: "relative", zIndex: 2, marginTop: "20px" }}>
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "22px", padding: "28px", ...surface({ boxShadow: "0 12px 30px -18px rgba(0,0,0,.35)" }) }}>
          <div style={{ minWidth: "220px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--accent)" }}>✦ kirari.cafe</div>
            <p style={{ fontSize: "13px", color: "var(--ink-soft)", lineHeight: 1.55, marginTop: "8px", maxWidth: "300px" }}>a bio link that boots like a little desktop. claim a handle and it becomes your own room on the web.</p>
          </div>
          <FooterCol title="explore" links={[["browse pages", "/explore"], ["claim a handle", "/?signup=1"], ["log in", "/?login=1"]]} />
          <FooterCol title="your desk" links={[["dashboard", "/dashboard"], ["make a skin", "/?signup=1"], ["knock & chat", "/?signup=1"]]} />
          <FooterCol title="the page" links={[["features", "#features"], ["skins", "#skins"], ["questions", "#"]]} />
        </div>
      </Container>
      <div style={{ marginTop: "12px", height: "42px", display: "flex", alignItems: "center", gap: "10px", padding: "0 14px", background: "var(--titlebar)", color: "var(--titlebar-ink)", fontFamily: "var(--font-pixel)", fontSize: "11px", borderTop: "2px solid rgba(255,255,255,.4)" }}>
        <a href="/?signup=1" style={{ background: "var(--accent-2)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "12px", padding: "4px 12px", borderRadius: "5px", textDecoration: "none", boxShadow: "inset 1px 1px 0 rgba(255,255,255,.4)" }}>▣ start</a>
        <a href="/explore" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>explore</a>
        <a href="#skins" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>skins</a>
        <span style={{ flex: 1 }} />
        <span>© kirari.cafe</span>
        <span style={{ background: "rgba(0,0,0,.16)", padding: "4px 10px", borderRadius: "5px" }}>◷ {clock}</span>
      </div>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "10px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {links.map(([label, href]) => <a key={label} href={href} style={{ fontSize: "13px", color: "var(--ink)", textDecoration: "none", opacity: 0.85 }}>{label}</a>)}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- auth dialog
function AuthDialog({ mode, setMode, domain, setDomain, onClose, onAuthed }: { mode: "login" | "signup"; setMode: (m: "login" | "signup") => void; domain: string; setDomain: (d: string) => void; onClose: () => void; onAuthed: () => void }) {
  const [handle, setHandle] = useState(""); const [pw, setPw] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [buying, setBuying] = useState(false); const [bought, setBought] = useState("");
  const [avail, setAvail] = useState<null | boolean>(null);
  useEffect(() => {
    if (mode !== "signup" || !handle.trim()) { setAvail(null); return; }
    let alive = true;
    const t = setTimeout(async () => { const ok = await handleAvailable(handle); if (alive) setAvail(ok); }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [handle, mode]);
  async function buy() {
    setErr(""); setBuying(true);
    const res = await purchaseInvite();
    setBuying(false);
    if (res.ok && res.code) { setInvite(res.code); setBought(res.code); }
    else setErr(res.error || "couldn't start checkout");
  }
  async function handleAuth() {
    setErr("");
    if (!handle.trim() || !pw.trim()) { setErr("fill in your handle and password"); return; }
    setBusy(true);
    const res = mode === "signup" ? await signUp(handle, pw, invite) : await signIn(handle, pw);
    if (!res.ok) { setErr(res.error || "something went wrong"); setBusy(false); return; }
    try {
      const h = handle.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
      window.localStorage.setItem(mode === "signup" ? "kirari:signupHandle" : "kirari:lastHandle", h);
      if (mode === "signup") window.localStorage.setItem("kirari:signupDomain", domain);
    } catch { /* */ }
    onAuthed();
  }
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,8,16,.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "380px", maxWidth: "100%", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "34px", padding: "0 12px", background: "var(--titlebar)", color: "var(--titlebar-ink)" }}>
          <span style={{ fontSize: "11px" }}>✦</span>
          <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "12.5px" }}>{mode === "signup" ? "claim-handle.exe" : "log-in.exe"}</span>
          <button onClick={onClose} style={{ width: "20px", height: "18px", border: "none", borderRadius: "6px", background: "rgba(255,255,255,.18)", color: "var(--titlebar-ink)", cursor: "pointer", fontSize: "10px", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "18px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {(["signup", "login"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "9px", borderRadius: "11px", border: mode === m ? "2px solid var(--accent)" : "var(--border)", background: mode === m ? "var(--tab-active)" : "var(--panel-2)", color: "var(--ink)", fontFamily: "var(--font-display)", fontSize: "13px", cursor: "pointer" }}>{m === "signup" ? "claim handle" : "log in"}</button>
            ))}
          </div>
          <Field label={mode === "signup" ? "DOMAIN + HANDLE" : "HANDLE"}>
            <div style={{ display: "flex", alignItems: "center", border: "var(--border)", borderRadius: "11px", background: "var(--panel-2)", padding: "0 10px" }}>
              {mode === "signup" ? (
                <select value={domain} onChange={(e) => setDomain(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", color: "var(--ink-soft)", fontFamily: "var(--font-display)", fontSize: "13px", cursor: "pointer", maxWidth: "122px" }}>
                  {DOMAINS.filter((d) => !d.premium).map((d) => <option key={d.id} value={d.id}>{d.label}/</option>)}
                </select>
              ) : (
                <span style={{ color: "var(--ink-soft)", fontSize: "13px", fontFamily: "var(--font-display)" }}>kirari.cafe/</span>
              )}
              <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s+/g, "").toLowerCase())} placeholder="yourname" style={{ ...field(), border: "none", background: "transparent", padding: "9px 4px" }} onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
            </div>
          </Field>
          {mode === "signup" && handle.trim() && avail !== null && (
            <div style={{ fontSize: "11px", margin: "-6px 0 10px", color: avail ? "#3bbf86" : "var(--accent)" }}>{avail ? "✓ available, it's yours!" : "✕ that handle is taken"}</div>
          )}
          <Field label="PASSWORD"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" style={field()} onKeyDown={(e) => e.key === "Enter" && handleAuth()} /></Field>
          {mode === "signup" && INVITE_ONLY && (
            <Field label="INVITE CODE">
              <input value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} placeholder="KIRA-XXX-XXX" style={field()} onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "7px" }}>
                <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9.5px", color: "var(--ink-soft)" }}>invite-only. got a code?</span>
                <button type="button" onClick={buy} disabled={buying} style={{ border: "none", background: "transparent", color: "var(--accent)", fontFamily: "var(--font-display)", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>{buying ? "starting…" : `buy one — $${INVITE_PRICE_USD}`}</button>
              </div>
              {bought && <div style={{ fontSize: "11px", color: "#3bbf86", marginTop: "6px" }}>✓ code {bought} added. claim your handle to use it.</div>}
            </Field>
          )}
          {err && <div style={{ fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>{err}</div>}
          <button onClick={handleAuth} disabled={busy || (mode === "signup" && avail === false)} style={{ width: "100%", padding: "12px", border: "none", borderRadius: "11px", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "14px", cursor: busy ? "wait" : "pointer", boxShadow: "var(--btn-shadow)", opacity: busy || (mode === "signup" && avail === false) ? 0.6 : 1 }}>
            {busy ? "booting…" : mode === "signup" ? "claim it & enter" : "enter"}
          </button>
          <div style={{ textAlign: "center", marginTop: "12px", fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)" }}>{mode === "signup" ? "invite-only, no email needed" : "welcome back"}</div>
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
  return { width: "100%", border: "var(--border)", borderRadius: "11px", background: "var(--panel-2)", padding: "9px 12px", fontSize: "13.5px", color: "var(--ink)", outline: "none", fontFamily: "var(--font-body)" };
}

// --------------------------------------------------------------- ambience
function Sparkles() {
  const [spans, setSpans] = useState<{ left: string; top: string; size: string; delay: string; char: string }[]>([]);
  useEffect(() => {
    const chars = ["✦", "✧", "♡", "★", "✿"];
    setSpans(Array.from({ length: 20 }).map((_, i) => ({
      left: ((i * 41 + 7) % 100) + "%", top: ((i * 23 + 11) % 100) + "%", size: 8 + (i % 4) * 4 + "px", delay: (i % 6) * -0.9 + "s", char: chars[i % chars.length],
    })));
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      {spans.map((s, i) => (
        <span key={i} style={{ position: "absolute", left: s.left, top: s.top, fontSize: s.size, color: "var(--deco)", opacity: 0.4, textShadow: "0 0 8px currentColor", animation: `twinkle 3s ease-in-out ${s.delay} infinite` }}>{s.char}</span>
      ))}
    </div>
  );
}
