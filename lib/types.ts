import type { ThemeId } from "./themes";

// ============================================================================
// Domain types. These mirror the Supabase schema in README.md so the in-memory
// store can be swapped for real Postgres rows with minimal churn.
// ============================================================================

export type TextFx = "none" | "glow" | "rainbow" | "sticker" | "retro3d";
export type BgPattern = "none" | "dots" | "grid" | "gingham" | "stripes" | "hearts";
export type PfpShape = "rounded" | "circle";
export type Deco = "♡" | "★" | "✿" | "none";

export type WindowType =
  | "profile"
  | "chat"
  | "guestbook"
  | "messages"
  | "notifs"
  | "edit"
  | "settings"
  | "newgroup";

export interface LinkItem {
  id: string;
  emoji: string;
  label: string;
  meta: string;
  kind: "ext" | "guest";
}

export interface Profile {
  name: string;
  handle: string;
  pronouns: string;
  bio: string;
  since: string;
  bg: BgPattern;
  pfpShape: PfpShape;
  pfpColor: string;
  deco: Deco;
  textFx: TextFx;
  links: LinkItem[];
  counters: { views: number; knocks: number; friends: number };
}

export interface ChatMessage {
  id: number;
  from: string; // "me" or a person id
  kind?: "text" | "sticker";
  text: string;
}

export interface Convo {
  id: string;
  kind: "dm" | "group";
  who?: string; // DM partner id
  title?: string; // group title
  members?: string[]; // group member ids
  draft: string;
  typing: boolean;
  unread: number;
  messages: ChatMessage[];
}

export interface GuestEntry {
  id: number;
  person: string | null; // null = anonymous signer
  name: string;
  text: string;
  fx: TextFx;
  color: string;
  time: string;
}

export interface NotifItem {
  id: number;
  icon: string;
  who: string;
  text: string;
  time: string;
  unread?: boolean;
  action?: "dm" | "chat" | "guestbook";
  target?: string;
}

export interface WindowState {
  id: string;
  type: WindowType;
  convoId?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
  max: boolean;
  // stored geometry while maximized
  px?: number;
  py?: number;
  pw?: number;
  ph?: number;
}

export interface Toggles {
  knock: boolean;
  counter: boolean;
  statusBlink: boolean;
  sounds: boolean;
  rain: boolean;
}

export interface Person {
  name: string;
  color: string;
}

export interface AppState {
  theme: ThemeId;
  now: number;
  isMobile: boolean;
  zTop: number;
  mood: string;
  toggles: Toggles;
  profile: Profile;
  windows: WindowState[];
  convos: Record<string, Convo>;
  guestbook: GuestEntry[];
  notifs: NotifItem[];
  guestForm: { name: string; text: string; fx: TextFx; color: string };
  newGroup: { name: string; picked: Record<string, boolean> };
  onboarding: boolean;
  onbStep: number;
  onbHandle: string;
  onbMood: string;
  onbLinks: string[];
}
