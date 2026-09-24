-- ============================================================
-- Yazkap Properties — tenant profile photos
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run
-- (Requires schema.sql already applied — is_admin() exists there)
-- ============================================================

-- Photo column on portal profiles
alter table public.profiles add column if not exists photo_url text;

-- Public avatar bucket (photos are visible to signed-in users on dashboards)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "public read avatars"        on storage.objects;
drop policy if exists "auth upload avatars"        on storage.objects;
drop policy if exists "auth update own avatars"    on storage.objects;
drop policy if exists "auth delete own avatars"    on storage.objects;

create policy "public read avatars"     on storage.objects for select using (bucket_id = 'avatars');
create policy "auth upload avatars"     on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "auth update own avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "auth delete own avatars" on storage.objects for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');
