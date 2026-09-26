-- Yazkap Properties — photo column for the tenants roster (admin page)
-- Run ONCE in Supabase Dashboard → SQL Editor → New query → Run
alter table public.tenants add column if not exists photo_url text;
