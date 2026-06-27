"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AppState,
  WindowType,
  TextFx,
  BgPattern,
  PfpShape,
  Deco,
} from "./types";
import type { ThemeId } from "./themes";
import { decodeTheme } from "./themes";
import { makeInitialState, PEOPLE, REPLIES, TINTS, peopleAll } from "./seed";
import { winSize } from "./styleHelpers";
import { savePage } from "./store";

// ============================================================================
// useDesktop — the single source of truth for the desktop environment.
//
// This is a faithful port of the prototype's React class Component: same state
// shape, same mutation logic, same side effects (visitor counter, clock,
// glitter cursor, mobile detection, drag, fake auto-replies). Imperative DOM
// refs (drag, msg autoscroll, cursor sparkles) are preserved exactly.
//
// To go live: replace the in-memory `convos`/`guestbook`/`notifs`/`profile`
// reads & writes with Supabase queries + Realtime subscriptions (see README).
// The action surface this hook exposes stays the same.
// ============================================================================

export interface DesktopApi {
  state: AppState;
  rootRef: React.RefObject<HTMLDivElement>;
  deskRef: React.RefObject<HTMLDivElement>;
  msgRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;

  // windows
  openWindow: (type: WindowType, convoId?: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMax: (id: string) => void;
  startDrag: (id: string, e: React.MouseEvent) => void;

  // chat
  openDM: (personId: string) => void;
  setConvoDraft: (convoId: string, v: string) => void;
  sendMsg: (convoId: string) => void;
  sendSticker: (convoId: string, em: string) => void;
  reactToMsg: (convoId: string, msgId: number, emoji: string) => void;
  sendAttachment: (convoId: string, file: { name: string; type: string; url: string }) => void;
  addToGroup: (convoId: string, handle: string) => void;
  removeFromGroup: (convoId: string, memberId: string) => void;

  // guestbook
  setGuest: (k: "name" | "text", v: string) => void;
  pickGuestFx: (fx: TextFx) => void;
  pickGuestColor: (c: string) => void;
  signGuest: () => void;

  // new group
  setGroupName: (v: string) => void;
  toggleMember: (id: string) => void;
  createGroup: (winId: string) => void;
  setGroupHandle: (v: string) => void;
  addGroupInvite: () => void;
  removeGroupInvite: (handle: string) => void;

  // friend requests
  setReqDraft: (v: string) => void;
  sendRequest: () => void;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;

  // dock / taskbar pinning
  togglePinApp: (type: string) => void;
  togglePinWin: (type: string) => void;

  // profile edit
  setP: (k: "name" | "handle" | "pronouns" | "bio", v: string) => void;
  setProfileVal: (k: string, v: unknown) => void;
  setLinkLabel: (id: string, v: string) => void;
  setLinkField: (id: string, field: "icon" | "url" | "meta" | "emoji", v: string) => void;
  moveLink: (id: string, d: number) => void;
  removeLink: (id: string) => void;
  addLink: () => void;

  // misc
  setTheme: (t: string) => void;
  toggle: (k: keyof AppState["toggles"]) => void;
  setMood: (m: string) => void;
  markNotifRead: (id: number) => void;

  // skin editor
  createCustomTheme: (base: string) => string; // returns new theme id
  updateCustomTheme: (id: string, patch: { name?: string; sub?: string; vars?: Record<string, string> }) => void;
  deleteCustomTheme: (id: string) => void;
  importTheme: (code: string) => boolean;

  // desktop icon layout
  setIconPos: (id: string, x: number, y: number) => void;
  tileWindows: () => void;
  cascadeWindows: () => void;

  // onboarding
  openOnb: () => void;
  closeOnb: () => void;
  onbPrev: () => void;
  onbNext: () => void;
  setOnbHandle: (v: string) => void;
  pickOnbMood: (m: string) => void;
  setOnbLink: (i: number, v: string) => void;
  finishOnb: () => void;
}

export function useDesktop(): DesktopApi {
  const [state, setState] = useState<AppState>(makeInitialState);

  // imperative refs (no React re-render during drag / scroll / cursor)
  const rootRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const widRef = useRef(100);
  const typersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSparkRef = useRef(0);
  const dragRef = useRef<{
    move?: (e: MouseEvent) => void;
    up?: () => void;
    pos?: { nx: number; ny: number } | null;
  }>({});
  // keep a live snapshot for imperative handlers that close over stale state
  const stateRef = useRef(state);
  stateRef.current = state;

  // ----------------------------------------------------------------- effects
  useEffect(() => {
    setState((s) => ({ ...s, isMobile: window.innerWidth < 760 }));

    const vc = setInterval(() => {
      setState((s) =>
        s.toggles.counter
          ? {
              ...s,
              profile: {
                ...s.profile,
                counters: {
                  ...s.profile.counters,
                  views: s.profile.counters.views + Math.floor(Math.random() * 3),
                },
              },
            }
          : s
      );
    }, 4800);

    const clk = setInterval(() => setState((s) => ({ ...s, now: Date.now() })), 30000);

    const onResize = () => {
      const m = window.innerWidth < 760;
      setState((s) => (m !== s.isMobile ? { ...s, isMobile: m } : s));
    };
    window.addEventListener("resize", onResize);

    // glitter cursor
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSparkRef.current < 55) return;
      lastSparkRef.current = now;
      const root = rootRef.current;
      if (!root) return;
      const col = getComputedStyle(root).getPropertyValue("--accent").trim() || "#ff7ec0";
      const sp = document.createElement("span");
      const chars = ["✦", "✧", "♡", "★", "✿"];
      sp.textContent = chars[Math.floor(Math.random() * chars.length)];
      sp.style.cssText =
        "position:fixed;left:" +
        e.clientX +
        "px;top:" +
        e.clientY +
        "px;pointer-events:none;z-index:99999;font-size:" +
        (10 + Math.random() * 9) +
        "px;color:" +
        col +
        ";transform:translate(-50%,-50%);transition:transform .7s ease,opacity .7s ease;opacity:1;text-shadow:0 0 6px " +
        col +
        ";";
      document.body.appendChild(sp);
      requestAnimationFrame(() => {
        sp.style.transform =
          "translate(-50%,-50%) translateY(" + (16 + Math.random() * 16) + "px) scale(.4)";
        sp.style.opacity = "0";
      });
      setTimeout(() => sp.remove(), 760);
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      clearInterval(vc);
      clearInterval(clk);
      Object.values(typersRef.current).forEach(clearTimeout);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      if (dragRef.current.move) window.removeEventListener("mousemove", dragRef.current.move);
      if (dragRef.current.up) window.removeEventListener("mouseup", dragRef.current.up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoscroll every open chat to bottom on any update (matches componentDidUpdate)
  useEffect(() => {
    Object.keys(msgRefs.current).forEach((id) => {
      const el = msgRefs.current[id];
      if (el) el.scrollTop = el.scrollHeight;
    });
  });

  // Publish the page to the shared store (Supabase if configured, else
  // localStorage) whenever anything visible on the public page changes. This is
  // what makes /<handle> show the owner's real, saved edits. Debounced so rapid
  // edits don't thrash storage.
  useEffect(() => {
    const handle = state.profile.handle;
    if (!handle) return;
    const t = setTimeout(() => {
      savePage({
        handle,
        theme: state.theme,
        customThemes: state.customThemes,
        mood: state.mood,
        profile: state.profile,
        guestbook: state.guestbook,
        updatedAt: Date.now(),
      });
    }, 400);
    return () => clearTimeout(t);
  }, [state.profile, state.theme, state.customThemes, state.mood, state.guestbook]);

  // --------------------------------------------------------------- windows
  const focusWindow = useCallback((id: string) => {
    setState((s) => {
      const z = s.zTop + 1;
      return { ...s, zTop: z, windows: s.windows.map((w) => (w.id === id ? { ...w, z, min: false } : w)) };
    });
  }, []);

  const markRead = useCallback((convoId: string) => {
    setState((s) => {
      const c = s.convos[convoId];
      if (!c || !c.unread) return s;
      return { ...s, convos: { ...s.convos, [convoId]: { ...c, unread: 0 } } };
    });
  }, []);

  const openWindow = useCallback(
    (type: WindowType, convoId?: string) => {
      setState((s) => {
        const ex = s.windows.find((w) => w.type === type && (w.convoId || "") === (convoId || ""));
        const z = s.zTop + 1;
        if (ex)
          return {
            ...s,
            zTop: z,
            windows: s.windows.map((w) => (w === ex ? { ...w, z, min: false } : w)),
          };
        const sz = winSize(type);
        const n = s.windows.length;
        const win = {
          id: "w" + widRef.current++,
          type,
          convoId: convoId || null,
          x: 34 + ((n * 30) % 190),
          y: 22 + ((n * 26) % 150),
          w: sz.w,
          h: sz.h,
          z,
          min: false,
          max: false,
        };
        return { ...s, zTop: z, windows: [...s.windows, win] };
      });
      if (convoId) markRead(convoId);
    },
    [markRead]
  );

  const closeWindow = useCallback((id: string) => {
    setState((s) => ({ ...s, windows: s.windows.filter((w) => w.id !== id) }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setState((s) => ({ ...s, windows: s.windows.map((w) => (w.id === id ? { ...w, min: true } : w)) }));
  }, []);

  const toggleMax = useCallback((id: string) => {
    const desk = deskRef.current;
    const r = desk ? desk.getBoundingClientRect() : ({ width: 900, height: 600 } as DOMRect);
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.max)
          return { ...w, max: false, x: w.px ?? 40, y: w.py ?? 30, w: w.pw ?? w.w, h: w.ph ?? w.h };
        return {
          ...w,
          max: true,
          px: w.x,
          py: w.y,
          pw: w.w,
          ph: w.h,
          x: 6,
          y: 6,
          w: Math.round(r.width - 12),
          h: Math.round(r.height - 12),
        };
      }),
    }));
  }, []);

  const startDrag = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (stateRef.current.isMobile) return;
      focusWindow(id);
      const frame = (e.currentTarget as HTMLElement).closest("[data-win]") as HTMLElement | null;
      if (!frame) return;
      const desk = (frame.offsetParent as HTMLElement) || deskRef.current;
      if (!desk) return;
      const pr = desk.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const offX = e.clientX - fr.left;
      const offY = e.clientY - fr.top;
      document.body.style.userSelect = "none";

      const move = (ev: MouseEvent) => {
        let nx = ev.clientX - pr.left - offX;
        let ny = ev.clientY - pr.top - offY;
        nx = Math.max(0, Math.min(nx, desk.clientWidth - frame.offsetWidth));
        ny = Math.max(0, Math.min(ny, desk.clientHeight - frame.offsetHeight));
        frame.style.left = nx + "px";
        frame.style.top = ny + "px";
        dragRef.current.pos = { nx, ny };
      };
      const up = () => {
        if (dragRef.current.move) window.removeEventListener("mousemove", dragRef.current.move);
        if (dragRef.current.up) window.removeEventListener("mouseup", dragRef.current.up);
        document.body.style.userSelect = "";
        const p = dragRef.current.pos;
        if (p)
          setState((st) => ({
            ...st,
            windows: st.windows.map((w) => (w.id === id ? { ...w, x: p.nx, y: p.ny } : w)),
          }));
        dragRef.current = {};
      };
      dragRef.current = { move, up, pos: null };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      e.preventDefault();
    },
    [focusWindow]
  );

  // ----------------------------------------------------------------- chat
  const queueReply = useCallback((convoId: string) => {
    const t = typersRef.current;
    clearTimeout(t[convoId + "_t"]);
    clearTimeout(t[convoId + "_r"]);
    t[convoId + "_t"] = setTimeout(
      () =>
        setState((s) => ({
          ...s,
          convos: { ...s.convos, [convoId]: { ...s.convos[convoId], typing: true } },
        })),
      500
    );
    t[convoId + "_r"] = setTimeout(() => {
      const c = stateRef.current.convos[convoId];
      const r = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      let from = c.who as string;
      if (c.kind === "group" && c.members) {
        const m = c.members;
        from = m[Math.floor(Math.random() * m.length)];
      }
      setState((s) => ({
        ...s,
        convos: {
          ...s.convos,
          [convoId]: {
            ...s.convos[convoId],
            typing: false,
            messages: [...s.convos[convoId].messages, { id: Date.now() + 1, from, text: r }],
          },
        },
      }));
    }, 1700 + Math.random() * 900);
  }, []);

  const sendMsgInner = useCallback(
    (convoId: string, kind?: "text" | "sticker", val?: string) => {
      const c = stateRef.current.convos[convoId];
      if (!c) return;
      const text = kind === "sticker" ? (val as string) : (c.draft || "").trim();
      if (!text) return;
      setState((s) => ({
        ...s,
        convos: {
          ...s.convos,
          [convoId]: {
            ...s.convos[convoId],
            draft: kind === "sticker" ? s.convos[convoId].draft : "",
            messages: [...s.convos[convoId].messages, { id: Date.now(), from: "me", kind, text }],
          },
        },
      }));
      queueReply(convoId);
    },
    [queueReply]
  );

  const sendMsg = useCallback((convoId: string) => sendMsgInner(convoId, "text"), [sendMsgInner]);
  const sendSticker = useCallback(
    (convoId: string, em: string) => sendMsgInner(convoId, "sticker", em),
    [sendMsgInner]
  );

  const setConvoDraft = useCallback((convoId: string, v: string) => {
    setState((s) => ({
      ...s,
      convos: { ...s.convos, [convoId]: { ...s.convos[convoId], draft: v } },
    }));
  }, []);

  const ensureConvo = useCallback((personId: string) => {
    if (stateRef.current.convos[personId]) return;
    setState((st) => {
      if (st.convos[personId]) return st;
      return {
        ...st,
        convos: {
          ...st.convos,
          [personId]: {
            id: personId,
            kind: "dm",
            who: personId,
            draft: "",
            typing: false,
            unread: 0,
            messages: [{ id: 1, from: personId, text: "hihi ♡ thanks for the knock!! (＾• ω •＾)" }],
          },
        },
      };
    });
  }, []);

  const openDM = useCallback(
    (personId: string) => {
      ensureConvo(personId);
      openWindow("chat", personId);
    },
    [ensureConvo, openWindow]
  );

  // toggle the current user's reaction (emoji) on a message
  const reactToMsg = useCallback((convoId: string, msgId: number, emoji: string) => {
    setState((s) => {
      const c = s.convos[convoId];
      if (!c) return s;
      return {
        ...s,
        convos: {
          ...s.convos,
          [convoId]: {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== msgId) return m;
              const reactions = { ...(m.reactions || {}) };
              const who = reactions[emoji] ? [...reactions[emoji]] : [];
              const i = who.indexOf("me");
              if (i === -1) who.push("me");
              else who.splice(i, 1);
              if (who.length) reactions[emoji] = who;
              else delete reactions[emoji];
              return { ...m, reactions };
            }),
          },
        },
      };
    });
  }, []);

  // attach a file (in-memory object URL); shows as an attachment bubble
  const sendAttachment = useCallback(
    (convoId: string, file: { name: string; type: string; url: string }) => {
      setState((s) => {
        const c = s.convos[convoId];
        if (!c) return s;
        return {
          ...s,
          convos: {
            ...s.convos,
            [convoId]: {
              ...c,
              messages: [
                ...c.messages,
                { id: Date.now(), from: "me", text: file.name, attachment: file },
              ],
            },
          },
        };
      });
      queueReply(convoId);
    },
    [queueReply]
  );

  // add a person to a group by handle (lightweight friend if unknown)
  const addToGroup = useCallback((convoId: string, handleRaw: string) => {
    const handle = handleRaw.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
    if (!handle) return;
    setState((s) => {
      const c = s.convos[convoId];
      if (!c || c.kind !== "group") return s;
      const members = c.members || [];
      if (members.includes(handle)) return s;
      const friends = { ...s.friends };
      if (!friends[handle] && !PEOPLE[handle]) {
        friends[handle] = { name: handle, color: TINTS[handle.length % TINTS.length] };
      }
      return {
        ...s,
        friends,
        convos: {
          ...s.convos,
          [convoId]: {
            ...c,
            members: [...members, handle],
            messages: [...c.messages, { id: Date.now(), from: handle, text: "joined the chat ✦" }],
          },
        },
      };
    });
  }, []);

  const removeFromGroup = useCallback((convoId: string, memberId: string) => {
    setState((s) => {
      const c = s.convos[convoId];
      if (!c || c.kind !== "group") return s;
      return {
        ...s,
        convos: {
          ...s.convos,
          [convoId]: { ...c, members: (c.members || []).filter((m) => m !== memberId) },
        },
      };
    });
  }, []);

  // ------------------------------------------------------------- guestbook
  const setGuest = useCallback((k: "name" | "text", v: string) => {
    setState((s) => ({ ...s, guestForm: { ...s.guestForm, [k]: v } }));
  }, []);
  const pickGuestFx = useCallback((fx: TextFx) => {
    setState((s) => ({ ...s, guestForm: { ...s.guestForm, fx } }));
  }, []);
  const pickGuestColor = useCallback((c: string) => {
    setState((s) => ({ ...s, guestForm: { ...s.guestForm, color: c } }));
  }, []);
  const signGuest = useCallback(() => {
    setState((s) => {
      const f = s.guestForm;
      const t = (f.text || "").trim();
      if (!t) return s;
      const nm = (f.name || "").trim() || s.profile.handle;
      return {
        ...s,
        guestbook: [
          { id: Date.now(), person: null, name: nm, text: t, fx: f.fx, color: f.color, time: "just now" },
          ...s.guestbook,
        ],
        guestForm: { ...s.guestForm, text: "" },
      };
    });
  }, []);

  // ------------------------------------------------------------- new group
  const setGroupName = useCallback((v: string) => {
    setState((s) => ({ ...s, newGroup: { ...s.newGroup, name: v } }));
  }, []);
  const toggleMember = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      newGroup: { ...s.newGroup, picked: { ...s.newGroup.picked, [id]: !s.newGroup.picked[id] } },
    }));
  }, []);
  const setGroupHandle = useCallback((v: string) => {
    setState((s) => ({ ...s, newGroup: { ...s.newGroup, handleDraft: v.replace(/^@+/, "").replace(/\s+/g, "") } }));
  }, []);
  const addGroupInvite = useCallback(() => {
    setState((s) => {
      const h = (s.newGroup.handleDraft || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
      if (!h) return s;
      // skip dupes and anyone already a known friend (those are picked via the list)
      if (s.newGroup.invites.includes(h)) return { ...s, newGroup: { ...s.newGroup, handleDraft: "" } };
      return { ...s, newGroup: { ...s.newGroup, invites: [...s.newGroup.invites, h], handleDraft: "" } };
    });
  }, []);
  const removeGroupInvite = useCallback((handle: string) => {
    setState((s) => ({
      ...s,
      newGroup: { ...s.newGroup, invites: s.newGroup.invites.filter((h) => h !== handle) },
    }));
  }, []);
  const createGroup = useCallback(
    (winId: string) => {
      const ng = stateRef.current.newGroup;
      const picked = Object.keys(ng.picked).filter((k) => ng.picked[k]);
      const invited = ng.invites.slice();
      const ids = [...picked, ...invited];
      if (!ids.length) return;
      const gid = "g" + Date.now();
      const title = (ng.name || "").trim() || "new group ✦";
      const opener = picked[0] || invited[0];
      setState((s) => {
        // register invited handles as lightweight friends so avatars/names resolve
        const friends = { ...s.friends };
        invited.forEach((h, i) => {
          if (!friends[h] && !PEOPLE[h]) {
            friends[h] = { name: h, color: TINTS[(h.length + i) % TINTS.length] };
          }
        });
        const pendingNote =
          invited.length > 0
            ? [
                {
                  id: 2,
                  from: opener === invited[0] ? picked[0] || invited[0] : invited[0],
                  text: "invites sent to " + invited.map((h) => "@" + h).join(", ") + " ✉",
                },
              ]
            : [];
        return {
          ...s,
          friends,
          convos: {
            ...s.convos,
            [gid]: {
              id: gid,
              kind: "group",
              title,
              members: ids,
              draft: "",
              typing: false,
              unread: 0,
              messages: [{ id: 1, from: opener, text: "yooo new group lessgooo ✦" }, ...pendingNote],
            },
          },
          newGroup: { name: "", picked: {}, invites: [], handleDraft: "" },
        };
      });
      closeWindow(winId);
      openWindow("chat", gid);
    },
    [closeWindow, openWindow]
  );

  // --------------------------------------------------------- friend requests
  const setReqDraft = useCallback((v: string) => {
    setState((s) => ({ ...s, reqDraft: v.replace(/^@+/, "").replace(/\s+/g, "") }));
  }, []);
  const sendRequest = useCallback(() => {
    setState((s) => {
      const h = (s.reqDraft || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
      if (!h) return s;
      if (s.requests.some((r) => r.handle === h && r.dir === "out")) return { ...s, reqDraft: "" };
      const req = {
        id: "rq" + Date.now(),
        handle: h,
        dir: "out" as const,
        color: TINTS[h.length % TINTS.length],
        time: "just now",
      };
      return { ...s, requests: [req, ...s.requests], reqDraft: "" };
    });
  }, []);
  const acceptRequest = useCallback((id: string) => {
    setState((s) => {
      const r = s.requests.find((x) => x.id === id);
      if (!r) return s;
      const friends = { ...s.friends };
      if (!friends[r.handle] && !PEOPLE[r.handle]) {
        friends[r.handle] = { name: r.handle, color: r.color };
      }
      return {
        ...s,
        friends,
        requests: s.requests.filter((x) => x.id !== id),
        profile: {
          ...s.profile,
          counters: { ...s.profile.counters, friends: s.profile.counters.friends + 1 },
        },
      };
    });
  }, []);
  const declineRequest = useCallback((id: string) => {
    setState((s) => ({ ...s, requests: s.requests.filter((x) => x.id !== id) }));
  }, []);

  // --------------------------------------------------- dock / taskbar pinning
  const togglePinApp = useCallback((type: string) => {
    setState((s) => ({
      ...s,
      pinnedApps: s.pinnedApps.includes(type)
        ? s.pinnedApps.filter((t) => t !== type)
        : [...s.pinnedApps, type],
    }));
  }, []);
  const togglePinWin = useCallback((type: string) => {
    setState((s) => ({
      ...s,
      pinnedWins: s.pinnedWins.includes(type)
        ? s.pinnedWins.filter((t) => t !== type)
        : [...s.pinnedWins, type],
    }));
  }, []);

  // ----------------------------------------------------------- profile edit
  const setP = useCallback((k: "name" | "handle" | "pronouns" | "bio", v: string) => {
    const val = k === "handle" ? v.replace(/\s+/g, "") : v;
    setState((s) => ({ ...s, profile: { ...s.profile, [k]: val } }));
  }, []);
  const setProfileVal = useCallback((k: string, v: unknown) => {
    setState((s) => ({ ...s, profile: { ...s.profile, [k]: v } }));
  }, []);
  const setLinkLabel = useCallback((id: string, v: string) => {
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        links: s.profile.links.map((l) => (l.id === id ? { ...l, label: v } : l)),
      },
    }));
  }, []);
  const setLinkField = useCallback((id: string, field: "icon" | "url" | "meta" | "emoji", v: string) => {
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        links: s.profile.links.map((l) => (l.id === id ? { ...l, [field]: v } : l)),
      },
    }));
  }, []);
  const moveLink = useCallback((id: string, d: number) => {
    setState((s) => {
      const a = [...s.profile.links];
      const i = a.findIndex((x) => x.id === id);
      const j = i + d;
      if (j < 0 || j >= a.length) return s;
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
      return { ...s, profile: { ...s.profile, links: a } };
    });
  }, []);
  const removeLink = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, links: s.profile.links.filter((l) => l.id !== id) },
    }));
  }, []);
  const addLink = useCallback(() => {
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        links: [
          ...s.profile.links,
          { id: "l" + Date.now(), emoji: "✦", label: "new link ♡", meta: "", kind: "ext" },
        ],
      },
    }));
  }, []);

  // ------------------------------------------------------------------ misc
  const setTheme = useCallback((t: string) => setState((s) => ({ ...s, theme: t })), []);

  // skin editor -----------------------------------------------------------
  const createCustomTheme = useCallback((base: string) => {
    const baseId = (base.startsWith("custom:") ? "sugar" : base) as ThemeId;
    const id = "custom:" + Math.random().toString(36).slice(2, 8);
    setState((s) => {
      const baseTheme = s.customThemes.find((c) => c.id === base);
      const seedVars = baseTheme ? { ...baseTheme.vars } : {};
      const ct = {
        id,
        name: "my skin",
        sub: "custom mix",
        base: baseTheme ? baseTheme.base : baseId,
        vars: seedVars,
      };
      return { ...s, customThemes: [...s.customThemes, ct], theme: id };
    });
    return id;
  }, []);

  const updateCustomTheme = useCallback(
    (id: string, patch: { name?: string; sub?: string; vars?: Record<string, string> }) => {
      setState((s) => ({
        ...s,
        customThemes: s.customThemes.map((c) =>
          c.id === id
            ? {
                ...c,
                name: patch.name !== undefined ? patch.name : c.name,
                sub: patch.sub !== undefined ? patch.sub : c.sub,
                vars: patch.vars ? { ...c.vars, ...patch.vars } : c.vars,
              }
            : c
        ),
      }));
    },
    []
  );

  const deleteCustomTheme = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      customThemes: s.customThemes.filter((c) => c.id !== id),
      theme: s.theme === id ? "sugar" : s.theme,
    }));
  }, []);

  const importTheme = useCallback((code: string) => {
    const ct = decodeTheme(code);
    if (!ct) return false;
    setState((s) => ({ ...s, customThemes: [...s.customThemes, ct], theme: ct.id }));
    return true;
  }, []);

  const setIconPos = useCallback((id: string, x: number, y: number) => {
    setState((s) => ({ ...s, iconPos: { ...s.iconPos, [id]: { x, y } } }));
  }, []);

  // arrange all non-minimized windows in a grid that fills the desktop
  const tileWindows = useCallback(() => {
    const desk = deskRef.current;
    const r = desk ? desk.getBoundingClientRect() : ({ width: 1000, height: 640 } as DOMRect);
    setState((s) => {
      const vis = s.windows.filter((w) => !w.min);
      const n = vis.length;
      if (!n) return s;
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const gap = 8;
      const cw = Math.floor((r.width - gap * (cols + 1)) / cols);
      const ch = Math.floor((r.height - gap * (rows + 1)) / rows);
      let idx = 0;
      const order = vis.map((w) => w.id);
      return {
        ...s,
        windows: s.windows.map((w) => {
          if (w.min) return w;
          const i = order.indexOf(w.id);
          const col = i % cols;
          const row = Math.floor(i / cols);
          idx++;
          return {
            ...w,
            max: false,
            x: gap + col * (cw + gap),
            y: gap + row * (ch + gap),
            w: cw,
            h: ch,
          };
        }),
      };
    });
  }, []);

  // fan all non-minimized windows out from the top-left in a cascade
  const cascadeWindows = useCallback(() => {
    setState((s) => {
      const vis = s.windows.filter((w) => !w.min);
      const order = vis.map((w) => w.id);
      return {
        ...s,
        windows: s.windows.map((w) => {
          if (w.min) return w;
          const i = order.indexOf(w.id);
          const sz = winSize(w.type);
          return { ...w, max: false, x: 24 + i * 30, y: 18 + i * 28, w: sz.w, h: sz.h };
        }),
      };
    });
  }, []);
  const toggle = useCallback((k: keyof AppState["toggles"]) => {
    setState((s) => ({ ...s, toggles: { ...s.toggles, [k]: !s.toggles[k] } }));
  }, []);
  const setMood = useCallback((m: string) => setState((s) => ({ ...s, mood: m })), []);
  const markNotifRead = useCallback((id: number) => {
    setState((s) => ({
      ...s,
      notifs: s.notifs.map((x) => (x.id === id ? { ...x, unread: false } : x)),
    }));
  }, []);

  // --------------------------------------------------------------- onboarding
  const openOnb = useCallback(() => setState((s) => ({ ...s, onboarding: true, onbStep: 0 })), []);
  const closeOnb = useCallback(() => setState((s) => ({ ...s, onboarding: false, onbStep: 0 })), []);
  const onbPrev = useCallback(
    () => setState((s) => ({ ...s, onbStep: Math.max(0, s.onbStep - 1) })),
    []
  );
  const onbNext = useCallback(
    () => setState((s) => ({ ...s, onbStep: Math.min(3, s.onbStep + 1) })),
    []
  );
  const setOnbHandle = useCallback((v: string) => {
    setState((s) => ({ ...s, onbHandle: v.replace(/\s+/g, "") }));
  }, []);
  const pickOnbMood = useCallback((m: string) => setState((s) => ({ ...s, onbMood: m })), []);
  const setOnbLink = useCallback((i: number, v: string) => {
    setState((s) => {
      const a = [...s.onbLinks];
      a[i] = v;
      return { ...s, onbLinks: a };
    });
  }, []);
  const finishOnb = useCallback(() => {
    setState((s) => ({
      ...s,
      onboarding: false,
      onbStep: 0,
      mood: s.onbMood || s.mood,
      profile: { ...s.profile, handle: s.onbHandle.trim() || s.profile.handle },
    }));
  }, []);

  return {
    state,
    rootRef,
    deskRef,
    msgRefs,
    openWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMax,
    startDrag,
    openDM,
    setConvoDraft,
    sendMsg,
    sendSticker,
    reactToMsg,
    sendAttachment,
    addToGroup,
    removeFromGroup,
    setGuest,
    pickGuestFx,
    pickGuestColor,
    signGuest,
    setGroupName,
    toggleMember,
    createGroup,
    setGroupHandle,
    addGroupInvite,
    removeGroupInvite,
    setReqDraft,
    sendRequest,
    acceptRequest,
    declineRequest,
    togglePinApp,
    togglePinWin,
    setP,
    setProfileVal,
    setLinkLabel,
    setLinkField,
    moveLink,
    removeLink,
    addLink,
    setTheme,
    toggle,
    setMood,
    markNotifRead,
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    importTheme,
    setIconPos,
    tileWindows,
    cascadeWindows,
    openOnb,
    closeOnb,
    onbPrev,
    onbNext,
    setOnbHandle,
    pickOnbMood,
    setOnbLink,
    finishOnb,
  };
}

export { PEOPLE, peopleAll };
