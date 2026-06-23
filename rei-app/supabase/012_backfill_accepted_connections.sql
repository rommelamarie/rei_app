-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- One-time backfill: any connection_requests row already marked 'accepted'
-- before the 011 RLS fix may be missing its connections rows (the bug fixed
-- in 011 silently dropped half the insert). This recreates them.

insert into public.connections (user_id, connection_id)
select sender_id, recipient_id from public.connection_requests where status = 'accepted'
union
select recipient_id, sender_id from public.connection_requests where status = 'accepted'
on conflict (user_id, connection_id) do nothing;
