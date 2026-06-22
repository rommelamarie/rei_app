-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Lets each user control whether other members can view their profile details.

alter table public.profiles add column if not exists is_public boolean not null default true;
