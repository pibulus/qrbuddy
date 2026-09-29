-- Finalize the R2 object and its database record in one transaction. Keeping a
-- short-lived result on the grant makes retries return the same share/token if
-- the first response is lost, and lets cleanup distinguish live files from
-- abandoned uploads.
ALTER TABLE public.pending_uploads
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalization_result JSONB;

CREATE OR REPLACE FUNCTION public.finalize_pending_upload(
  p_upload_id UUID,
  p_owner_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending pending_uploads%ROWTYPE;
  v_params JSONB;
  v_max_downloads INTEGER;
  v_result JSONB;
  v_bucket_id UUID;
BEGIN
  SELECT * INTO v_pending
  FROM pending_uploads
  WHERE id = p_upload_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error_code', 'not_found');
  END IF;

  IF v_pending.finalized_at IS NOT NULL THEN
    RETURN COALESCE(
      v_pending.finalization_result,
      jsonb_build_object('error_code', 'finalized')
    );
  END IF;

  -- Reject grants 24 hours after creation, well after the one-hour presigned
  -- PUT expires. Cleanup can then reap old grants without a late finalize.
  IF v_pending.created_at < clock_timestamp() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object('error_code', 'expired');
  END IF;

  v_params := v_pending.params;

  IF v_pending.kind = 'destructible' THEN
    IF p_owner_token IS NULL OR p_owner_token = '' THEN
      RAISE EXCEPTION 'Owner token required for destructible upload';
    END IF;

    v_max_downloads := COALESCE(
      NULLIF((v_params->>'max_downloads')::INTEGER, 0),
      999999
    );

    INSERT INTO destructible_files (
      id,
      file_name,
      original_name,
      size,
      mime_type,
      files,
      theme,
      owner_token,
      created_at,
      accessed,
      max_downloads,
      download_count,
      creator_ip
    ) VALUES (
      (v_params->>'main_id')::UUID,
      v_pending.storage_key,
      v_pending.filename,
      v_pending.declared_size::INTEGER,
      v_pending.mimetype,
      jsonb_build_array(jsonb_build_object(
        'id', v_params->>'file_id',
        'path', v_pending.storage_key,
        'name', v_pending.filename,
        'size', v_pending.declared_size,
        'type', v_pending.mimetype
      )),
      COALESCE(NULLIF(v_params->>'theme', ''), 'sunset'),
      p_owner_token,
      clock_timestamp(),
      FALSE,
      v_max_downloads,
      0,
      v_params->>'creator_ip'
    );

    v_result := jsonb_build_object(
      'kind', 'destructible',
      'file_id', v_params->>'main_id',
      'owner_token', p_owner_token,
      'file_name', v_pending.filename,
      'size', v_pending.declared_size,
      'max_downloads', v_max_downloads
    );
  ELSIF v_pending.kind = 'bucket' THEN
    v_bucket_id := (v_params->>'bucket_id')::UUID;

    UPDATE file_buckets
    SET
      content_type = 'file',
      content_data = v_pending.storage_key,
      content_metadata = jsonb_strip_nulls(jsonb_build_object(
        'filename', v_pending.filename,
        'size', v_pending.declared_size,
        'mimetype', v_pending.mimetype,
        'storage_path', v_pending.storage_key,
        'title', v_params->>'title',
        'description', v_params->>'description',
        'creator', v_params->>'creator'
      )),
      is_empty = FALSE,
      download_started_at = NULL,
      last_filled_at = clock_timestamp(),
      updated_at = clock_timestamp()
    WHERE id = v_bucket_id AND is_empty = TRUE;

    IF NOT FOUND THEN
      INSERT INTO r2_reap_queue (storage_key, reap_after)
      VALUES (v_pending.storage_key, clock_timestamp() + INTERVAL '1 hour')
      ON CONFLICT (storage_key) DO UPDATE
      SET reap_after = GREATEST(r2_reap_queue.reap_after, EXCLUDED.reap_after);

      v_result := jsonb_build_object(
        'kind', 'bucket',
        'error_code', 'bucket_conflict'
      );
    ELSE
      v_result := jsonb_build_object(
        'kind', 'bucket',
        'success', TRUE,
        'content_type', 'file',
        'is_empty', FALSE
      );
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown pending upload kind: %', v_pending.kind;
  END IF;

  UPDATE pending_uploads
  SET finalized_at = clock_timestamp(), finalization_result = v_result
  WHERE id = p_upload_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_pending_upload(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_pending_upload(UUID, TEXT)
  TO service_role;
