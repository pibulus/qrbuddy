-- Schedule the cleanup-expired function to run every hour
-- IMPORTANT: Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> with your actual values.
-- You can find these in the Supabase Dashboard > Project Settings > API.

select
  cron.schedule(
    'cleanup-expired-files',
    '0 * * * *', -- Every hour
    $$
    select
      net.http_post(
          url:='https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-expired',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- To unschedule:
-- select cron.unschedule('cleanup-expired-files');
