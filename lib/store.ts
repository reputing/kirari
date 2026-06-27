"use client";

// ============================================================================
// Shared persistence for the published biolink page.
//
// The dashboard saves the owner's profile here on every edit; the public page
// (/[handle]) reads it back. Two backends behind one interface:
//   • Supabase  — when NEXT_PUBLIC_SUPABASE_* are set (multi-device, real)
//   • localStorage — otherwise (same browser, zero backend, instant)
//
// Both store the SAME shape, so flipping on Supabase needs no app changes.
// ============================================================================

import { supabase, supabaseConfigured } from "./supabase/client";
import type { Profile, CustomTheme, GuestEntry } from "./types";

// What a published page needs to render. Mirrors the columns in schema.sql.
export interface PublishedPage {
  handle: string;
  theme: string;
  customThemes: CustomTheme[];
  fontDisplay?: string;
  fontBody?: string;
  mood: string;
  profile: Profile;
  guestbook: GuestEntry[];
  updatedAt: number;
}

const LS_PREFIX = "kirari:page:";
const lsKey = (handle: string) => LS_PREFIX + handle.toLowerCase();

// Lightweight client-side rate limit. Returns false if the action keyed by
// `id` happened within `windowMs`. NOTE: this is a UX guard, not real abuse
// protection — server-side limits still matter, but this stops casual spam.
// Human relative time: "just now", "5m", "3h", "2d", or a date.
export function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  if (s < 604800) return Math.floor(s / 86400) + "d";
  return new Date(ts).toLocaleDateString();
}

// Lightweight client-side rate limit. Returns false if the action keyed by
// `id` happened within `windowMs`. NOTE: UX guard, not real abuse protection.
function rateOk(id: string, windowMs: number): boolean {
  try {
    const k = "kirari:rl:" + id;
    const last = Number(localStorage.getItem(k) || 0);
    const now = Date.now();
    if (now - last < windowMs) return false;
    localStorage.setItem(k, String(now));
    return true;
  } catch {
    return true;
  }
}

// ---- save -----------------------------------------------------------------
export async function savePage(page: PublishedPage): Promise<void> {
  const handle = page.handle.toLowerCase();
  const payload = { ...page, handle, updatedAt: Date.now() };

  // localStorage mirror always runs (acts as offline cache + fallback)
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(lsKey(handle), JSON.stringify(payload));
      // remember the most-recently-edited handle so a bare /dashboard knows who you are
      window.localStorage.setItem("kirari:lastHandle", handle);
    }
  } catch {
    /* quota or private mode — ignore */
  }

  if (supabaseConfigured && supabase) {
    // Bind the row to the signed-in user so RLS can enforce "only the owner may
    // write". On first save the owner is set; afterwards RLS blocks anyone else.
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      // No Supabase session — saves can't persist to the cloud. This usually
      // means the account was never activated (email confirmation still on in
      // Supabase Auth). Surface it loudly instead of silently dropping the save.
      throw new Error(
        "not signed in to the database — your edits saved locally but won't sync. " +
        "fix: in Supabase → Authentication → Email, turn OFF 'Confirm email', then sign up again."
      );
    }

    // keep the handle registry current (also lets others resolve us for DMs)
    await supabase.from("handles").upsert({ handle, uid }, { onConflict: "handle" });

    const row: Record<string, unknown> = {
      handle,
      owner: uid,
      theme: payload.theme,
      mood: payload.mood,
      data: payload,
      updated_at: new Date(payload.updatedAt).toISOString(),
    };
    const { error } = await supabase.from("pages").upsert(row, { onConflict: "handle" });
    if (error) {
      // Legacy rows created before ownership tracking have owner = NULL, so the
      // owner-only UPDATE policy rejects them. Claim the row, then retry once.
      if (/row-level security|violates|policy/i.test(error.message)) {
        const { error: claimErr } = await supabase.from("pages").update({ owner: uid }).eq("handle", handle).is("owner", null);
        if (!claimErr) {
          const { error: retryErr } = await supabase.from("pages").upsert(row, { onConflict: "handle" });
          if (retryErr) throw new Error("save failed: " + retryErr.message);
          return;
        }
      }
      throw new Error("save failed: " + error.message);
    }
  }
}

