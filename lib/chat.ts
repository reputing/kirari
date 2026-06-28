"use client";

// ============================================================================
// Real 1:1 DMs ("knock & chat"). Supabase-backed when configured, localStorage
// fallback otherwise. A "knock" creates (or reuses) a conversation between two
// handles and drops a notification for the recipient. Both sides then load +
// send messages; the UI polls loadMessages for near-real-time delivery.
//
// Schema (added to supabase/schema.sql):
//   dm_threads(id, a_handle, b_handle, created_at, updated_at)
//   dm_messages(id, thread_id, sender, body, created_at)
//   dm_notifs(id, recipient, kind, from_handle, thread_id, read, created_at)
// ============================================================================

import { supabase, supabaseConfigured } from "./supabase/client";
import { resolveHandleUid } from "./auth";

export interface DMThread {
  id: string;
  a: string; // handle
  b: string; // handle
  other: string; // the OTHER participant relative to "me"
  updatedAt: number;
}
export interface DMMessage {
  id: string;
  thread: string;
  sender: string;
  body: string;
  createdAt: number;
}

function norm(h: string) {
  return (h || "").replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
// canonical pair key so (a,b) and (b,a) map to the same thread
function pairKey(x: string, y: string) {
  return [norm(x), norm(y)].sort().join("__");
}

// ---- localStorage fallback store ----
const LS_THREADS = "kirari:dm:threads";
const LS_MSGS = "kirari:dm:msgs";
const LS_NOTIFS = "kirari:dm:notifs";
function lsGet<T>(k: string, d: T): T {
  try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; }
}
function lsSet(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ }
}

// ---- knock: open or reuse a thread, notify the recipient ----
export async function knock(from: string, to: string): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  const a = norm(from), b = norm(to);
  if (!a || !b) return { ok: false, error: "missing handle" };
  if (a === b) return { ok: false, error: "you can't knock on yourself ♡" };
  // cooldown: one knock to the same person per 60s
  try {
    const k = "kirari:rl:knock:" + b;
    if (Date.now() - Number(localStorage.getItem(k) || 0) < 60_000) return { ok: false, error: "you just knocked — give them a moment ♡" };
    localStorage.setItem(k, String(Date.now()));
  } catch { /* */ }
  const key = pairKey(a, b);

  if (supabaseConfigured && supabase) {
    const { data: auth } = await supabase.auth.getUser();
    const myUid = auth.user?.id ?? null;
    const [pa, pb] = key.split("__");
    const { data: existing } = await supabase.from("dm_threads").select("id").eq("a_handle", pa).eq("b_handle", pb).maybeSingle();
    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      // resolve BOTH participants' uids from the handle registry so the thread
      // binds correctly even if the recipient hasn't saved a page yet
      const aUid = pa === a ? myUid : await resolveHandleUid(pa);
      const bUid = pb === a ? myUid : await resolveHandleUid(pb);
      const { data, error } = await supabase
        .from("dm_threads")
        .insert({ a_handle: pa, b_handle: pb, a_uid: aUid, b_uid: bUid })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      threadId = data.id;
    }
    await supabase.from("dm_notifs").insert({ recipient: b, kind: "knock", from_handle: a, thread_id: threadId });
    return { ok: true, threadId };
  }

  // local fallback
  const threads = lsGet<Record<string, { id: string; a: string; b: string; updatedAt: number }>>(LS_THREADS, {});
  if (!threads[key]) threads[key] = { id: key, a: pairKey(a, b).split("__")[0], b: pairKey(a, b).split("__")[1], updatedAt: Date.now() };
  lsSet(LS_THREADS, threads);
  const notifs = lsGet<Record<string, unknown[]>>(LS_NOTIFS, {});
  (notifs[b] ||= []).push({ id: "n" + Date.now(), kind: "knock", from: a, thread: key, read: false, createdAt: Date.now() });
  lsSet(LS_NOTIFS, notifs);
  return { ok: true, threadId: key };
}

