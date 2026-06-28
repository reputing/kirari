"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { loadPage, addGuestbookEntry, loadGuestbook, bumpView, bumpReaction, loadStats, type PublishedPage } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { knock } from "@/lib/chat";
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
  const [wipe, setWipe] = useState(false);
  const [stats, setStats] = useState<{ views: number; reactions: number }>({ views: 0, reactions: 0 });
  const [reacted, setReacted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [authPrompt, setAuthPrompt] = useState<null | "knock" | "sign">(null);
  const [session, setSession] = useState<{ handle: string; isAdmin: boolean } | null>(null);
  useEffect(() => { getSession().then(setSession); }, []);

  const [signOpen, setSignOpen] = useState(false);

  function gated(kind: "knock" | "sign") {
    if (session) {
      if (kind === "sign") setSignOpen(true);
      else doKnock();
    } else {
      setAuthPrompt(kind);
    }
  }

  async function doKnock() {
    if (!session) return;
    const res = await knock(session.handle, handle);
    if (res.ok) alert(`✦ you knocked on @${handle}'s door! check your chats — they'll see it too.`);
    else alert(res.error || "couldn't knock right now");
  }

  async function postComment(text: string, color: string) {
    if (!session || !page) return;
    const entry = {
      id: Date.now(),
      person: session.handle,
      name: session.handle,
      text,
      time: "just now",
      color,
      fx: "none" as const,
    };
    try {
      const updated = await addGuestbookEntry(handle, entry);
      if (updated) setPage({ ...page, guestbook: updated });
      setSignOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "couldn't post right now");
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPage(handle);
      if (!alive) return;
      setPage(p); // null = unclaimed handle → 404 view
      if (p) {
        // merge visitor-signed guestbook entries (separate table) with seeded ones
        const visitor = await loadGuestbook(handle);
        if (visitor.length) setPage({ ...p, guestbook: [...visitor, ...(p.guestbook || [])].slice(0, 200) });
        // real stats: bump the view once per load, restore prior reaction state
        const alreadyReacted = (() => { try { return localStorage.getItem("kirari:reacted:" + handle.toLowerCase()) === "1"; } catch { return false; } })();
        setReacted(alreadyReacted);
        const views = await bumpView(handle);
        const cur = await loadStats(handle);
        setStats({ views: views || cur.views, reactions: cur.reactions });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [handle]);

  async function toggleReaction() {
    const next = !reacted;
    setReacted(next);
    try { localStorage.setItem("kirari:reacted:" + handle.toLowerCase(), next ? "1" : "0"); } catch { /* */ }
    const total = await bumpReaction(handle, next ? 1 : -1);
    setStats((s) => ({ ...s, reactions: total }));
  }

  function enter() {
    // Everything that needs a user gesture must happen synchronously inside
    // this click: load the file, start playback, build the Web Audio graph, and
    // resume the context. Browsers start contexts SUSPENDED and only a
    // gesture-initiated resume produces sound. Building the graph here (not
    // lazily in the visualizer) means the reroute can never cut audio.
    const a = audioRef.current;
    if (a && page?.profile.audioUrl) {
      a.volume = 0.6;
      a.muted = false;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.catch(() => { setTimeout(() => { a.play().catch(() => {}); }, 60); });
      }
      // build/resume the audio graph now, inside the gesture
      try {
        const holder = a as unknown as { _kirariAudio?: { ctx: AudioContext; analyser: AnalyserNode } };
        if (!holder._kirariAudio) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AC();
          const src = ctx.createMediaElementSource(a);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          analyser.connect(ctx.destination);
          holder._kirariAudio = { ctx, analyser };
        }
        const ctx = holder._kirariAudio.ctx;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch { /* cross-origin or unsupported — plain playback still works */ }
    }
    // mount the real page beneath a vertical "anime" wipe, then peel the bars
    // away to reveal it. The page is live underneath the whole time, so the
    // cutscene is always visible (it never plays into an empty/black screen).
    setEntered(true);
    setWipe(true);
    setTimeout(() => setWipe(false), 1050);
  }

  if (loading) return (
    <div style={{ "--bg": "#0e0e12", "--ink": "#e8e8ef", "--ink-soft": "#8a8a99", "--deco": "#6a6a7a", "--accent": "#9a8cff" } as CSSProperties}>
      <BootSplash handle={handle} ready={false} onEnter={() => {}} />
    </div>
  );
  if (!page) return <NotFound handle={handle} />;

  const baseVars = resolveThemeVars(page.theme, page.customThemes) as Record<string, string>;
  const themeVars: CSSProperties = { ...baseVars };
  if (page.fontDisplay) (themeVars as Record<string, string>)["--font-display"] = page.fontDisplay;
  if (page.fontBody) (themeVars as Record<string, string>)["--font-body"] = page.fontBody;

  return (
    <div style={themeVars}>
      {/* audio element exists before enter so the click can start it */}
      {page.profile.audioUrl && <audio ref={audioRef} src={page.profile.audioUrl} crossOrigin="anonymous" loop preload="auto" />}

      {!entered && <BootSplash handle={handle} ready onEnter={enter} profile={page.profile} />}

      {/* anime-style vertical wipe — horizontal bars cover the screen, then peel
          up/down to reveal the page mounted beneath. */}
      {wipe && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", pointerEvents: "none" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ flex: 1, background: "var(--accent, #9a8cff)", transformOrigin: i % 2 === 0 ? "top" : "bottom", animation: `wipeReveal .7s cubic-bezier(.76,0,.24,1) ${i * 0.07}s forwards` }} />
          ))}
        </div>
      )}

      {entered && (
        <>
          <AudioToggle audioRef={audioRef} profile={page.profile} />
          <BioPageView
            data={{ theme: page.theme, customThemes: page.customThemes, mood: page.mood, profile: page.profile, guestbook: page.guestbook, fontDisplay: page.fontDisplay, fontBody: page.fontBody }}
            animate
            stats={stats}
            reacted={reacted}
            onReact={toggleReaction}
            onKnock={() => gated("knock")}
            onSign={() => gated("sign")}
          />
          {authPrompt && <AuthPrompt kind={authPrompt} handle={handle} onClose={() => setAuthPrompt(null)} />}
          {signOpen && session && <SignComposer onPost={postComment} onClose={() => setSignOpen(false)} />}
        </>
      )}
    </div>
  );
}

