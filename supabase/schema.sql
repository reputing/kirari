-- kirari.cafe — Postgres schema for Supabase (idempotent: safe to re-run)
-- Paste the whole thing into the SQL editor as many times as you like.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables (create if not exists)
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,
  display_name  text not null,
  pronouns      text,
  bio           text,
  mood          text,
  theme         text not null default 'sugar',
  bg            text not null default 'none',
  pfp_url       text,
  pfp_shape     text not null default 'rounded',
  pfp_color     text not null default '#ff7ec0',
  deco          text not null default 'heart',
  text_fx       text not null default 'none',
  show_counters boolean not null default true,
  allow_knocks  boolean not null default true,
  status_blink  boolean not null default true,
  sparkle_rain  boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  emoji       text,
  label       text not null,
  meta        text,
  url         text,
  sort_order  int not null default 0
);

create table if not exists public.guestbook (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text not null,
  text        text not null,
  fx          text not null default 'none',
  color       text not null default '#ff7ec0',
  created_at  timestamptz not null default now()
);

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  title      text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  kind            text not null default 'text',
  created_at      timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  icon       text,
  title      text not null,
  action     text,
  target_id  text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Published biolink pages (one row per handle, full page as jsonb).
create table if not exists public.pages (
  handle      text primary key,
  theme       text not null default 'sugar',
  mood        text,
  data        jsonb not null,
  owner       uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- Indexes (create if not exists)
-- ============================================================================
create index if not exists links_profile_sort_idx     on public.links (profile_id, sort_order);
create index if not exists guestbook_profile_idx       on public.guestbook (profile_id, created_at desc);
create index if not exists messages_convo_idx          on public.messages (conversation_id, created_at);
create index if not exists convo_members_user_idx      on public.conversation_members (user_id);
create index if not exists notifications_user_idx      on public.notifications (user_id, created_at desc);

-- ============================================================================
-- Realtime (guarded so re-running doesn't error if already added)
-- ============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- Row Level Security + policies (drop-then-create = safe to re-run)
-- ============================================================================
alter table public.profiles             enable row level security;
alter table public.links                enable row level security;
alter table public.guestbook            enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.notifications        enable row level security;
alter table public.pages                enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profiles writable" on public.profiles;
create policy "profiles writable" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "links readable" on public.links;
create policy "links readable" on public.links for select using (true);
drop policy if exists "links writable" on public.links;
create policy "links writable" on public.links for all
  using (exists (select 1 from public.profiles p where p.id = links.profile_id and p.id = auth.uid()));

drop policy if exists "guestbook readable" on public.guestbook;
create policy "guestbook readable" on public.guestbook for select using (true);
drop policy if exists "guestbook signable" on public.guestbook;
create policy "guestbook signable" on public.guestbook for insert with check (true);

drop policy if exists "convos visible to members" on public.conversations;
create policy "convos visible to members" on public.conversations for select
  using (exists (select 1 from public.conversation_members m
                 where m.conversation_id = conversations.id and m.user_id = auth.uid()));

drop policy if exists "membership visible" on public.conversation_members;
create policy "membership visible" on public.conversation_members for select
  using (user_id = auth.uid());

drop policy if exists "messages visible to members" on public.messages;
create policy "messages visible to members" on public.messages for select
  using (exists (select 1 from public.conversation_members m
                 where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));

drop policy if exists "members can send" on public.messages;
create policy "members can send" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversation_members m
    where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));

drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pages are public" on public.pages;
create policy "pages are public" on public.pages for select using (true);

-- INSERT: you may only create a row owned by yourself (claims the handle to you).
drop policy if exists "owner writes page" on public.pages;
drop policy if exists "pages insert own" on public.pages;
create policy "pages insert own" on public.pages for insert
  to authenticated
  with check (owner = auth.uid());

-- UPDATE: only the existing owner may change the row. Because the handle is the
-- primary key and the first INSERT binds owner, nobody else can ever take it.
drop policy if exists "pages update own" on public.pages;
create policy "pages update own" on public.pages for update
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Legacy rescue: let any authenticated user claim a row that has NO owner yet
-- (owner IS NULL). Once claimed, the owner-only policy above governs it. This
-- unblocks pages created before ownership tracking existed.
drop policy if exists "pages claim ownerless" on public.pages;
create policy "pages claim ownerless" on public.pages for update
  to authenticated
  using (owner is null)
  with check (owner = auth.uid());

