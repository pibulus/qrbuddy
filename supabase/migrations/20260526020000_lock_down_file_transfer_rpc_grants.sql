-- Lock down internal file-transfer RPCs so public clients cannot bypass
-- Edge Function authorization and password checks.

ALTER FUNCTION public.claim_destructible_file_download(UUID)
  SET search_path = public;
ALTER FUNCTION public.finalize_destructible_file_download(UUID)
  SET search_path = public;
ALTER FUNCTION public.claim_bucket_download(TEXT, TEXT)
  SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_bucket_download(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_destructible_file_download(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_destructible_file_download(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_bucket_download(TEXT, TEXT)
  TO service_role;
