"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { loadPage, type PublishedPage } from "@/lib/store";
import { resolveThemeVars } from "@/lib/themes";
import { makeInitialState } from "@/lib/seed";
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPage(handle);
      if (!alive) return;
      if (p) setPage(p);
      else {
        const seed = makeInitialState();
        setPage({
          handle,
          theme: seed.theme,
          customThemes: seed.customThemes,
          mood: seed.mood,
          profile: { ...seed.profile, handle: handle || seed.profile.handle },
          guestbook: seed.guestbook,
          updatedAt: Date.now(),
        });
      }
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

  if (loading || !page) return <BootSplash handle={handle} ready={false} onEnter={() => {}} />;

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
            onKnock={() => { window.location.href = "/?signup=1"; }}
            onSign={() => { window.location.href = "/?signup=1"; }}
          />
        </>
      )}
    </div>
  );
}

// ---- animated enter splash ----
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