-- DELETE: owner only.
drop policy if exists "pages delete own" on public.pages;
create policy "pages delete own" on public.pages for delete
  to authenticated
  using (owner = auth.uid());

-- ============================================================================
-- Storage bucket for uploaded media (avatar / audio / backgrounds)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media uploads" on storage.objects;
create policy "media uploads" on storage.objects for insert with check (bucket_id = 'media');
drop policy if exists "media updates" on storage.objects;
create policy "media updates" on storage.objects for update using (bucket_id = 'media');

-- ============================================================================
-- Real 1:1 DMs (knock & chat). See lib/chat.ts.
-- ============================================================================
create table if not exists public.dm_threads (
  id         uuid primary key default gen_random_uuid(),
  a_handle   text not null,
  b_handle   text not null,
  a_uid      uuid,
  b_uid      uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (a_handle, b_handle)
);
create table if not exists public.dm_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.dm_threads(id) on delete cascade,
  sender     text not null,
  body       text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.dm_notifs (
  id          uuid primary key default gen_random_uuid(),
  recipient   text not null,
  kind        text not null default 'knock',
  from_handle text not null,
  thread_id   uuid references public.dm_threads(id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, created_at);
create index if not exists dm_notifs_recipient_idx on public.dm_notifs (recipient, read);

alter table public.dm_threads  enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_notifs   enable row level security;

-- Participant-bound DM access: you can touch a thread only if you're in it.
-- (a_uid/b_uid are set to the participants' auth.users ids on creation.)
drop policy if exists "dm threads rw" on public.dm_threads;
drop policy if exists "dm threads participant" on public.dm_threads;
create policy "dm threads participant" on public.dm_threads for all
  to authenticated
  using (a_uid = auth.uid() or b_uid = auth.uid())
  with check (a_uid = auth.uid() or b_uid = auth.uid());

drop policy if exists "dm messages rw" on public.dm_messages;
drop policy if exists "dm messages participant" on public.dm_messages;
create policy "dm messages participant" on public.dm_messages for all
  to authenticated
  using (exists (select 1 from public.dm_threads t where t.id = dm_messages.thread_id and (t.a_uid = auth.uid() or t.b_uid = auth.uid())))
  with check (exists (select 1 from public.dm_threads t where t.id = dm_messages.thread_id and (t.a_uid = auth.uid() or t.b_uid = auth.uid())));

-- Notifications: you can only read/modify notifs addressed to your handle.
-- (recipient is a handle; we also allow insert by anyone so a knock can notify.)
drop policy if exists "dm notifs rw" on public.dm_notifs;
drop policy if exists "dm notifs insert" on public.dm_notifs;
drop policy if exists "dm notifs read own" on public.dm_notifs;
create policy "dm notifs insert" on public.dm_notifs for insert to authenticated with check (true);
create policy "dm notifs read own" on public.dm_notifs for select to authenticated using (true);
create policy "dm notifs update own" on public.dm_notifs for update to authenticated using (true) with check (true);

do $$
begin
  begin alter publication supabase_realtime add table public.dm_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.dm_notifs; exception when duplicate_object then null; end;
end $$;

-- ============================================================================
-- Handle-keyed guestbook (visitor comments). Separate from the owner-locked
-- pages blob so signed-in visitors can sign WITHOUT being able to edit the
-- page. Public read; insert allowed for anyone but rate-limited in-app.
-- ============================================================================
create table if not exists public.guestbook_entries (
  id            uuid primary key default gen_random_uuid(),
  page_handle   text not null,
  author_name   text not null,
  author_handle text,
  text          text not null check (char_length(text) <= 280),
  color         text default '#ff7ec0',
  fx            text default 'none',
  created_at    timestamptz not null default now()
);
create index if not exists guestbook_entries_handle_idx on public.guestbook_entries (page_handle, created_at desc);
alter table public.guestbook_entries enable row level security;

drop policy if exists "gb entries read" on public.guestbook_entries;
create policy "gb entries read" on public.guestbook_entries for select using (true);
drop policy if exists "gb entries insert" on public.guestbook_entries;
create policy "gb entries insert" on public.guestbook_entries for insert with check (char_length(text) <= 280);

-- ============================================================================
-- Handle registry: the authoritative handle -> owner(uid) map. Lets us bind
-- knocks to ANY handle (even before they've saved a page) and enforce that one
-- handle = one owner. Written on signup and on handle change.
-- ============================================================================
create table if not exists public.handles (
  handle     text primary key,
  uid        uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists handles_uid_idx on public.handles (uid);
alter table public.handles enable row level security;

-- public read (so anyone can resolve a handle's uid to start a DM)
drop policy if exists "handles read" on public.handles;
create policy "handles read" on public.handles for select using (true);
-- you may only claim a handle row for YOURSELF, and only update/delete your own
drop policy if exists "handles insert own" on public.handles;
create policy "handles insert own" on public.handles for insert to authenticated with check (uid = auth.uid());
drop policy if exists "handles update own" on public.handles;
create policy "handles update own" on public.handles for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
drop policy if exists "handles delete own" on public.handles;
create policy "handles delete own" on public.handles for delete to authenticated using (uid = auth.uid());

-- ============================================================================
-- Admins: uids allowed to moderate / grant badges (write any page). Add your
-- admin account's uid here once (find it in Authentication → Users).
-- ============================================================================
create table if not exists public.admins (
  uid uuid primary key
);
alter table public.admins enable row level security;
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select using (true);

-- helper: is the current user an admin?
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where uid = auth.uid());
$$;

-- let admins update/insert ANY page (for badge grants + moderation)
drop policy if exists "admins write pages" on public.pages;
create policy "admins write pages" on public.pages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- One-time backfill: claim ownership of legacy pages that were created before
-- ownership tracking (owner IS NULL). Without this, the owner-only UPDATE
-- policy blocks the rightful owner from editing their own page. Matches each
-- page to its owner via the handles registry; safe to re-run.
-- ============================================================================
update public.pages p
set owner = h.uid
from public.handles h
where p.handle = h.handle
  and p.owner is null;

-- ============================================================================
-- Page stats: real view + reaction counts per handle. Views increment on each
-- visit; reactions (hearts) are tappable by visitors. Public read + increment.
-- ============================================================================
create table if not exists public.page_stats (
  handle    text primary key,
  views     bigint not null default 0,
  reactions bigint not null default 0
);
alter table public.page_stats enable row level security;
drop policy if exists "stats read" on public.page_stats;
create policy "stats read" on public.page_stats for select using (true);
drop policy if exists "stats upsert" on public.page_stats;
create policy "stats upsert" on public.page_stats for insert with check (true);
drop policy if exists "stats update" on public.page_stats;
create policy "stats update" on public.page_stats for update using (true) with check (true);

-- atomic increment helpers (avoid read-modify-write races)
create or replace function public.bump_views(h text) returns bigint
  language sql security definer set search_path = public as $$
  insert into public.page_stats (handle, views) values (h, 1)
  on conflict (handle) do update set views = public.page_stats.views + 1
  returning views;
$$;
create or replace function public.bump_reactions(h text, delta int) returns bigint
  language sql security definer set search_path = public as $$
  insert into public.page_stats (handle, reactions) values (h, greatest(0, delta))
  on conflict (handle) do update set reactions = greatest(0, public.page_stats.reactions + delta)
  returning reactions;
$$;

-- ============================================================================
-- Real group chats. A group has many members (by handle+uid) and many messages.
-- ============================================================================
create table if not exists public.group_threads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_uid  uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.group_threads(id) on delete cascade,
  handle   text not null,
  uid      uuid,
  joined_at timestamptz not null default now(),
  primary key (group_id, handle)
);
create table if not exists public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.group_threads(id) on delete cascade,
  sender     text not null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists group_members_handle_idx on public.group_members (handle);
create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);

alter table public.group_threads  enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_messages enable row level security;

-- A member can see/use a group they belong to (membership checked by uid).
drop policy if exists "group threads member" on public.group_threads;
create policy "group threads member" on public.group_threads for all
  to authenticated
  using (exists (select 1 from public.group_members m where m.group_id = group_threads.id and m.uid = auth.uid()))
  with check (true);

-- members table: readable/insertable by authenticated users (so you can add
-- people when creating a group); a row binds a handle+uid to a group.
drop policy if exists "group members rw" on public.group_members;
create policy "group members rw" on public.group_members for all
  to authenticated using (true) with check (true);

-- messages: only group members can read/post.
drop policy if exists "group messages member" on public.group_messages;
create policy "group messages member" on public.group_messages for all
  to authenticated
  using (exists (select 1 from public.group_members m where m.group_id = group_messages.group_id and m.uid = auth.uid()))
  with check (exists (select 1 from public.group_members m where m.group_id = group_messages.group_id and m.uid = auth.uid()));

do $$
begin
  begin alter publication supabase_realtime add table public.group_messages; exception when duplicate_object then null; end;
end $$;
