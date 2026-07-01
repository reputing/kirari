"use client";

// ============================================================================
// Auth — username + password (no email required by the user).
//
// Supabase Auth needs an email, so we map  username -> username@kirari.local
// internally. The real handle lives in the profile/page. When Supabase isn't
// configured we fall back to a localStorage "session" so the whole flow works
// locally; the public API is identical either way.
//
// Admin: the handle in ADMIN_HANDLES gets isAdmin = true (for the @777 panel).
// ============================================================================

import { supabase, supabaseConfigured } from "./supabase/client";
import { INVITE_ONLY, validateInvite, redeemInvite } from "./invites";

export const ADMIN_HANDLES = ["777"]; // accounts with the full admin panel

export type Role = "admin" | "mod" | "user";

export interface Session {
  handle: string;
  isAdmin: boolean;
  role: Role;
}

const SESSION_KEY = "kirari:session";
const LOCAL_USERS = "kirari:users"; // { [handle]: { pw } } — local fallback only

// Handles must be email-local-part AND URL safe: lowercase letters, digits,
// underscore and hyphen only. Anything else is stripped so the mapped email is
// always valid. (Unicode like "=3" or "☆彡" gets cleaned to a safe slug.)
function norm(h: string) {
  return (h || "")
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}
// Is the raw input a usable handle (3–32 safe chars after cleaning)?
export function validHandle(h: string): boolean {
  const n = norm(h);
  return n.length >= 3 && n.length <= 32;
}
// kirari maps handle -> handle@<domain> internally for Supabase Auth (the user
// never sees or types this). We use the RFC-2606 reserved domain example.com,
// which every email validator accepts, so signups never fail validation.
const AUTH_EMAIL_DOMAIN = "example.com";
function emailFor(handle: string) {
  return norm(handle) + "@" + AUTH_EMAIL_DOMAIN;
}
function isAdminHandle(handle: string) {
  return ADMIN_HANDLES.includes(norm(handle));
}

// ---- moderators (admin-appointed) & bans ---------------------------------
// Mods can mint invites and delete/ban accounts but can't appoint other mods.
// Stored locally as a fallback; the admin panel is the source of truth.
const MODS_KEY = "kirari:mods";
const BANNED_KEY = "kirari:banned";
function readList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]") as string[]; } catch { return []; }
}
function writeList(key: string, list: string[]) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(new Set(list.map((h) => norm(h)))))); } catch { /* */ }
}
export function listMods(): string[] { return readList(MODS_KEY); }
export function setMod(handle: string, on: boolean) {
  const h = norm(handle);
  const cur = readList(MODS_KEY).filter((x) => x !== h);
  writeList(MODS_KEY, on ? [...cur, h] : cur);
}
export function listBanned(): string[] { return readList(BANNED_KEY); }
export function isBanned(handle: string): boolean { return readList(BANNED_KEY).includes(norm(handle)); }
export function setBanned(handle: string, on: boolean) {
  const h = norm(handle);
  const cur = readList(BANNED_KEY).filter((x) => x !== h);
  writeList(BANNED_KEY, on ? [...cur, h] : cur);
}

function roleFor(handle: string): Role {
  if (isAdminHandle(handle)) return "admin";
  if (readList(MODS_KEY).includes(norm(handle))) return "mod";
  return "user";
}
export function canModerate(session: Session | null): boolean {
  return session?.role === "admin" || session?.role === "mod";
}

// Lockdown: an emergency switch to pause ALL new signups (raid protection).
// Admins can still create accounts. Local flag; the admin panel toggles it.
const LOCKDOWN_KEY = "kirari:lockdown";
export function signupsLocked(): boolean {
  try { return localStorage.getItem(LOCKDOWN_KEY) === "1"; } catch { return false; }
}
export function setSignupsLocked(on: boolean) {
  try { localStorage.setItem(LOCKDOWN_KEY, on ? "1" : "0"); } catch { /* */ }
}

// ---- local fallback helpers ----
function localUsers(): Record<string, { pw: string }> {
  try { return JSON.parse(localStorage.getItem(LOCAL_USERS) || "{}"); } catch { return {}; }
}
function saveLocalUsers(u: Record<string, { pw: string }>) {
  localStorage.setItem(LOCAL_USERS, JSON.stringify(u));
}
function setLocalSession(handle: string) {
  const h = norm(handle);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ handle: h, isAdmin: isAdminHandle(h), role: roleFor(h) }));
}

// ---- public API ----

