-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Persists direct messages between real accounts (the AI contact stays
-- in-memory/client-side, unaffected) so chats survive a refresh and sync
-- across devices, plus support live "new message" notifications.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_participants_idx on public.messages (sender_id, recipient_id, created_at);

alter table public.messages enable row level security;

create policy "participants can view their messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "senders can send messages" on public.messages
  for insert with check (auth.uid() = sender_id);

alter publication supabase_realtime add table public.messages;
