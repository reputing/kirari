-- kirari.cafe — Postgres schema for Supabase
-- Mirrors the data model in the design handoff README 1:1.
-- Apply with: supabase db reset  (or paste into the SQL editor).

create extension if not exists "pgcrypto";

-- profiles (id = auth.uid)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,              -- "yuki" → kirari.cafe/@yuki
  display_name  text not null,                     -- "yuki ☆彡"
  pronouns      text,                              -- "she/they"
  bio           text,
  mood          text,                              -- "♡ sleepy + online"
  theme         text not null default 'sugar',     -- sugar | angel | kuro | ostan
  bg            text not null default 'none',      -- none | dots | grid | gingham | stripes | hearts
  pfp_url       text,                              -- Supabase Storage URL
  pfp_shape     text not null default 'rounded',   -- rounded | circle
  pfp_color     text not null default '#ff7ec0',   -- frame border color
  deco          text not null default 'heart',     -- corner charm: heart | star | flower | none
  text_fx       text not null default 'none',      -- none | glow | rainbow | sticker | retro3d
  show_counters boolean not null default true,
  allow_knocks  boolean not null default true,
  status_blink  boolean not null default true,
  sparkle_rain  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- links (profile bio links, drag-reorderable)
create table public.links (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  emoji       text,
  label       text not null,
  meta        text,
  url         text,
  sort_order  int not null default 0
);

-- guestbook entries
create table public.guestbook (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,  -- null = anonymous
  author_name text not null,
  text        text not null,
  fx          text not null default 'none',
  color       text not null default '#ff7ec0',
  created_at  timestamptz not null default now()
);

-- conversations
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,                        -- dm | group
  title      text,                                 -- null for DMs
  created_at timestamptz not null default now()
);

-- conversation members
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- messages
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,                   -- text or sticker emoji
  kind            text not null default 'text',    -- text | sticker
  created_at      timestamptz not null default now()
);

-- notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade, -- recipient
  icon       text,                                 -- ✉ ★ ✦ ♫ ✿
  title      text not null,
  action     text,                                 -- dm | chat | guestbook | null
  target_id  text,                                 -- conversation or profile id
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- indexes for the hot read paths
create index on public.links (profile_id, sort_order);
create index on public.guestbook (profile_id, created_at desc);
create index on public.messages (conversation_id, created_at);
create index on public.conversation_members (user_id);
create index on public.notifications (user_id, created_at desc);

-- Realtime: stream message + notification inserts
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Row Level Security (starter policies — tighten before production)
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.links                enable row level security;
alter table public.guestbook            enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.notifications        enable row level security;

-- profiles + links are public to read; only the owner may write
create policy "profiles readable"  on public.profiles for select using (true);
create policy "profiles writable"  on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "links readable"     on public.links    for select using (true);
create policy "links writable"     on public.links    for all
  using (exists (select 1 from public.profiles p where p.id = links.profile_id and p.id = auth.uid()));

-- guestbook: public read, anyone signed-in (or anon) may sign
create policy "guestbook readable" on public.guestbook for select using (true);
create policy "guestbook signable" on public.guestbook for insert with check (true);

-- conversations + messages: members only
create policy "convos visible to members" on public.conversations for select
  using (exists (select 1 from public.conversation_members m
                 where m.conversation_id = conversations.id and m.user_id = auth.uid()));
create policy "membership visible" on public.conversation_members for select
  using (user_id = auth.uid());
create policy "messages visible to members" on public.messages for select
  using (exists (select 1 from public.conversation_members m
                 where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
create policy "members can send" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversation_members m
    where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));

-- notifications: recipient only
create policy "own notifications" on public.notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
