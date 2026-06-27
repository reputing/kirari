"use client";

// ============================================================================
// Auth — username + password (no email required by the user).
//
// Supabase Auth needs an email, so we map  username -> username@kirari.local
// internally. The real handle lives in the profile/page. When Supabase isn't
// configured we fall back to a localStorage "session" so the whole flow works
// locally; the public API is identical either way.
//
// Admin: the handle in ADMIN_HANDLES gets isAdmin = true (for the @x panel).
// ============================================================================

import { supabase, supabaseConfigured } from "./supabase/client";

export const ADMIN_HANDLES = ["x"]; // accounts with admin panel access

export interface Session {
  handle: string;
  isAdmin: boolean;
}

const SESSION_KEY = "kirari:session";
const LOCAL_USERS = "kirari:users"; // { [handle]: { pw } } — local fallback only

function norm(h: string) {
  return (h || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
}
function emailFor(handle: string) {
  return norm(handle) + "@kirari.local";
}
function isAdminHandle(handle: string) {
  return ADMIN_HANDLES.includes(norm(handle));
}

// ---- local fallback helpers ----
function localUsers(): Record<string, { pw: string }> {
  try { return JSON.parse(localStorage.getItem(LOCAL_USERS) || "{}"); } catch { return {}; }
}
function saveLocalUsers(u: Record<string, { pw: string }>) {
  localStorage.setItem(LOCAL_USERS, JSON.stringify(u));
}
function setLocalSession(handle: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ handle: norm(handle), isAdmin: isAdminHandle(handle) }));
}

// ---- public API ----

export async function signUp(handle: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const h = norm(handle);
  if (!h) return { ok: false, error: "pick a handle ♡" };
  if (password.length < 4) return { ok: false, error: "password too short" };

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.auth.signUp({
      email: emailFor(h),
      password,
      options: { data: { handle: h } },
    });
    if (error) return { ok: false, error: error.message.includes("registered") ? "handle taken" : error.message };
    // session is created by Supabase; remember handle locally for hydration
    setLocalSession(h);
    return { ok: true };
  }

  // local fallback
  const users = localUsers();
  if (users[h]) return { ok: false, error: "handle taken" };
  users[h] = { pw: password };
  saveLocalUsers(users);
  setLocalSession(h);
  return { ok: true };
}

export async function signIn(handle: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const h = norm(handle);
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email: emailFor(h), password });
    if (error) return { ok: false, error: "wrong handle or password" };
    setLocalSession(h);
    return { ok: true };
  }
  const users = localUsers();
  if (!users[h] || users[h].pw !== password) return { ok: false, error: "wrong handle or password" };
  setLocalSession(h);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (supabaseConfigured && supabase) await supabase.auth.signOut();
  try { localStorage.removeItem(SESSION_KEY); } catch { /* */ }
}

// Returns the current session (handle + admin), or null. Checks Supabase first
// (real session, survives refresh), else the local session.
export async function getSession(): Promise<Session | null> {
  if (supabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (u) {
      const handle = (u.user_metadata?.handle as string) || (u.email || "").split("@")[0];
      return { handle: norm(handle), isAdmin: isAdminHandle(handle) };
    }
    return null;
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  if (next.length < 4) return { ok: false, error: "new password too short" };
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // local: verify current against the stored pw for the session handle
  const sess = await getSession();
  if (!sess) return { ok: false, error: "not signed in" };
  const users = localUsers();
  if (!users[sess.handle] || users[sess.handle].pw !== current) return { ok: false, error: "current password is wrong" };
  users[sess.handle].pw = next;
  saveLocalUsers(users);
  return { ok: true };
}

// Is a handle free to claim? (used by the public 404/claim page + signup)
export async function handleAvailable(handle: string): Promise<boolean> {
  const h = norm(handle);
  if (!h) return false;
  if (supabaseConfigured && supabase) {
    const { data } = await supabase.from("pages").select("handle").eq("handle", h).maybeSingle();
    return !data;
  }
  return !localUsers()[h];
}

export function isAdmin(session: Session | null): boolean {
  return !!session?.isAdmin;
}
