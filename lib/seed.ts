import type { AppState, Person } from "./types";

// ============================================================================
// Seed constants + initial state. Copied from the prototype's Component class.
// In production these become Supabase queries; the shapes are identical so the
// view-model builders never need to change.
// ============================================================================

export const REPLIES = [
  "omg yes ♡",
  "EEE okok!!",
  "sending it rn ☆",
  "ur the sweetest ;;",
  "brb saving that (๑>ᴗ<๑)",
  "wait that's so cute",
  "♡♡♡",
  "yesss pls!!",
  "saving u to faves ✩",
  "syssy that's elite",
  "no bc same",
  "be there in 5 ✦",
];

export const MOODS = [
  "♡ sleepy + online",
  "★ making art rn",
  "♫ vibing to dream pop",
  "✧ away, brb",
  "⊹ do not disturb",
  "꒰ᐢ. .ᐢ꒱ napping",
  "☆ feeling sparkly",
];

export const STICKERS = ["🌟", "♡", "✿", "★", "☁", "🍓", "✦", "🐰", "✧", "💿", "🎀", "⭐"];

// Emoji palette for the in-composer picker and the quick-reaction row.
export const EMOJIS = [
  "😊","😂","🥺","😳","😎","😭","🥰","😤","😴","🤔","😅","🙃",
  "👍","🙏","👀","💪","✌️","🤝","👋","🫶","🤞","💅","🫠","🤗",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💖","💕","💓","💗",
  "✨","⭐","🌟","💫","🔥","🌈","☁️","⚡","💧","🌸","🌷","🍀",
  "🎀","🎧","🎵","🎮","📷","💿","☕","🍓","🍰","🧁","🍙","🐰",
];

export const PEOPLE: Record<string, Person> = {
  momoka: { name: "momoka", color: "#ff7ec0" },
  ren: { name: "ren", color: "#7cc0ff" },
  kaito: { name: "kaito", color: "#54c9a8" },
  nao: { name: "nao", color: "#b48cff" },
  hana: { name: "hana", color: "#e7a93a" },
};

// Avatar tints assigned to friends added at runtime (by handle).
export const TINTS = ["#ff9ec4", "#8ac6ff", "#67cbb0", "#c3a3ff", "#e7b24a", "#ff8fa0", "#76d0e0"];

// Seed people merged with any friends the user gained at runtime.
export function peopleAll(friends: Record<string, Person>): Record<string, Person> {
  return { ...PEOPLE, ...friends };
}

