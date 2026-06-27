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
    // single row per handle in `pages` (see schema.sql); upsert the JSON blob.
    const { error } = await supabase.from("pages").upsert(
      {
        handle,
        theme: payload.theme,
        mood: payload.mood,
        data: payload, // jsonb: full PublishedPage
        updated_at: new Date(payload.updatedAt).toISOString(),
      },
      { onConflict: "handle" }
    );
    if (error) console.warn("[kirari] savePage supabase error:", error.message);
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
): Promise<string> {
  if (supabaseConfigured && supabase) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${handle.toLowerCase()}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) {
      console.warn("[kirari] uploadAsset error:", error.message);
      return URL.createObjectURL(file);
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }
  return URL.createObjectURL(file);
}

export function isPersistenceRemote(): boolean {
  return supabaseConfigured;
}