// ---- list my conversations ----
export async function listThreads(me: string): Promise<DMThread[]> {
  const h = norm(me);
  if (!h) return [];
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("dm_threads").select("*").or(`a_handle.eq.${h},b_handle.eq.${h}`).order("updated_at", { ascending: false });
    if (error) { console.warn("[kirari] listThreads:", error.message); return []; }
    return (data || []).map((t) => ({ id: t.id, a: t.a_handle, b: t.b_handle, other: t.a_handle === h ? t.b_handle : t.a_handle, updatedAt: new Date(t.updated_at).getTime() }));
  }
  const threads = lsGet<Record<string, { id: string; a: string; b: string; updatedAt: number }>>(LS_THREADS, {});
  return Object.values(threads).filter((t) => t.a === h || t.b === h).map((t) => ({ ...t, other: t.a === h ? t.b : t.a })).sort((x, y) => y.updatedAt - x.updatedAt);
}

// ---- load messages for a thread ----
export async function loadMessages(threadId: string): Promise<DMMessage[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("dm_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true });
    if (error) { console.warn("[kirari] loadMessages:", error.message); return []; }
    return (data || []).map((m) => ({ id: m.id, thread: m.thread_id, sender: m.sender, body: m.body, createdAt: new Date(m.created_at).getTime() }));
  }
  const all = lsGet<Record<string, DMMessage[]>>(LS_MSGS, {});
  return all[threadId] || [];
}

// ---- send a message ----
export async function sendMessage(threadId: string, sender: string, body: string): Promise<DMMessage | null> {
  const s = norm(sender);
  const text = body.trim();
  if (!text) return null;
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("dm_messages").insert({ thread_id: threadId, sender: s, body: text }).select("*").single();
    if (error) { console.warn("[kirari] sendMessage:", error.message); return null; }
    await supabase.from("dm_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    return { id: data.id, thread: threadId, sender: s, body: text, createdAt: new Date(data.created_at).getTime() };
  }
  const all = lsGet<Record<string, DMMessage[]>>(LS_MSGS, {});
  const msg: DMMessage = { id: "m" + Date.now(), thread: threadId, sender: s, body: text, createdAt: Date.now() };
  (all[threadId] ||= []).push(msg);
  lsSet(LS_MSGS, all);
  const threads = lsGet<Record<string, { id: string; a: string; b: string; updatedAt: number }>>(LS_THREADS, {});
  if (threads[threadId]) { threads[threadId].updatedAt = Date.now(); lsSet(LS_THREADS, threads); }
  return msg;
}

// ---- group chats ----------------------------------------------------------
export interface GroupThread { id: string; name: string; updatedAt: number; }

// Create a group with the given name + member handles (creator auto-added).
export async function createGroup(creator: string, name: string, memberHandles: string[]): Promise<{ ok: boolean; groupId?: string; error?: string }> {
  const me = norm(creator);
  const nm = name.trim() || "untitled group";
  if (!me) return { ok: false, error: "sign in first" };
  const members = Array.from(new Set([me, ...memberHandles.map(norm).filter(Boolean)]));

  if (supabaseConfigured && supabase) {
    const { data: auth } = await supabase.auth.getUser();
    const myUid = auth.user?.id ?? null;
    const { data: g, error } = await supabase.from("group_threads").insert({ name: nm, owner_uid: myUid }).select("id").single();
    if (error) return { ok: false, error: error.message };
    const gid = g.id as string;
    const rows = await Promise.all(members.map(async (h) => ({ group_id: gid, handle: h, uid: h === me ? myUid : await resolveHandleUid(h) })));
    const { error: mErr } = await supabase.from("group_members").insert(rows);
    if (mErr) return { ok: false, error: mErr.message };
    return { ok: true, groupId: gid };
  }

  const groups = lsGet<Record<string, { id: string; name: string; members: string[]; updatedAt: number }>>("kirari:groups", {});
  const gid = "g" + Date.now();
  groups[gid] = { id: gid, name: nm, members, updatedAt: Date.now() };
  lsSet("kirari:groups", groups);
  return { ok: true, groupId: gid };
}

