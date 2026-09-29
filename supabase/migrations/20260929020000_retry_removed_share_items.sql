-- Removed share items leave their object keys behind until background cleanup
-- can delete them. The row update and queue insert happen in one transaction.
CREATE TABLE IF NOT EXISTS public.file_storage_reap_queue (
  storage_path TEXT PRIMARY KEY,
  reap_after TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.file_storage_reap_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.file_storage_reap_queue
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.file_storage_reap_queue TO service_role;

CREATE OR REPLACE FUNCTION public.remove_destructible_file_item(
  p_file_id UUID,
  p_owner_token TEXT,
  p_item_id TEXT
)
RETURNS TABLE (
  files JSONB,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file destructible_files%ROWTYPE;
  v_items JSONB;
  v_target JSONB;
  v_remaining JSONB;
  v_first JSONB;
  v_storage_path TEXT;
  v_reap_after TIMESTAMPTZ := clock_timestamp() + INTERVAL '1 hour';
  v_max_downloads INTEGER;
BEGIN
  SELECT * INTO v_file
  FROM destructible_files
  WHERE id = p_file_id
  FOR UPDATE;

  IF NOT FOUND OR v_file.owner_token IS DISTINCT FROM p_owner_token THEN
    RETURN QUERY SELECT NULL::JSONB, 'not_found'::TEXT;
    RETURN;
  END IF;

  v_max_downloads := COALESCE(NULLIF(v_file.max_downloads, 0), 999999);
  IF v_max_downloads < 999999 THEN
    RETURN QUERY SELECT NULL::JSONB, 'limited'::TEXT;
    RETURN;
  END IF;

  v_items := COALESCE(v_file.files, '[]'::JSONB);
  SELECT item INTO v_target
  FROM jsonb_array_elements(v_items) AS entry(item)
  WHERE item->>'id' = p_item_id
  LIMIT 1;

  IF v_target IS NULL THEN
    RETURN QUERY SELECT NULL::JSONB, 'not_found'::TEXT;
    RETURN;
  END IF;

  IF jsonb_array_length(v_items) <= 1 THEN
    RETURN QUERY SELECT NULL::JSONB, 'last_item'::TEXT;
    RETURN;
  END IF;

  v_storage_path := v_target->>'path';
  IF v_storage_path IS NULL OR v_storage_path = '' THEN
    RAISE EXCEPTION 'Removed file item has no storage path';
  END IF;

  SELECT jsonb_agg(item ORDER BY ordinal)
  INTO v_remaining
  FROM jsonb_array_elements(v_items) WITH ORDINALITY AS entry(item, ordinal)
  WHERE item->>'id' <> p_item_id;

  v_first := v_remaining->0;

  UPDATE destructible_files
  SET
    files = v_remaining,
    file_name = v_first->>'path',
    size = (v_first->>'size')::INTEGER,
    mime_type = v_first->>'type'
  WHERE id = p_file_id;

  IF v_storage_path LIKE 'r2/%' THEN
    INSERT INTO r2_reap_queue (storage_key, reap_after)
    VALUES (v_storage_path, v_reap_after)
    ON CONFLICT (storage_key) DO UPDATE
    SET reap_after = GREATEST(r2_reap_queue.reap_after, EXCLUDED.reap_after);
  ELSE
    INSERT INTO file_storage_reap_queue (storage_path, reap_after)
    VALUES (v_storage_path, v_reap_after)
    ON CONFLICT (storage_path) DO UPDATE
    SET reap_after = GREATEST(
      file_storage_reap_queue.reap_after,
      EXCLUDED.reap_after
    );
  END IF;

  RETURN QUERY SELECT v_remaining, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_destructible_file_item(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_destructible_file_item(UUID, TEXT, TEXT)
  TO service_role;
