-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds:
--   1) connections: who each user has added to their "Neural Link" list.
--   2) posts.post_type: tags a post as a system "user joined" announcement
--      so the Hub feed can show "Have you met in person?" + an Add to
--      Neural Link button on it.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, connection_id)
);

alter table public.connections enable row level security;

create policy "connections are viewable by everyone" on public.connections
  for select using (true);

create policy "users can add their own connections" on public.connections
  for insert with check (auth.uid() = user_id);

create policy "users can remove their own connections" on public.connections
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.connections;

alter table public.posts add column if not exists post_type text not null default 'user' check (post_type in ('user', 'join_announcement'));