export async function listGroups(me: string): Promise<GroupThread[]> {
  const h = norm(me);
  if (!h) return [];
  if (supabaseConfigured && supabase) {
    const { data: mem } = await supabase.from("group_members").select("group_id").eq("handle", h);
    const ids = (mem || []).map((m) => m.group_id);
    if (!ids.length) return [];
    const { data } = await supabase.from("group_threads").select("*").in("id", ids).order("updated_at", { ascending: false });
    return (data || []).map((g) => ({ id: g.id, name: g.name, updatedAt: new Date(g.updated_at).getTime() }));
  }
  const groups = lsGet<Record<string, { id: string; name: string; members: string[]; updatedAt: number }>>("kirari:groups", {});
  return Object.values(groups).filter((g) => g.members.includes(h)).map((g) => ({ id: g.id, name: g.name, updatedAt: g.updatedAt })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadGroupMessages(groupId: string): Promise<DMMessage[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true });
    if (error) { console.warn("[kirari] loadGroupMessages:", error.message); return []; }
    return (data || []).map((m) => ({ id: m.id, thread: groupId, sender: m.sender, body: m.body, createdAt: new Date(m.created_at).getTime() }));
  }
  const all = lsGet<Record<string, DMMessage[]>>("kirari:groupmsgs", {});
  return all[groupId] || [];
}

export async function sendGroupMessage(groupId: string, sender: string, body: string): Promise<DMMessage | null> {
  const s = norm(sender);
  const text = body.trim();
  if (!text) return null;
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from("group_messages").insert({ group_id: groupId, sender: s, body: text }).select("*").single();
    if (error) { console.warn("[kirari] sendGroupMessage:", error.message); return null; }
    await supabase.from("group_threads").update({ updated_at: new Date().toISOString() }).eq("id", groupId);
    return { id: data.id, thread: groupId, sender: s, body: text, createdAt: new Date(data.created_at).getTime() };
  }
  const all = lsGet<Record<string, DMMessage[]>>("kirari:groupmsgs", {});
  const msg: DMMessage = { id: "m" + Date.now(), thread: groupId, sender: s, body: text, createdAt: Date.now() };
  (all[groupId] ||= []).push(msg);
  lsSet("kirari:groupmsgs", all);
  return msg;
}

export async function loadGroupMembers(groupId: string): Promise<string[]> {
  if (supabaseConfigured && supabase) {
    const { data } = await supabase.from("group_members").select("handle").eq("group_id", groupId);
    return (data || []).map((m) => m.handle);
  }
  const groups = lsGet<Record<string, { members: string[] }>>("kirari:groups", {});
  return groups[groupId]?.members || [];
}

// Mark knock notifications for a thread as read (called when you open it).
export async function markKnocksRead(me: string, threadId: string): Promise<void> {
  const h = norm(me);
  if (supabaseConfigured && supabase) {
    await supabase.from("dm_notifs").update({ read: true }).eq("recipient", h).eq("thread_id", threadId);
    return;
  }
  try {
    const notifs = lsGet<Record<string, { id: string; from: string; thread: string; read?: boolean }[]>>(LS_NOTIFS, {});
    (notifs[h] || []).forEach((n) => { if (n.thread === threadId) n.read = true; });
    lsSet(LS_NOTIFS, notifs);
  } catch { /* */ }
}

// ---- knock notifications for me ----
export async function loadKnocks(me: string): Promise<{ id: string; from: string; thread: string }[]> {
  const h = norm(me);
  if (supabaseConfigured && supabase) {
    const { data } = await supabase.from("dm_notifs").select("*").eq("recipient", h).eq("read", false).order("created_at", { ascending: false });
    return (data || []).map((n) => ({ id: n.id, from: n.from_handle, thread: n.thread_id }));
  }
  const notifs = lsGet<Record<string, { id: string; from: string; thread: string; read?: boolean }[]>>(LS_NOTIFS, {});
  return (notifs[h] || []).filter((n) => !n.read);
}
