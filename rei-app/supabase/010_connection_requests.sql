-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Turns "Add to Neural Link" into a request/accept/decline flow instead of
-- an immediate one-directional add. Accepting a request creates the
-- connection in both directions, so either side can then call/DM freely.

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (sender_id, recipient_id)
);

alter table public.connection_requests enable row level security;

create policy "participants can view their requests" on public.connection_requests
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "users can send requests" on public.connection_requests
  for insert with check (auth.uid() = sender_id);

create policy "recipients can respond, senders can cancel" on public.connection_requests
  for update using (auth.uid() = recipient_id or auth.uid() = sender_id);

create policy "senders can cancel their pending request" on public.connection_requests
  for delete using (auth.uid() = sender_id);

alter publication supabase_realtime add table public.connection_requests;
