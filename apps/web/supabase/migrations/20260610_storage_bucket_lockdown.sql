-- Storage bucket lockdown (2026-06-10)
--
-- 1) Remove public LISTING of the avatars/resources buckets.
--    Both buckets stay public for downloads: /object/public/* URLs check only
--    buckets.public and never consult RLS, so avatar images and resource links
--    keep working. What goes away is the ability for anyone with the anon key
--    to enumerate every object (student names in avatar/resource filenames).
--    No app code calls storage .list() with the anon/user client.
--
-- 2) Scope avatar writes to the owner. The old INSERT/UPDATE/DELETE policies
--    checked only bucket_id, so ANY caller (including anonymous) could
--    overwrite or delete any user's avatar. Mobile uploads avatars as
--    `<auth uid>.jpg` with the user's JWT; web routes use the service role
--    (bypasses RLS). Policies below allow each authenticated user to manage
--    only the file named after their own uid.

-- 1) Kill public listing
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Public Access" on storage.objects;

-- Keep SELECT on one's own avatar object (mobile re-upload uses upsert, which
-- may need to read the existing object; this does not allow listing others)
drop policy if exists "Users can view own avatar" on storage.objects;
create policy "Users can view own avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);

-- 2) Owner-scoped avatar writes
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);
