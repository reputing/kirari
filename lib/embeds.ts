// Convert a normal share URL into an embeddable iframe spec. Supports the big
// three (Spotify, YouTube, SoundCloud). Returns null when a URL can't embed.

export interface EmbedSpec {
  src: string;
  height: number;
  provider: "spotify" | "youtube" | "soundcloud";
}

export function toEmbed(url?: string): EmbedSpec | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");

  // Spotify: open.spotify.com/{type}/{id}
  if (host === "open.spotify.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const [type, id] = parts;
      const tall = type === "playlist" || type === "album" || type === "artist";
      return { src: `https://open.spotify.com/embed/${type}/${id}`, height: tall ? 352 : 152, provider: "spotify" };
    }
  }

  // YouTube: youtu.be/{id} or youtube.com/watch?v={id}
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id) return { src: `https://www.youtube.com/embed/${id}`, height: 200, provider: "youtube" };
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v");
    if (id) return { src: `https://www.youtube.com/embed/${id}`, height: 200, provider: "youtube" };
  }

  // SoundCloud: needs the oEmbed player with the full track URL
  if (host === "soundcloud.com") {
    return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff7ec0&visual=false`, height: 166, provider: "soundcloud" };
  }

  return null;
}

export function isEmbeddable(url?: string): boolean {
  return toEmbed(url) !== null;
}
