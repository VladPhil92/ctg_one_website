-- Local/staging dev convenience only — never run against production.
--
-- Supabase's auth.users schema varies enough between versions that
-- hand-inserting rows there is fragile. Instead:
--   1. Sign up a test account through the app's own /registro flow (or
--      `supabase auth admin` / the Studio dashboard's "Add user" UI).
--   2. Promote it to admin with the statement below.

-- update public.profiles set role = 'admin' where email = 'admin@example.com';
