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
// Loads the owner's REAL saved page from the shared store (Supabase if
// configured, else localStorage) and renders it via the shared BioPageView
// with the sequential reveal animation + the audio player.
// ============================================================================

export default function PublicPage() {
  const params = useParams();
  const handle = (Array.isArray(params.handle) ? params.handle[0] : params.handle || "").toLowerCase();

  const [page, setPage] = useState<PublishedPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPage(handle);
      if (!alive) return;
      if (p) {
        setPage(p);
      } else {
        // no saved page for this handle yet — show the seed as a friendly demo
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
    return () => {
      alive = false;
    };
  }, [handle]);

  if (loading || !page) return <BootSplash handle={handle} />;

  const themeVars = resolveThemeVars(page.theme, page.customThemes) as CSSProperties;

  return (
    <div style={themeVars}>
      <AudioPlayer profile={page.profile} />
      <BioPageView
        data={{ theme: page.theme, customThemes: page.customThemes, mood: page.mood, profile: page.profile, guestbook: page.guestbook }}
        animate
        onKnock={() => alert("✦ knocking opens a chat once you're signed in!")}
        onSign={() => alert("✦ sign in to leave a note!")}
      />
    </div>
  );
}

// brief boot splash while the page loads (also covers the reveal's first beat)
function BootSplash({ handle }: { handle: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(165deg,#ffe6f3,#f3ecff,#e7f7ff)", fontFamily: "'DotGothic16', monospace" }}>
      <div style={{ textAlign: "center", color: "#bd92b3" }}>
        <div style={{ fontSize: "26px", marginBottom: "10px", animation: "twinkle 1.1s ease-in-out infinite" }}>✦</div>
        <div style={{ fontSize: "12px" }}>opening @{handle}…</div>
      </div>
    </div>
  );
}

// ---- audio player: plays on load, graceful unmute fallback ----
function AudioPlayer({ profile }: { profile: Profile }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const hasTrack = !!profile.audioUrl;

  useEffect(() => {
    if (!hasTrack) return;
    const a = ref.current;
    if (!a) return;
    a.volume = 0.6;
    a.play().then(() => setPlaying(true), () => setNeedsTap(true));
  }, [hasTrack]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().then(() => { setPlaying(true); setNeedsTap(false); }, () => {});
    else { a.pause(); setPlaying(false); }
  }

  if (!hasTrack) return null;

  return (
    <>
      <audio ref={ref} src={profile.audioUrl} loop />
      <button onClick={toggle} title={playing ? "pause" : "play"} style={btnStyle}>
        <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", fontSize: "12px" }}>
          {playing ? "❚❚" : "►"}
        </span>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.2, textAlign: "left" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.audioTitle || "now playing"}</span>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)" }}>{needsTap ? "tap to play ♪" : playing ? "♫ playing" : "paused"}</span>
        </span>
        {playing && (
          <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px", flex: "0 0 auto" }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <span key={i} style={{ width: "3px", background: "var(--accent)", height: "100%", borderRadius: "2px", animation: `eq .8s ease-in-out ${d}s infinite` }} />
            ))}
          </span>
        )}
      </button>
    </>
  );
}

const btnStyle: CSSProperties = {
  position: "fixed",
  top: "16px",
  left: "16px",
  zIndex: 6,
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "8px 14px 8px 10px",
  background: "var(--panel)",
  border: "var(--border)",
  borderRadius: "999px",
  cursor: "pointer",
  color: "var(--ink)",
  boxShadow: "var(--shadow)",
  maxWidth: "210px",
};
