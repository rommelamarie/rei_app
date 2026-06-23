-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Relinks rei.eisenman@gmail.com's two "New Person" posts (made before the
-- author_id fix, and before their profile name was changed away from
-- "New Person") back to their profile.

update public.posts
set author_id = '081f6181-dc76-4f92-b28f-5c0c0106f1c0'
where id in ('ab52d78f-712f-4730-9e64-9a53fa52e75f', '7d4cb0bc-6ed3-4032-9b22-6230e9c9eee1');