// ---- load -----------------------------------------------------------------
export async function loadPage(handle: string): Promise<PublishedPage | null> {
  const h = handle.toLowerCase();

  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("pages").select("data").eq("handle", h).maybeSingle();
    if (error) console.warn("[kirari] loadPage supabase error:", error.message);
    if (data?.data) return data.data as PublishedPage;
    // fall through to localStorage if the row isn't there yet
  }

  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(lsKey(h));
      if (raw) return JSON.parse(raw) as PublishedPage;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ---- storage uploads ------------------------------------------------------
// Upload a File to Supabase Storage and return a public URL. Falls back to a
// local object URL when Supabase isn't configured (works for the current
// session/device only — good enough for local preview).
export async function uploadAsset(
  file: File,
  kind: "avatar" | "audio" | "bg",
  handle: string
): Promise<{ url: string; temporary: boolean }> {
  if (supabaseConfigured && supabase) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${handle.toLowerCase()}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) {
      console.warn("[kirari] uploadAsset error:", error.message);
      // real failure — surface it rather than persisting a dead blob URL
      throw new Error("upload failed: " + error.message);
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return { url: data.publicUrl, temporary: false };
  }
  // no storage configured: object URL works for THIS session only. Flag it so
  // the UI can warn that it won't persist / won't be visible to others.
  return { url: URL.createObjectURL(file), temporary: true };
}

// List published pages for the explore/directory page (newest first).
export async function listPages(limit = 60): Promise<PublishedPage[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("pages")
      .select("data")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) { console.warn("[kirari] listPages error:", error.message); return []; }
    return (data || []).map((r) => r.data as PublishedPage);
  }
  // local fallback: scan localStorage keys
  const out: PublishedPage[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) out.push(JSON.parse(raw) as PublishedPage);
      }
    }
  } catch { /* */ }
  return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, limit);
}

// Migrate a user from oldHandle → newHandle: move the page row, repoint the
// handle registry + DM threads, and free the old handle. Returns ok/error.
// (Only the owner can do this thanks to RLS on pages/handles.)
export async function renameHandle(oldHandle: string, newHandle: string): Promise<{ ok: boolean; error?: string }> {
  const from = oldHandle.toLowerCase();
  const to = newHandle.replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (to.length < 3) return { ok: false, error: "handle needs 3+ letters/numbers" };
  if (to === from) return { ok: true };

  if (supabaseConfigured && supabase) {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return { ok: false, error: "sign in first" };

    // new handle must be free
    const { data: taken } = await supabase.from("handles").select("handle").eq("handle", to).maybeSingle();
    if (taken) return { ok: false, error: "that handle is taken" };

    // load current page, re-key it under the new handle
    const page = await loadPage(from);
    if (page) {
      const moved = { ...page, handle: to, profile: { ...page.profile, handle: to }, updatedAt: Date.now() };
      const { error: insErr } = await supabase.from("pages").insert({ handle: to, owner: uid, theme: moved.theme, mood: moved.mood, data: moved, updated_at: new Date().toISOString() });
      if (insErr) return { ok: false, error: insErr.message };
      await supabase.from("pages").delete().eq("handle", from);
    }
    // registry: claim new, release old
    await supabase.from("handles").upsert({ handle: to, uid }, { onConflict: "handle" });
    await supabase.from("handles").delete().eq("handle", from).eq("uid", uid);
    // guestbook + DMs follow the handle
    await supabase.from("guestbook_entries").update({ page_handle: to }).eq("page_handle", from);
    await supabase.from("dm_threads").update({ a_handle: to }).eq("a_handle", from);
    await supabase.from("dm_threads").update({ b_handle: to }).eq("b_handle", from);
    await supabase.from("dm_notifs").update({ from_handle: to }).eq("from_handle", from);
    await supabase.from("dm_notifs").update({ recipient: to }).eq("recipient", from);

    try { localStorage.setItem("kirari:lastHandle", to); } catch { /* */ }
    return { ok: true };
  }

  // local fallback: move the saved page key
  try {
    const raw = localStorage.getItem(lsKey(from));
    if (raw) {
      const page = JSON.parse(raw);
      page.handle = to; if (page.profile) page.profile.handle = to;
      localStorage.setItem(lsKey(to), JSON.stringify(page));
      localStorage.removeItem(lsKey(from));
    }
    const gb = localStorage.getItem("kirari:gb:" + from);
    if (gb) { localStorage.setItem("kirari:gb:" + to, gb); localStorage.removeItem("kirari:gb:" + from); }
    localStorage.setItem("kirari:lastHandle", to);
  } catch { /* */ }
  return { ok: true };
}

