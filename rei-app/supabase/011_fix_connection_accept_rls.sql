-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Fixes a real bug: accepting a Neural Link request tries to insert the
-- connection in both directions (so either side can call/DM), but the
-- previous insert policy only allowed auth.uid() = user_id — so the
-- half of that insert "on the other person's behalf" was silently
-- rejected by RLS, and no connection was ever actually created even
-- though the request showed as accepted.

drop policy if exists "users can add their own connections" on public.connections;

create policy "users can add connections from an accepted request" on public.connections
  for insert with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.connection_requests cr
      where cr.status = 'accepted'
        and (
          (cr.sender_id = user_id and cr.recipient_id = auth.uid())
          or (cr.recipient_id = user_id and cr.sender_id = auth.uid())
        )
    )
  );
