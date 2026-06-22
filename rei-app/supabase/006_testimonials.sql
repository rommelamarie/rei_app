-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds testimonials: long-form notes other members leave on a profile,
-- moderated by the profile owner (approve / deny / archive).

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_avatar text,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Matches this app's existing trust model (anon key, no real per-row auth
-- checks) used by posts/comments/profiles. Moderation (approve/deny/archive)
-- is enforced client-side only, by showing those controls solely to the
-- profile owner viewing their own profile.
create policy "anon full access" on public.testimonials for all using (true) with check (true);

alter publication supabase_realtime add table public.testimonials;
