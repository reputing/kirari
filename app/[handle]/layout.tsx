import type { Metadata } from "next";

// Per-handle link-preview metadata. Uses the handle from the URL so a shared
// kirari.cafe/<handle> link shows a tailored title/description in Discord,
// Twitter, iMessage, etc. (Full per-user OG images would need a server fetch;
// this gives correct titles without one.)
export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const handle = decodeURIComponent(params.handle || "").toLowerCase();
  const title = `@${handle} · kirari.cafe`;
  const description = `visit @${handle}'s little corner of the web ♡ — a kirari.cafe page.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `https://kirari.cafe/${handle}`, type: "profile", siteName: "kirari.cafe" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function HandleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