// Append a guestbook entry for a target handle. Visitors are NOT the page
// owner, so this writes to the dedicated `guestbook` table (public-insert RLS)
// rather than the owner-locked `pages` blob. Returns the updated list.
export async function addGuestbookEntry(
  handle: string,
  entry: GuestEntry
): Promise<GuestEntry[] | null> {
  const h = handle.toLowerCase();

  // client-side cooldown: one sign per handle per 30s, max ~5 / 5min globally.
  if (!rateOk("gb:" + h, 30_000) || !rateOk("gb:any", 5_000)) {
    throw new Error("you're signing too fast — give it a sec ♡");
  }

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from("guestbook_entries").insert({
      page_handle: h,
      author_name: entry.name,
      author_handle: entry.person,
      text: entry.text,
      color: entry.color,
      fx: entry.fx,
    });
    if (error) { console.warn("[kirari] addGuestbookEntry:", error.message); return null; }
    return loadGuestbook(h);
  }

  // local fallback: keep a per-handle guestbook list
  try {
    const key = "kirari:gb:" + h;
    const list: GuestEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [entry, ...list].slice(0, 200);
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

// Load guestbook entries for a handle (newest first), merging the owner's
// seeded entries (in the page blob) with visitor-signed ones (guestbook table).
export async function loadGuestbook(handle: string): Promise<GuestEntry[]> {
  const h = handle.toLowerCase();
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("guestbook_entries")
      .select("*")
      .eq("page_handle", h)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { console.warn("[kirari] loadGuestbook:", error.message); return []; }
    return (data || []).map((g) => ({
      id: new Date(g.created_at).getTime(),
      person: g.author_handle || null,
      name: g.author_name,
      text: g.text,
      color: g.color || "#ff7ec0",
      fx: (g.fx || "none") as GuestEntry["fx"],
      time: relTime(new Date(g.created_at).getTime()),
    }));
  }
  try {
    return JSON.parse(localStorage.getItem("kirari:gb:" + h) || "[]");
  } catch {
    return [];
  }
}

// Admin-only: update a target page's data WITHOUT changing its owner (used by
// the @777 badge-grant / moderation panel). Relies on the admins RLS policy.
export async function adminUpdatePage(handle: string, mutate: (p: PublishedPage) => PublishedPage): Promise<{ ok: boolean; error?: string }> {
  const h = handle.toLowerCase();
  if (supabaseConfigured && supabase) {
    const page = await loadPage(h);
    if (!page) return { ok: false, error: "no page for @" + h };
    const next = mutate(page);
    // do NOT send `owner` — leave the existing owner intact
    const { error } = await supabase.from("pages").update({
      data: { ...next, updatedAt: Date.now() },
      updated_at: new Date().toISOString(),
    }).eq("handle", h);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // local fallback
  const page = await loadPage(h);
  if (!page) return { ok: false, error: "no page for @" + h };
  const next = mutate(page);
  try { localStorage.setItem(lsKey(h), JSON.stringify({ ...next, updatedAt: Date.now() })); } catch { /* */ }
  return { ok: true };
}

export function isPersistenceRemote(): boolean {
  return supabaseConfigured;
}