// ---- animated enter splash ----
// Guestbook comment composer for signed-in visitors.
function SignComposer({ onPost, onClose }: { onPost: (text: string, color: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#ff7ec0");
  const palette = ["#ff7ec0", "#7cc0ff", "#67cbb0", "#c3a3ff", "#ffd36e", "#ff8fa0"];
  const [busy, setBusy] = useState(false);
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(30,15,30,.42)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "360px", maxWidth: "100%", background: "var(--panel)", border: "var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "22px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "17px", marginBottom: "10px", color: "var(--ink)" }}>✎ sign the guestbook</div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          placeholder="leave something nice ♡"
          rows={3}
          style={{ width: "100%", border: "var(--border)", borderRadius: "12px", background: "var(--panel-2)", padding: "10px 12px", fontSize: "13px", color: "var(--ink)", outline: "none", resize: "none", fontFamily: "var(--font-body)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "7px", margin: "10px 0 14px" }}>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: "9px", color: "var(--ink-soft)" }}>COLOR</span>
          {palette.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{ width: "20px", height: "20px", borderRadius: "50%", background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", border: "var(--border)", borderRadius: "var(--radius)", background: "var(--panel-2)", color: "var(--ink-soft)", cursor: "pointer", fontSize: "13px" }}>cancel</button>
          <button
            disabled={!text.trim() || busy}
            onClick={() => { setBusy(true); onPost(text.trim(), color); }}
            style={{ flex: 2, padding: "11px", border: "none", borderRadius: "var(--radius)", background: "var(--accent)", color: "var(--on-accent)", fontFamily: "var(--font-display)", fontSize: "14px", cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() && !busy ? 1 : 0.6, boxShadow: "var(--btn-shadow)" }}
          >
            {busy ? "posting…" : "post ♡"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
        background: "var(--bg, #0e0e12)",
        overflow: "hidden",
        transition: "background .3s ease",
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
      onClick={() => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
          const ctx = (a as unknown as { _kirariAudio?: { ctx: AudioContext } })._kirariAudio?.ctx;
          if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
          a.play().catch(() => {});
        } else {
          a.pause();
        }
      }}
      title={playing ? "pause" : "play"}
      style={{ position: "fixed", top: "16px", left: "16px", zIndex: 20, display: "flex", alignItems: "center", gap: "9px", padding: "8px 14px 8px 10px", background: "var(--panel)", border: "var(--border)", borderRadius: "999px", cursor: "pointer", color: "var(--ink)", boxShadow: "var(--shadow)", maxWidth: "210px" }}
    >
      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", fontSize: "12px" }}>{playing ? "❚❚" : "►"}</span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.2, textAlign: "left" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.audioTitle || "now playing"}</span>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: "8px", color: "var(--ink-soft)" }}>{playing ? "♫ playing" : "paused"}</span>
      </span>
      {playing && <Visualizer audioRef={audioRef} />}
    </button>
  );
}

// Real-time bars driven by the actual audio via WebAudio AnalyserNode.
function Visualizer({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement> }) {
  const [levels, setLevels] = useState<number[]>([0.3, 0.3, 0.3, 0.3]);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let analyser: AnalyserNode | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;
    try {
      // A MediaElementSource can be created ONCE per element, ever. Re-creating
      // it throws and can permanently mute the element. Cache the audio graph on
      // the element so remounts reuse it instead of rewiring.
      const cached = (a as unknown as { _kirariAudio?: { ctx: AudioContext; analyser: AnalyserNode } })._kirariAudio;
      let ctx: AudioContext;
      if (cached) {
        ctx = cached.ctx;
        analyser = cached.analyser;
      } else {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        const src = ctx.createMediaElementSource(a);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        (a as unknown as { _kirariAudio?: unknown })._kirariAudio = { ctx, analyser };
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      return; // wiring blocked (e.g. cross-origin) — bars stay idle, audio unaffected
    }
    const tick = () => {
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const bins = [2, 6, 11, 18];
        setLevels(bins.map((b) => Math.max(0.15, (data![b] || 0) / 255)));
      }
      raf.current = requestAnimationFrame(tick);
    };
    tick();
    // NOTE: we do NOT close the context on unmount — closing kills the cached
    // graph and would mute the element. Just stop the animation loop.
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [audioRef]);

  return (
    <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px", flex: "0 0 auto" }}>
      {levels.map((v, i) => (
        <span key={i} style={{ width: "3px", background: "var(--accent)", height: `${Math.round(v * 100)}%`, borderRadius: "2px", transition: "height .08s linear" }} />
      ))}
    </span>
  );
}
