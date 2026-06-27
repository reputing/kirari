"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { listPages, type PublishedPage } from "@/lib/store";
import { resolveThemeVars } from "@/lib/themes";
import { initOf } from "@/lib/styleHelpers";

// Public directory of claimed kirari pages — newest first, with a shuffle.
export default function Explore() {
  const [pages, setPages] = useState<PublishedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => { listPages(60).then((p) => { setPages(p); setLoading(false); }); }, []);

  const list = shuffled ? [...pages].sort(() => Math.random() - 0.5) : pages;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg,#ffe6f3,#f3ecff,#e7f7ff)", fontFamily: "'Zen Maru Gothic', sans-serif", padding: "0 0 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 22px", position: "sticky", top: 0, zIndex: 10, background: "rgba(255,255,255,.7)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,140,200,.2)" }}>
        <a href="/" style={{ fontFamily: "'Mochiy Pop P One', sans-serif", fontSize: "18px", color: "#ff5fa8", textDecoration: "none" }}>✦ kirari.cafe</a>
        <span style={{ fontFamily: "'DotGothic16', monospace", fontSize: "12px", color: "#bd92b3" }}>/ explore</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShuffled((s) => !s)} style={{ border: "none", background: "#ff7ec0", color: "#fff", fontFamily: "'Mochiy Pop P One', sans-serif", fontSize: "12px", padding: "8px 16px", borderRadius: "999px", cursor: "pointer" }}>
          ⤮ {shuffled ? "newest" : "shuffle"}
        </button>
      </div>

      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "26px 18px 0" }}>
        <h1 style={{ fontFamily: "'Mochiy Pop P One', sans-serif", fontSize: "30px", color: "#b06a92", margin: "0 0 4px" }}>discover little corners ♡</h1>
        <p style={{ fontFamily: "'DotGothic16', monospace", fontSize: "12px", color: "#bd92b3", margin: "0 0 24px" }}>
          {loading ? "loading pages…" : `${pages.length} pages and counting`}
        </p>

        {!loading && pages.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#bd92b3" }}>
            no pages yet — <a href="/?signup=1" style={{ color: "#ff5fa8" }}>be the first ✦</a>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
          {list.map((p) => <Card key={p.handle} page={p} />)}
        </div>
      </div>
    </div>
  );
}

function Card({ page }: { page: PublishedPage }) {
  const vars = resolveThemeVars(page.profile.pageTheme || page.theme, page.customThemes) as CSSProperties;
  const P = page.profile;
  return (
    <a href={"/" + page.handle} style={{ ...vars, display: "block", textDecoration: "none", background: "var(--panel)", border: "var(--border)", borderRadius: "18px", overflow: "hidden", boxShadow: "0 10px 26px -16px rgba(0,0,0,.4)", transition: "transform .15s ease" }}>
      <div style={{ height: "70px", background: P.pageBgType === "image" && P.pageBgUrl ? `center/cover url(${P.pageBgUrl})` : "var(--accent)", opacity: 0.9 }} />
      <div style={{ padding: "0 14px 16px", marginTop: "-26px" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: P.pfpShape === "circle" ? "50%" : "16px", border: "3px solid var(--panel)", background: P.pfpUrl ? `center/cover url(${P.pfpUrl})` : "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", color: "var(--accent)", fontSize: "20px" }}>
          {P.pfpUrl ? "" : initOf(P.name)}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--ink)", marginTop: "8px" }}>{P.name}</div>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "10px", color: "var(--ink-soft)" }}>@{page.handle}</div>
        {P.bio && <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{P.bio}</div>}
      </div>
    </a>
  );
}
