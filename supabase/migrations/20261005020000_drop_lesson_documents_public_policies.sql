-- Retire the legacy Supabase Storage bucket `lesson-documents`.
-- NOT APPLIED. SQL only; run manually after review.
--
-- Why: lesson documents live in Cloudflare R2 now (see /api/upload/presign + app/i/lesson/[id]/page.jsx upload flow).
-- Inspected 2026-10-05 (read-only) on qsvwabaxqtbrxrwrqtih:
--   * storage.buckets: lesson-documents, public = true, 0 rows in storage.objects.
--   * storage.objects policies for it: "Public Write" (INSERT), "Public Delete" (DELETE), "Public Read" (SELECT),
--     all granted to {public} (anon included) with only a bucket_id check -> anyone with the anon key could
--     upload to / delete from the bucket.
--   * No app code references the bucket any more (the last two .remove() calls were deleted with this change).
-- Because the bucket is empty and unused, read is dropped too and the bucket is made private.
-- (A public bucket serves objects by URL regardless of policies, so public=false is what closes read.)

DROP POLICY IF EXISTS "Public Write" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Read" ON storage.objects;

UPDATE storage.buckets SET public = false WHERE id = 'lesson-documents';

-- ROLLBACK (exact original definitions from pg_policies; bucket was public = true):
-- CREATE POLICY "Public Read" ON storage.objects AS PERMISSIVE FOR SELECT TO public
--   USING (bucket_id = 'lesson-documents'::text);
-- CREATE POLICY "Public Write" ON storage.objects AS PERMISSIVE FOR INSERT TO public
--   WITH CHECK (bucket_id = 'lesson-documents'::text);
-- CREATE POLICY "Public Delete" ON storage.objects AS PERMISSIVE FOR DELETE TO public
--   USING (bucket_id = 'lesson-documents'::text);
-- UPDATE storage.buckets SET public = true WHERE id = 'lesson-documents';
