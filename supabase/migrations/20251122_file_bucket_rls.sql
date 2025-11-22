-- Tighten file bucket RLS policies so only the service role (edge functions)
-- can mutate or read raw bucket records. All public access should go through
-- edge functions which already enforce auth/rate limits.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'file_buckets'
      AND policyname = 'Anyone can read bucket status'
  ) THEN
    DROP POLICY "Anyone can read bucket status" ON file_buckets;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'file_buckets'
      AND policyname = 'Owner can update bucket'
  ) THEN
    DROP POLICY "Owner can update bucket" ON file_buckets;
  END IF;
END $$;

CREATE POLICY "Service role can read bucket status"
  ON file_buckets FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can mutate bucket"
  ON file_buckets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
