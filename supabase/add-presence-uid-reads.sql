-- ============================================================================
-- Standalone migration: presence + real UID + DM read receipts.
--
-- Run THIS in the Supabase SQL editor (not the whole schema.sql) to add only
-- the new features. Every statement is idempotent (if-not-exists / or-replace /
-- drop-if-exists), so it's safe to run repeatedly and won't collide with any
-- existing tables or policies.
-- ============================================================================

-- ---- Presence: last-active per handle (reuses page_stats) -------------------
alter table public.page_stats add column if not exists last_seen timestamptz;

create or replace function public.bump_presence(h text) returns void
  language sql security definer set search_path = public as $$
  insert into public.page_stats (handle, last_seen) values (h, now())
  on conflict (handle) do update set last_seen = now();
$$;

-- ---- Account UID: site-wide sequential number per handle (first = 1) --------
create table if not exists public.account_uids (
  handle text primary key,
  uid    bigint not null
);
create sequence if not exists public.account_uid_seq start 1;
alter table public.account_uids enable row level security;
drop policy if exists "uids read" on public.account_uids;
create policy "uids read" on public.account_uids for select using (true);

create or replace function public.claim_uid(h text) returns bigint
  language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  select uid into v from public.account_uids where handle = h;
  if v is not null then return v; end if;
  insert into public.account_uids (handle, uid) values (h, nextval('public.account_uid_seq'))
  on conflict (handle) do nothing;
  select uid into v from public.account_uids where handle = h;
  return v;
end;
$$;

-- ---- DM read receipts: last time each handle read a thread ------------------
create table if not exists public.dm_reads (
  thread_id    text not null,
  handle       text not null,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, handle)
);
alter table public.dm_reads enable row level security;
drop policy if exists "dm reads rw" on public.dm_reads;
create policy "dm reads rw" on public.dm_reads for all to authenticated using (true) with check (true);

create or replace function public.mark_read(t text, who text) returns void
  language sql security definer set search_path = public as $$
  insert into public.dm_reads (thread_id, handle, last_read_at) values (t, who, now())
  on conflict (thread_id, handle) do update set last_read_at = now();
$$;

do $$
begin
  begin alter publication supabase_realtime add table public.dm_reads; exception when duplicate_object then null; end;
end $$;