export async function signUp(handle: string, password: string, invite?: string): Promise<{ ok: boolean; error?: string }> {
  const h = norm(handle);
  if (h.length < 3) return { ok: false, error: "handle needs 3+ letters/numbers" };
  if (password.length < 4) return { ok: false, error: "password too short (4+)" };
  if (isBanned(h)) return { ok: false, error: "this handle isn't allowed" };
  if (signupsLocked() && !isAdminHandle(h)) return { ok: false, error: "signups are paused right now — check back soon" };

  // invite-only: an admin bypasses the gate; everyone else needs a live code.
  // Validate up front, then burn it only after the account is really created.
  if (INVITE_ONLY && !isAdminHandle(h)) {
    const v = await validateInvite(invite || "");
    if (!v.ok) return { ok: false, error: v.error || "a valid invite is required" };
  }

  // block re-registering a handle that already has a published page
  const free = await handleAvailable(h);
  if (!free) return { ok: false, error: "that handle is taken" };

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.auth.signUp({
      email: emailFor(h),
      password,
      options: { data: { handle: h } },
    });
    if (error) {
      const taken = /registered|already/i.test(error.message);
      return { ok: false, error: taken ? "that handle is taken" : error.message };
    }
    // session is created by Supabase; remember handle locally for hydration
    setLocalSession(h);
    await registerHandle(h);
    if (INVITE_ONLY && !isAdminHandle(h)) await redeemInvite(invite || "", h);
    return { ok: true };
  }

  // local fallback
  const users = localUsers();
  if (users[h]) return { ok: false, error: "handle taken" };
  users[h] = { pw: password };
  saveLocalUsers(users);
  setLocalSession(h);
  if (INVITE_ONLY && !isAdminHandle(h)) await redeemInvite(invite || "", h);
  return { ok: true };
}

export async function signIn(handle: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const h = norm(handle);
  if (isBanned(h)) return { ok: false, error: "this account has been suspended" };
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
      const h = norm(handle);
      return { handle: h, isAdmin: isAdminHandle(h), role: roleFor(h) };
    }
    return null;
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    const h = norm(s.handle || "");
    // recompute role/admin so appointing a mod takes effect without re-login
    return { handle: h, isAdmin: isAdminHandle(h), role: roleFor(h) };
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
    // the handles registry is the source of truth for ownership (written at
    // signup, before a page exists). Check it first, then pages as a backstop.
    const { data: reg } = await supabase.from("handles").select("handle").eq("handle", h).maybeSingle();
    if (reg) return false;
    const { data: pg } = await supabase.from("pages").select("handle").eq("handle", h).maybeSingle();
    return !pg;
  }
  return !localUsers()[h];
}

export function isAdmin(session: Session | null): boolean {
  return !!session?.isAdmin;
}

// ---- handle registry (handle -> owner uid) ------------------------------
// Claim the current user's handle in the registry. Idempotent; safe to call on
// every signup/login. No-op without Supabase.
export async function registerHandle(handle: string): Promise<void> {
  const h = norm(handle);
  if (!h || !supabaseConfigured || !supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  await supabase.from("handles").upsert({ handle: h, uid }, { onConflict: "handle" });
}

// Resolve a handle to its owner's uid (for binding DMs). null if unclaimed.
export async function resolveHandleUid(handle: string): Promise<string | null> {
  const h = norm(handle);
  if (!h || !supabaseConfigured || !supabase) return null;
  const { data } = await supabase.from("handles").select("uid").eq("handle", h).maybeSingle();
  return (data?.uid as string) || null;
}

// ---- account numbers (the visible "UID #123") -----------------------------
// One stable, sequential number per handle. Idempotent: the SAME handle always
// gets the SAME number, and it is NEVER reused or reshuffled — that was the old
// bug, where a shared local counter handed out a fresh number on every load and
// gave two different people "#1". Server-authoritative via claim_uid; a
// per-handle local registry is the offline fallback.
const UID_MAP_KEY = "kirari:uidmap"; // { [handle]: number }
const UID_SEQ_KEY = "kirari:uidseq";
export async function assignUid(handle: string): Promise<number | undefined> {
  const h = norm(handle);
  if (!h) return undefined;
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("claim_uid", { h });
    if (!error && data != null) {
      const n = Number(data);
      try {
        const map = JSON.parse(localStorage.getItem(UID_MAP_KEY) || "{}");
        map[h] = n; localStorage.setItem(UID_MAP_KEY, JSON.stringify(map));
      } catch { /* */ }
      return n;
    }
  }
  try {
    const map = JSON.parse(localStorage.getItem(UID_MAP_KEY) || "{}") as Record<string, number>;
    if (typeof map[h] === "number") return map[h]; // already assigned — keep it
    const next = Number(localStorage.getItem(UID_SEQ_KEY) || "0") + 1;
    localStorage.setItem(UID_SEQ_KEY, String(next));
    map[h] = next;
    localStorage.setItem(UID_MAP_KEY, JSON.stringify(map));
    return next;
  } catch {
    return undefined;
  }
}
