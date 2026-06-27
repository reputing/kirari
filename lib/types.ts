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
  | "dms"
  | "notifs"
  | "edit"
  | "settings"
  | "newgroup"
  | "requests";

export interface LinkItem {
  id: string;
  emoji: string;
  label: string;
  meta: string;
  kind: "ext" | "guest";
  icon?: string; // social icon id from the icon library
  url?: string; // destination URL (public page)
  embed?: boolean; // render as an inline player (Spotify/YouTube/SoundCloud) when possible
}

export type PageBgType = "pattern" | "color" | "image" | "video";

export interface Profile {
  name: string;
  handle: string;
  bio: string;
  since: string;
  bg: BgPattern;
  pfpShape: PfpShape;
  pfpColor: string;
  deco: Deco;
  textFx: TextFx;
  links: LinkItem[];
  counters: { views: number; knocks: number; friends: number };
  // ---- public page presentation ----
  pfpUrl?: string; // uploaded avatar image
  audioUrl?: string; // track that plays on visit (no click-to-enter)
  audioTitle?: string; // shown in the mini player
  pageBgType?: PageBgType; // pattern (default) | color | image | video
  pageBgUrl?: string; // image or video URL when type is image/video
  pageBgColor?: string; // solid color when type is color
  cardless?: boolean; // render content directly on the wallpaper (no card)
  translucent?: boolean; // frosted translucent card instead of solid
  translucentAmt?: number; // 0..100 card opacity when translucent (default 68)
  tilt?: boolean; // subtle 3D tilt-on-hover for the card
  cardAnim?: "none" | "float" | "pulse"; // idle card animation
  shadowStrength?: number; // 0..100 card drop-shadow intensity (default 50)
  badges?: string[]; // badge ids shown on the card (self-pick + admin-granted)
  badgeColors?: Record<string, string>; // per-badge color override (id -> hex)

  // ---- biolink theme (independent of the dashboard skin) ----
  pageTheme?: string; // ThemeId or custom id for the PUBLIC page only

  // ---- cinematic entrance ----
  entranceDelay?: number; // seconds the bg plays before content appears (0-10)
  entranceStyle?: "fade" | "drop" | "rise" | "zoom" | "glitch" | "iris"; // reveal style
  staggerMs?: number; // ms between each element appearing (default 220)

  // ---- ambience / grade ----
  ambience?: "none" | "petals" | "rain" | "snow" | "embers" | "orbs"; // overlay
  ambienceDensity?: number; // 0-100
  vignette?: number; // 0-100 edge darkening
  grain?: number; // 0-100 film grain
  grade?: "none" | "noir" | "sepia" | "vhs" | "bloom" | "dream"; // color filter

  // ---- card material ----
  neonGlow?: boolean; // accent-colored glow around the card
  animatedBorder?: boolean; // rotating gradient ring
  outlineText?: boolean; // stroke on the name for legibility on busy bgs
}

// Badge catalog entry. `admin: true` badges can only be granted via the admin panel.
export interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  admin?: boolean;
}

export interface ChatMessage {
  id: number;
  from: string; // "me" or a person id
  kind?: "text" | "sticker";
  text: string;
  // emoji -> who reacted (handles / "me"); rendered as reaction chips under the bubble
  reactions?: Record<string, string[]>;
  // lightweight attachment metadata (in-memory object URL until Supabase Storage)
  attachment?: { name: string; type: string; url: string };
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

// A user-authored skin: a full set of CSS-var overrides + label, stored at
// runtime and selectable like a built-in. Exportable/importable as a code.
export interface CustomTheme {
  id: string; // "custom:xxxx"
  name: string;
  sub: string;
  base: ThemeId; // which built-in it started from (fills any gaps)
  vars: Record<string, string>;
}

// A friend request, incoming (someone knocked) or outgoing (you sent one).
export interface FriendRequest {
  id: string;
  handle: string; // their @handle
  dir: "in" | "out"; // incoming = they requested you; outgoing = you requested them
  note?: string; // short blurb shown on incoming requests
  color: string; // avatar tint
  time: string;
}

export interface AppState {
  theme: string; // ThemeId or a "custom:xxxx" id
  customThemes: CustomTheme[]; // user-authored skins
  fontDisplay?: string; // optional per-account display-font override
  fontBody?: string; // optional per-account body-font override
  dashBgType?: "theme" | "color" | "image"; // dashboard wallpaper source
  dashBgUrl?: string; // dashboard wallpaper image
  dashBgColor?: string; // dashboard wallpaper solid color
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
  requests: FriendRequest[];
  // people the user has befriended at runtime (handle -> Person), merged with seed PEOPLE
  friends: Record<string, Person>;
  // dock apps the user pinned as favorites (WindowType ids)
  pinnedApps: string[];
  // window types pinned to the taskbar (persist even when closed)
  pinnedWins: string[];
  // desktop icon positions, keyed by app id (Windows-style free placement)
  iconPos: Record<string, { x: number; y: number }>;
  guestForm: { name: string; text: string; fx: TextFx; color: string };
  // newGroup.invites = free-typed handles added as pending invitees
  newGroup: { name: string; picked: Record<string, boolean>; invites: string[]; handleDraft: string };
  reqDraft: string; // "send friend request by handle" input
  onboarding: boolean;
  onbStep: number;
  onbHandle: string;
  onbMood: string;
  onbLinks: string[];
}
