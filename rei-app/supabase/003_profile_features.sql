-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds a bio field for profile pages, and links posts/comments back to the
-- author's profile so "View Profile" can be implemented from a post/comment.

alter table public.profiles add column if not exists bio text;

alter table public.posts
  add column if not exists author_id uuid references public.profiles(id) on delete set null;

alter table public.comments
  add column if not exists author_id uuid references public.profiles(id) on delete set null;
