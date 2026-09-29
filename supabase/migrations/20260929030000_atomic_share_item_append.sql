-- Appends serialize against removals and other appends so stale browser
-- requests cannot overwrite a newer slideshow or playlist.
CREATE OR REPLACE FUNCTION public.append_destructible_file_items(
  p_file_id UUID,
  p_owner_token TEXT,
  p_new_files JSONB
)
RETURNS TABLE (
  files JSONB,
  file_name TEXT,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file destructible_files%ROWTYPE;
  v_items JSONB;
  v_combined JSONB;
  v_max_downloads INTEGER;
  v_current_kind TEXT;
  v_title_kind TEXT;
  v_share_title TEXT;
  v_auto_named BOOLEAN;
  v_new_count INTEGER;
BEGIN
  SELECT * INTO v_file
  FROM destructible_files
  WHERE id = p_file_id
  FOR UPDATE;

  IF NOT FOUND OR v_file.owner_token IS DISTINCT FROM p_owner_token THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'not_found'::TEXT;
    RETURN;
  END IF;

  v_max_downloads := COALESCE(NULLIF(v_file.max_downloads, 0), 999999);
  IF v_max_downloads < 999999 THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'limited'::TEXT;
    RETURN;
  END IF;

  IF p_new_files IS NULL OR jsonb_typeof(p_new_files) <> 'array' THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'invalid_items'::TEXT;
    RETURN;
  END IF;

  IF jsonb_array_length(p_new_files) = 0 THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'invalid_items'::TEXT;
    RETURN;
  END IF;

  v_items := COALESCE(v_file.files, '[]'::JSONB);
  v_new_count := jsonb_array_length(p_new_files);
  IF jsonb_array_length(v_items) + v_new_count > 10 THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'max_items'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_new_files) AS incoming(item)
    WHERE COALESCE(item->>'id', '') = ''
      OR COALESCE(item->>'path', '') = ''
      OR COALESCE(item->>'name', '') = ''
      OR COALESCE(item->>'type', '') = ''
      OR COALESCE(item->>'size', '') !~ '^[0-9]+$'
  ) THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'invalid_items'::TEXT;
    RETURN;
  END IF;

  IF jsonb_array_length(v_items) = 0 THEN
    v_current_kind := 'other';
  ELSIF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) AS existing(item)
    WHERE COALESCE(item->>'type', '') NOT LIKE 'image/%'
  ) THEN
    v_current_kind := 'image';
  ELSIF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) AS existing(item)
    WHERE COALESCE(item->>'type', '') NOT LIKE 'audio/%'
  ) THEN
    v_current_kind := 'audio';
  ELSE
    v_current_kind := 'other';
  END IF;

  IF v_current_kind = 'other' THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'not_slideshow'::TEXT;
    RETURN;
  END IF;

  IF (v_current_kind = 'image' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_new_files) AS incoming(item)
    WHERE COALESCE(item->>'type', '') NOT LIKE 'image/%'
  )) OR (v_current_kind = 'audio' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_new_files) AS incoming(item)
    WHERE COALESCE(item->>'type', '') NOT LIKE 'audio/%'
  )) THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::TEXT, 'kind_mismatch'::TEXT;
    RETURN;
  END IF;

  v_combined := v_items || p_new_files;
  v_auto_named := COALESCE(v_file.original_name, '')
    ~ '^[0-9]+ (photos|tracks|files)$';
  v_share_title := v_file.original_name;

  IF v_auto_named THEN
    v_title_kind := CASE v_current_kind
      WHEN 'audio' THEN 'tracks'
      ELSE 'photos'
    END;
    v_share_title := jsonb_array_length(v_combined)::TEXT || ' ' || v_title_kind;
  END IF;

  UPDATE destructible_files
  SET
    files = v_combined,
    original_name = CASE WHEN v_auto_named THEN v_share_title ELSE original_name END
  WHERE id = p_file_id;

  RETURN QUERY SELECT v_combined, v_share_title, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.append_destructible_file_items(UUID, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_destructible_file_items(UUID, TEXT, JSONB)
  TO service_role;
