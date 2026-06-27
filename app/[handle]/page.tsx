"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { loadPage, type PublishedPage } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { resolveThemeVars } from "@/lib/themes";
import BioPageView from "@/components/BioPageView";
import type { Profile } from "@/lib/types";

// ============================================================================
// Public biolink page — kirari.cafe/<handle>.
//   1. load the owner's real saved page (Supabase → localStorage → demo)
//   2. show an animated "click to enter" splash
//   3. on enter: start the audio (satisfies autoplay rules) + run the reveal
// ============================================================================

export default function PublicPage() {
  const params = useParams();
  const handle = (Array.isArray(params.handle) ? params.handle[0] : params.handle || "").toLowerCase();

  const [page, setPage] = useState<PublishedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [authPrompt, setAuthPrompt] = useState<null | "knock" | "sign">(null);
  const [session, setSession] = useState<{ handle: string; isAdmin: boolean } | null>(null);
  useEffect(() => { getSession().then(setSession); }, []);

  function gated(kind: "knock" | "sign") {
    if (session) {
      alert(kind === "knock" ? "✦ knock sent! (chat coming soon)" : "✦ comment posted! (saving soon)");
    } else {
      setAuthPrompt(kind);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPage(handle);
      if (!alive) return;
      setPage(p); // null = unclaimed handle → 404 view
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [handle]);

  function enter() {
    // starting audio from inside the click guarantees it plays (no autoplay block)
    const a = audioRef.current;
    if (a && page?.profile.audioUrl) {
      a.volume = 0.6;
      a.play().catch(() => {});
    }
    setEntered(true);
  }

  if (loading) return <BootSplash handle={handle} ready={false} onEnter={() => {}} />;
  if (!page) return <NotFound handle={handle} />;

  const baseVars = resolveThemeVars(page.theme, page.customThemes) as Record<string, string>;
  const themeVars: CSSProperties = { ...baseVars };
  if (page.fontDisplay) (themeVars as Record<string, string>)["--font-display"] = page.fontDisplay;
  if (page.fontBody) (themeVars as Record<string, string>)["--font-body"] = page.fontBody;

  return (
    <div style={themeVars}>
      {/* audio element exists before enter so the click can start it */}
      {page.profile.audioUrl && <audio ref={audioRef} src={page.profile.audioUrl} loop />}

      {!entered && <BootSplash handle={handle} ready onEnter={enter} profile={page.profile} />}

      {entered && (
        <>
          <AudioToggle audioRef={audioRef} profile={page.profile} />
          <BioPageView
            data={{ theme: page.theme, customThemes: page.customThemes, mood: page.mood, profile: page.profile, guestbook: page.guestbook, fontDisplay: page.fontDisplay, fontBody: page.fontBody }}
            animate
            onKnock={() => gated("knock")}
            onSign={() => gated("sign")}
          />
          {authPrompt && <AuthPrompt kind={authPrompt} handle={handle} onClose={() => setAuthPrompt(null)} />}
        </>
      )}
    </div>
  );
}

// ---- animated enter splash ----
// A gentle in-page sign-in prompt (no ugly redirect) for knock/comment.
function AuthPrompt({ kind, handle, onClose }: { kind: "knock" | "sign"; handle: string; onClose: () => void }) {
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(30,15,30,.42)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "330px", maxWidth: "100%", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "26px 22px", textAlign: "center" }}>
        <div style={{ fontSize: "34px", marginBottom: "6px" }}>{kind === "knock" ? "✉" : "✎"}</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--ink)", marginBottom: "8px" }}>
          {kind === "knock" ? `knock on @${handle}'s door?` : `sign @${handle}'s guestbook?`}
        </div>
        <p style={{ fontSize: "13px", color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 20px" }}>
          you&apos;ll need a kirari account first — it&apos;s free and takes a sec ♡
        </p>
        <a href="/?signup=1" style={{ display: "block", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "14px", padding: "12px", borderRadius: "var(--radius)", textDecoration: "none", marginBottom: "8px", boxShadow: "var(--btn-shadow)" }}>
            claim my handle ♡
        </a>
        <a href="/?login=1" style={{ display: "block", fontFamily: "var(--font-pixel)", fontSize: "11px", color: "var(--ink-soft)", padding: "6px" }}>
          already have one? log in
        </a>
        <button onClick={onClose} style={{ marginTop: "4px", border: "none", background: "transparent", color: "var(--ink-soft)", fontFamily: "var(--font-pixel)", fontSize: "10px", cursor: "pointer" }}>maybe later</button>
      </div>
    </div>
  );
}

