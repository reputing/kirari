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
import { makeInitialState, PEOPLE, REPLIES } from "./seed";
import { winSize } from "./styleHelpers";

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

  // guestbook
  setGuest: (k: "name" | "text", v: string) => void;
  pickGuestFx: (fx: TextFx) => void;
  pickGuestColor: (c: string) => void;
  signGuest: () => void;

  // new group
  setGroupName: (v: string) => void;
  toggleMember: (id: string) => void;
  createGroup: (winId: string) => void;

  // profile edit
  setP: (k: "name" | "handle" | "pronouns" | "bio", v: string) => void;
  setProfileVal: (k: string, v: unknown) => void;
  setLinkLabel: (id: string, v: string) => void;
  moveLink: (id: string, d: number) => void;
  removeLink: (id: string) => void;
  addLink: () => void;

  // misc
  setTheme: (t: ThemeId) => void;
  toggle: (k: keyof AppState["toggles"]) => void;
  setMood: (m: string) => void;
  markNotifRead: (id: number) => void;

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
  const createGroup = useCallback(
    (winId: string) => {
      const ng = stateRef.current.newGroup;
      const ids = Object.keys(ng.picked).filter((k) => ng.picked[k]);
      if (!ids.length) return;
      const gid = "g" + Date.now();
      const title = (ng.name || "").trim() || "new group ✦";
      setState((s) => ({
        ...s,
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
            messages: [{ id: 1, from: ids[0], text: "yooo new group lessgooo ✦" }],
          },
        },
        newGroup: { name: "", picked: {} },
      }));
      closeWindow(winId);
      openWindow("chat", gid);
    },
    [closeWindow, openWindow]
  );

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
  const setTheme = useCallback((t: ThemeId) => setState((s) => ({ ...s, theme: t })), []);
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
    setGuest,
    pickGuestFx,
    pickGuestColor,
    signGuest,
    setGroupName,
    toggleMember,
    createGroup,
    setP,
    setProfileVal,
    setLinkLabel,
    moveLink,
    removeLink,
    addLink,
    setTheme,
    toggle,
    setMood,
    markNotifRead,
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

export { PEOPLE };
