-- Remediation: Lock down file_buckets RLS
-- Priority 0: Prevent unauthorized updates

-- Revoke the overly permissive "Owner can update bucket" policy
DROP POLICY IF EXISTS "Owner can update bucket" ON file_buckets;

-- Create a new policy that only allows INSERT (creation)
-- Updates must now happen via Edge Functions (Service Role)
CREATE POLICY "Anyone can create bucket"
  ON file_buckets FOR INSERT
  WITH CHECK (true);

-- Ensure SELECT is still allowed (already exists as "Anyone can read bucket status")
-- But let's double check and maybe restrict it if we want to be stricter later.
-- For now, we keep "Anyone can read bucket status" as is (USING true), 
-- because we handle metadata redaction in the Edge Function (get-bucket-status).

-- Explicitly deny UPDATE/DELETE for public users
-- (Implicitly denied by not having a policy, but good to be clear in intent)
-- The only way to update/delete is via Service Role (Edge Functions)

COMMENT ON TABLE file_buckets IS 'Persistent QR code buckets. Updates restricted to Edge Functions.';