// Unclaimed handle → clean 404 that doubles as a claim prompt.
function NotFound({ handle }: { handle: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(165deg,#ffe6f3,#f3ecff,#e7f7ff)", fontFamily: "'Zen Maru Gothic', sans-serif", padding: "20px" }}>
      <div style={{ textAlign: "center", color: "#8a5d7e", maxWidth: "360px" }}>
        <div style={{ fontFamily: "'Mochiy Pop P One', sans-serif", fontSize: "64px", color: "#ff7ec0", lineHeight: 1 }}>404</div>
        <div style={{ fontFamily: "'DotGothic16', monospace", fontSize: "12px", color: "#bd92b3", margin: "10px 0 18px" }}>
          nobody lives at kirari.cafe/{handle} yet
        </div>
        <div style={{ fontSize: "14px", lineHeight: 1.5, marginBottom: "22px" }}>
          this handle is <b style={{ color: "#3bbf86" }}>available</b> — want it?
        </div>
        <a href={"/?signup=1"} style={{ display: "inline-block", background: "#ff7ec0", color: "#fff", fontFamily: "'Mochiy Pop P One', sans-serif", fontSize: "14px", padding: "12px 26px", borderRadius: "999px", textDecoration: "none", boxShadow: "0 8px 22px -8px rgba(0,0,0,.4)" }}>
          ✦ claim @{handle}
        </a>
        <div style={{ marginTop: "16px" }}>
          <a href="/" style={{ fontFamily: "'DotGothic16', monospace", fontSize: "11px", color: "#bd92b3" }}>← back to kirari.cafe</a>
        </div>
      </div>
    </div>
  );
}

function BootSplash({ handle, ready, onEnter, profile }: { handle: string; ready: boolean; onEnter: () => void; profile?: Profile }) {
  const hasBgMedia = profile && (profile.pageBgType === "image" || profile.pageBgType === "video") && profile.pageBgUrl;
  return (
    <div
      onClick={ready ? onEnter : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        cursor: ready ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, linear-gradient(165deg,#ffe6f3,#f3ecff,#e7f7ff))",
        overflow: "hidden",
      }}
    >
      {/* blurred preview of the page's own background behind the splash */}
      {hasBgMedia && profile!.pageBgType === "image" && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${profile!.pageBgUrl})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(18px) brightness(.6)", transform: "scale(1.1)" }} />
      )}
      {hasBgMedia && profile!.pageBgType === "video" && (
        <video src={profile!.pageBgUrl} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(.6)", transform: "scale(1.1)" }} />
      )}

      {/* drifting sparkles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} style={{ position: "absolute", left: ((i * 53 + 11) % 100) + "%", top: ((i * 31 + 7) % 100) + "%", fontSize: 8 + (i % 4) * 5 + "px", color: "var(--deco, #ffb8da)", opacity: 0.6, textShadow: "0 0 8px currentColor", animation: `twinkle 3s ease-in-out ${(i % 5) * -0.6}s infinite` }}>✦</span>
      ))}

      <div style={{ position: "relative", textAlign: "center", color: "var(--ink, #b06a92)" }}>
        <div style={{ fontFamily: "var(--font-display, 'Mochiy Pop P One', sans-serif)", fontSize: "clamp(30px,7vw,52px)", marginBottom: "8px", animation: "popin .6s cubic-bezier(.2,.8,.2,1)" }}>
          @{handle}
        </div>
        <div style={{ fontFamily: "var(--font-pixel, 'DotGothic16', monospace)", fontSize: "12px", color: "var(--ink-soft, #c79bb6)", marginBottom: "28px" }}>
          {ready ? "a little corner of the web ♡" : "loading…"}
        </div>
        {ready ? (
          <button
            onClick={onEnter}
            style={{
              border: "none",
              background: "var(--accent, #ff7ec0)",
              color: "var(--on-accent, #fff)",
              fontFamily: "var(--font-display, sans-serif)",
              fontSize: "16px",
              padding: "13px 34px",
              borderRadius: "999px",
              cursor: "pointer",
              boxShadow: "0 8px 22px -8px rgba(0,0,0,.45)",
              animation: "glowpulse 2s ease-in-out infinite",
            }}
          >
            ✦ click to enter ✦
          </button>
        ) : (
          <div style={{ fontSize: "26px", animation: "twinkle 1.1s ease-in-out infinite", color: "var(--accent, #ff7ec0)" }}>✦</div>
        )}
        {ready && profile?.audioUrl && (
          <div style={{ marginTop: "16px", fontFamily: "var(--font-pixel, monospace)", fontSize: "10px", color: "var(--ink-soft, #c79bb6)" }}>
            ♫ {profile.audioTitle || "music"} — plays on enter
          </div>
        )}
      </div>
    </div>
  );
}

// ---- floating audio toggle (after enter) ----
function AudioToggle({ audioRef, profile }: { audioRef: React.RefObject<HTMLAudioElement>; profile: Profile }) {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    a.addEventListener("play", on);
    a.addEventListener("pause", off);
    return () => { a.removeEventListener("play", on); a.removeEventListener("pause", off); };
  }, [audioRef]);

  if (!profile.audioUrl) return null;
  return (
    <button
      onClick={() => { const a = audioRef.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause(); }}
      title={playing ? "pause" : "play"}
      style={{ position: "fixed", top: "16px", left: "16px", zIndex: 20, display: "flex", alignItems: "center", gap: "9px", padding: "8px 14px 8px 10px", background: "var(--panel)", border: "var(--border)", borderRadius: "999px", cursor: "pointer", color: "var(--ink)", boxShadow: "var(--shadow)", maxWidth: "210px" }}
    >
      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", fontSize: "12px" }}>{playing ? "❚❚" : "►"}</span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.2, textAlign: "left" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.audioTitle || "now playing"}</span>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)" }}>{playing ? "♫ playing" : "paused"}</span>
      </span>
      {playing && (
        <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px", flex: "0 0 auto" }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <span key={i} style={{ width: "3px", background: "var(--accent)", height: "100%", borderRadius: "2px", animation: `eq .8s ease-in-out ${d}s infinite` }} />
          ))}
        </span>
      )}
    </button>
  );
}