export function makeInitialState(): AppState {
  return {
    theme: "sugar",
    customThemes: [],
    now: Date.now(),
    isMobile: false,
    zTop: 5,
    mood: "♡ sleepy + online",
    toggles: { knock: true, counter: true, statusBlink: true, sounds: true, rain: false },
    profile: {
      name: "yuki ☆彡",
      handle: "yuki",
      pronouns: "she/they",
      bio: "16 · digital doodles & dream pop · i answer every knock so pls be nice (｡•ᴗ•｡)♡",
      since: "online since '09 ♡ saturn standard time",
      bg: "dots",
      pfpShape: "rounded",
      pfpColor: "var(--accent)",
      deco: "♡",
      textFx: "glow",
      links: [
        { id: "art", emoji: "✿", label: "my art gallery", meta: "142 visits today", kind: "ext", icon: "artstation", url: "https://example.com/art" },
        { id: "music", emoji: "♫", label: "now playing: dream pop mix", meta: "on repeat ♡", kind: "ext", icon: "spotify", url: "https://example.com/music" },
        { id: "shop", emoji: "✩", label: "shop my prints", meta: "restocked!", kind: "ext", icon: "etsy", url: "https://example.com/shop" },
        { id: "guest", emoji: "★", label: "sign my guestbook", meta: "48 signs", kind: "guest" },
        { id: "about", emoji: "⊹", label: "about / my carrd", meta: "", kind: "ext", icon: "venmo13", url: "https://example.com/about" },
      ],
      counters: { views: 12840, knocks: 318, friends: 92 },
      pfpUrl: undefined,
      audioUrl: undefined,
      audioTitle: "dream pop mix ♡",
      pageBgType: "pattern",
      pageBgUrl: undefined,
      pageBgColor: undefined,
      cardless: false,
      translucent: false,
    },
    windows: [
      { id: "w-profile", type: "profile", x: 30, y: 24, w: 380, h: 566, z: 4, min: false, max: false },
      { id: "w-grp", type: "chat", convoId: "sparkleclub", x: 438, y: 96, w: 362, h: 470, z: 3, min: false, max: false },
    ],
    convos: {
      momoka: {
        id: "momoka", kind: "dm", who: "momoka", draft: "", typing: false, unread: 1,
        messages: [
          { id: 1, from: "momoka", text: "knock knock!! i found u thru ur art gallery link omg ✨" },
          { id: 2, from: "me", text: "AA tysm for knocking ;; which piece did u like??" },
          { id: 3, from: "momoka", text: "the one w the falling stars… can i req a print?? ♡" },
        ],
      },
      ren: {
        id: "ren", kind: "dm", who: "ren", draft: "", typing: false, unread: 0,
        messages: [
          { id: 1, from: "ren", text: "didja see the new dream pop drop?? ♡" },
          { id: 2, from: "me", text: "omg downloading rn" },
        ],
      },
      sparkleclub: {
        id: "sparkleclub", kind: "group", title: "✦ sparkle club ✦",
        members: ["momoka", "ren", "kaito", "nao"], draft: "", typing: false, unread: 3,
        messages: [
          { id: 1, from: "kaito", text: "who's online for a sticker war ☆" },
          { id: 2, from: "momoka", text: "MEEE ✋" },
          { id: 3, from: "ren", text: "10pm raid on yuki's guestbook lol" },
          { id: 4, from: "me", text: "im in, brb grabbing snacks 🍓" },
          { id: 5, from: "nao", text: "bringing the glitter gifs ✨✨" },
        ],
      },
      arttrade: {
        id: "arttrade", kind: "group", title: "art trade ♡",
        members: ["nao", "hana"], draft: "", typing: false, unread: 0,
        messages: [
          { id: 1, from: "hana", text: "lineart done!! sending wip ✿" },
          { id: 2, from: "nao", text: "aaa so cute, coloring mine now ♡" },
        ],
      },
    },
    guestbook: [
      { id: 1, person: "ren", name: "ren", text: "first ☆!! ur page is so cute omg how do u do the bg", fx: "rainbow", color: "#7cc0ff", time: "2h" },
      { id: 2, person: "kaito", name: "kaito", text: "knock knock~ raid tonight?? bring stickers ✦", fx: "glow", color: "#54c9a8", time: "5h" },
      { id: 3, person: "nao", name: "nao", text: "signing before i forget ♡ luv the new portrait charm", fx: "sticker", color: "#b48cff", time: "1d" },
      { id: 4, person: "hana", name: "hana", text: "✿ marking my territory ✿ ur mutuals now ok", fx: "retro3d", color: "#e7a93a", time: "2d" },
      { id: 5, person: "momoka", name: "momoka", text: "48th!! do i win a prize (｡•ᴗ•｡)", fx: "none", color: "#ff7ec0", time: "3d" },
    ],
    notifs: [
      { id: 1, icon: "✉", who: "momoka", text: "knocked on your door ♡", time: "2 min ago", unread: true, action: "dm", target: "momoka" },
      { id: 2, icon: "★", who: "ren", text: "signed your guestbook", time: "1 hr ago", unread: true, action: "guestbook" },
      { id: 3, icon: "✦", who: "", text: "sparkle club has 3 new messages", time: "2 hr ago", action: "chat", target: "sparkleclub" },
      { id: 4, icon: "♫", who: "kaito", text: "reacted 😺 to your status", time: "5 hr ago" },
      { id: 5, icon: "✿", who: "", text: "12 new visitors from your art link", time: "today" },
    ],
    guestForm: { name: "", text: "", fx: "glow", color: "#ff7ec0" },
    newGroup: { name: "", picked: {}, invites: [], handleDraft: "" },
    requests: [
      { id: "rq1", handle: "saki", dir: "in", note: "found u thru sparkle club ♡ add me??", color: "#ff9ec4", time: "10 min ago" },
      { id: "rq2", handle: "yuu", dir: "in", note: "mutuals w momoka! lets be friends ✦", color: "#8ac6ff", time: "1 hr ago" },
      { id: "rq3", handle: "miki", dir: "in", note: "luv ur art gallery (｡•ᴗ•｡)", color: "#c3a3ff", time: "3 hr ago" },
      { id: "rq4", handle: "rui", dir: "out", color: "#67cbb0", time: "yesterday" },
    ],
    friends: {},
    pinnedApps: ["profile", "messages"],
    pinnedWins: [],
    iconPos: {},
    reqDraft: "",
    onboarding: false,
    onbStep: 0,
    onbHandle: "",
    onbMood: "",
    onbLinks: ["", "", ""],
  };
}
