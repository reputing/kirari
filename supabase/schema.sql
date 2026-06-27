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
drop policy if exists "owner writes page" on public.pages;
create policy "owner writes page" on public.pages for all
  using (owner is null or owner = auth.uid())
  with check (owner is null or owner = auth.uid());

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
