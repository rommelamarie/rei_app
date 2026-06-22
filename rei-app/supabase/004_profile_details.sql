-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds extra profile fields surfaced in the Edit Profile screen.

alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists work text;
alter table public.profiles add column if not exists hobby text;
alter table public.profiles add column if not exists interests text;
