"use client";

// ============================================================================
// Invite-only access. kirari is closed: you get in with a code minted by an
// admin/mod, or by buying one. Codes are single-use.
//
// Two backends behind one interface (same pattern as store.ts):
//   • Supabase  — `invites` table + security-definer RPCs (see schema.sql)
//   • localStorage — offline / no-backend fallback
// ============================================================================

import { supabase, supabaseConfigured } from "./supabase/client";

// Master switch. When true, signup requires a valid unused invite code.
export const INVITE_ONLY = true;
// What a purchased invite costs (display only — real charge needs a processor).
export const INVITE_PRICE_USD = 5;

export interface Invite {
  code: string;
  createdBy: string; // handle of the admin/mod (or "purchase")
  createdAt: number;
  note?: string;
  paid?: boolean; // minted by a purchase rather than granted
  usedBy?: string; // handle that redeemed it
  usedAt?: number;
}

const LS_KEY = "kirari:invites";

// A friendly, hard-to-typo code: KIRA-XXXX (no 0/O/1/I ambiguity).
export function genCode(): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return "KIRA-" + s.slice(0, 3) + "-" + s.slice(3);
}

export function normCode(raw: string): string {
  return (raw || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").trim();
}

// ---- local fallback -------------------------------------------------------
function localList(): Invite[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Invite[]; } catch { return []; }
}
function localSave(list: Invite[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* */ }
}

// ---- public API -----------------------------------------------------------
export async function listInvites(): Promise<Invite[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("invites").select("*").order("created_at", { ascending: false }).limit(500);
    if (!error && data) {
      return data.map((r) => ({
        code: r.code as string,
        createdBy: (r.created_by as string) || "",
        createdAt: new Date(r.created_at as string).getTime(),
        note: (r.note as string) || undefined,
        paid: !!r.paid,
        usedBy: (r.used_by as string) || undefined,
        usedAt: r.used_at ? new Date(r.used_at as string).getTime() : undefined,
      }));
    }
  }
  return localList().sort((a, b) => b.createdAt - a.createdAt);
}

export async function createInvite(createdBy: string, opts?: { note?: string; paid?: boolean }): Promise<Invite> {
  const inv: Invite = { code: genCode(), createdBy: createdBy || "admin", createdAt: Date.now(), note: opts?.note, paid: opts?.paid };
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.rpc("create_invite", { c: inv.code, note: inv.note || null, paid: !!inv.paid });
    if (!error) return inv;
    // fall through to local mirror if the RPC/table isn't there yet
  }
  const list = localList();
  list.unshift(inv);
  localSave(list);
  return inv;
}

// Mint several at once (admin convenience).
export async function createInvites(createdBy: string, n: number): Promise<Invite[]> {
  const out: Invite[] = [];
  for (let i = 0; i < Math.max(1, Math.min(50, n)); i++) out.push(await createInvite(createdBy));
  return out;
}

export async function revokeInvite(code: string): Promise<void> {
  const c = normCode(code);
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.rpc("revoke_invite", { c });
    if (!error) return;
  }
  localSave(localList().filter((i) => i.code !== c || i.usedBy));
}

// Is this code real and unused? Called at signup before creating the account.
export async function validateInvite(code: string): Promise<{ ok: boolean; error?: string }> {
  const c = normCode(code);
  if (!c) return { ok: false, error: "enter your invite code" };
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("invites").select("used_by").eq("code", c).maybeSingle();
    if (!error) {
      if (!data) return { ok: false, error: "that invite code isn't valid" };
      if (data.used_by) return { ok: false, error: "that invite has already been used" };
      return { ok: true };
    }
  }
  const found = localList().find((i) => i.code === c);
  if (!found) return { ok: false, error: "that invite code isn't valid" };
  if (found.usedBy) return { ok: false, error: "that invite has already been used" };
  return { ok: true };
}

// Burn a code for a handle. Safe to call right after validateInvite succeeds.
export async function redeemInvite(code: string, handle: string): Promise<{ ok: boolean; error?: string }> {
  const c = normCode(code);
  const h = (handle || "").replace(/^@+/, "").toLowerCase();
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("redeem_invite", { c, who: h });
    if (!error) return data ? { ok: true } : { ok: false, error: "that invite is no longer valid" };
  }
  const list = localList();
  const inv = list.find((i) => i.code === c);
  if (!inv) return { ok: false, error: "that invite code isn't valid" };
  if (inv.usedBy) return { ok: false, error: "that invite has already been used" };
  inv.usedBy = h;
  inv.usedAt = Date.now();
  localSave(list);
  return { ok: true };
}

// "Buy" an invite. Real money needs a payment processor (Stripe Checkout etc.);
// until that's wired this mints a paid code so the flow is testable end-to-end.
export async function purchaseInvite(): Promise<{ ok: boolean; code?: string; error?: string; pending?: boolean }> {
  try {
    const inv = await createInvite("purchase", { paid: true, note: "purchased" });
    return { ok: true, code: inv.code, pending: true };
  } catch {
    return { ok: false, error: "couldn't start checkout — try again" };
  }
}
