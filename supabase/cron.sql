-- Schedule the cleanup-expired function to run every hour
-- IMPORTANT: Replace <PROJECT_REF> and <CLEANUP_SECRET> with your actual values.
-- CLEANUP_SECRET is a dedicated secret (e.g. output of `openssl rand -hex 32`)
-- that must also be set as the CLEANUP_SECRET env var on the edge function.

select
  cron.schedule(
    'cleanup-expired-files',
    '0 * * * *', -- Every hour
    $$
    select
      net.http_post(
          url:='https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-expired',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <CLEANUP_SECRET>"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- To unschedule:
-- select cron.unschedule('cleanup-expired-files');
