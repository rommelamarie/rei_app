-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds real user accounts (first/last name, email, password via Supabase Auth)
-- to replace the old open username-only registration_requests flow.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  avatar text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can see everyone's profile (needed for the contact list,
-- community posts, and admin Network Map). Each user can only create/edit
-- their own row.
create policy "profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Lets the admin Master Console (using the anon key, no real admin auth yet)
-- remove a profile row from Network Map.
create policy "anon can delete profiles" on public.profiles
  for delete using (true);

alter publication supabase_realtime add table public.profiles;

-- The old approval-queue table is no longer used by the app (signup is now
-- open and account-based). Left in place rather than dropped, in case any
-- old pending/approved rows are still of interest.
