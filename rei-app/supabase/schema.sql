-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  answer text,
  avatar text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_avatar text,
  content text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  likes integer not null default 0,
  has_liked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.registration_requests enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- This app has no real server-side auth (the admin "password" is a client-side
-- check), so these policies allow the anon key full access, matching the
-- existing trust model. Tighten these if real auth is added later.
create policy "anon full access" on public.registration_requests for all using (true) with check (true);
create policy "anon full access" on public.posts for all using (true) with check (true);
create policy "anon full access" on public.comments for all using (true) with check (true);

-- Enables realtime updates so changes show up live across devices/browsers.
alter publication supabase_realtime add table public.registration_requests, public.posts, public.comments;
