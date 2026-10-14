-- ==============================================================================
-- RECOVERABLE DYNAMIC QR LIBRARY & ATOMIC ALLOWANCE FOUNDATION
-- Package 1 of QRBuddy Plus
-- ==============================================================================

-- 1. Library Entitlements Table
-- Tracks stable library entitlement (free vs plus) and paid-through expiration.
-- One row per auth user. Only service_role can mutate; authenticated users can read their own.
CREATE TABLE IF NOT EXISTS public.library_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'supporter')),
  paid_through TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.library_entitlements ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own entitlement
CREATE POLICY "Users can view own library entitlement"
  ON public.library_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Restrict direct modifications to service role
REVOKE INSERT, UPDATE, DELETE ON TABLE public.library_entitlements FROM anon, authenticated;

-- 2. Extend dynamic_qr_codes for library ownership and legacy status
ALTER TABLE public.dynamic_qr_codes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS title TEXT;

CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_user_id ON public.dynamic_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_user_legacy ON public.dynamic_qr_codes(user_id, is_legacy);

-- 3. Extend supporter_checkouts with user_id binding
ALTER TABLE public.supporter_checkouts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_supporter_checkouts_user_id ON public.supporter_checkouts(user_id);

-- 4. RPC: Get Library Quota
-- Computes user's current capacity, used non-legacy count, and grandfathered count.
CREATE OR REPLACE FUNCTION public.get_library_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tier TEXT := 'free';
  v_paid_through TIMESTAMPTZ := NULL;
  v_total_allowed INT := 5;
  v_used_count INT := 0;
  v_legacy_count INT := 0;
  v_is_active_plus BOOLEAN := FALSE;
BEGIN
  -- Look up entitlement if one exists
  SELECT tier, paid_through
  INTO v_tier, v_paid_through
  FROM public.library_entitlements
  WHERE user_id = p_user_id;

  IF v_tier IN ('plus', 'supporter') AND v_paid_through IS NOT NULL AND v_paid_through > now() THEN
    v_is_active_plus := TRUE;
    v_total_allowed := 100;
  ELSE
    v_is_active_plus := FALSE;
    v_total_allowed := 5;
  END IF;

  -- Count non-legacy codes owned by user (active redirects)
  SELECT count(*)
  INTO v_used_count
  FROM public.dynamic_qr_codes
  WHERE user_id = p_user_id
    AND is_legacy = FALSE;

  -- Count grandfathered legacy codes owned by user
  SELECT count(*)
  INTO v_legacy_count
  FROM public.dynamic_qr_codes
  WHERE user_id = p_user_id
    AND is_legacy = TRUE;

  RETURN jsonb_build_object(
    'tier', CASE WHEN v_is_active_plus THEN 'plus' ELSE 'free' END,
    'is_active_plus', v_is_active_plus,
    'paid_through', v_paid_through,
    'total_allowed', v_total_allowed,
    'used_count', v_used_count,
    'legacy_count', v_legacy_count,
    'can_create', (v_used_count < v_total_allowed)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_library_quota(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_library_quota(UUID) TO authenticated, service_role;

-- 5. RPC: Claim Legacy QR Code
-- Idempotently claims an existing code using its owner_token without consuming allowance.
-- Fails if code does not exist or is already bound to another library.
CREATE OR REPLACE FUNCTION public.claim_legacy_qr_code(
  p_user_id UUID,
  p_owner_token TEXT,
  p_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_qr_id UUID;
  v_existing_user_id UUID;
  v_short_code TEXT;
  v_destination_url TEXT;
  v_created_at TIMESTAMPTZ;
  v_scan_count INT;
  v_is_active BOOLEAN;
  v_resolved_title TEXT;
BEGIN
  -- Look up code by owner_token
  SELECT id, user_id, short_code, destination_url, created_at, scan_count, is_active, title
  INTO v_qr_id, v_existing_user_id, v_short_code, v_destination_url, v_created_at, v_scan_count, v_is_active, v_resolved_title
  FROM public.dynamic_qr_codes
  WHERE owner_token = p_owner_token;

  IF v_qr_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Invalid owner token');
  END IF;

  -- If already owned by another user, refuse claim to prevent stealing
  IF v_existing_user_id IS NOT NULL AND v_existing_user_id <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED', 'message', 'This QR code is already claimed by another library');
  END IF;

  -- If already claimed by this user, idempotent return
  IF v_existing_user_id = p_user_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'short_code', v_short_code,
      'destination_url', v_destination_url,
      'title', v_resolved_title,
      'is_legacy', true
    );
  END IF;

  -- Claim as legacy code (does NOT consume the 5-code allowance)
  v_resolved_title := COALESCE(p_title, v_resolved_title, v_destination_url);

  UPDATE public.dynamic_qr_codes
  SET
    user_id = p_user_id,
    is_legacy = TRUE,
    title = v_resolved_title
  WHERE id = v_qr_id;

  RETURN jsonb_build_object(
    'success', true,
    'claimed', true,
    'short_code', v_short_code,
    'destination_url', v_destination_url,
    'title', v_resolved_title,
    'is_legacy', true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_legacy_qr_code(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_legacy_qr_code(UUID, TEXT, TEXT) TO authenticated, service_role;

-- 6. RPC: Atomic Library Dynamic QR Creation
-- Atomically locks entitlement, enforces 5/100 limit, and inserts the new dynamic QR.
-- Prevents parallel requests from overshooting quota.
CREATE OR REPLACE FUNCTION public.create_library_dynamic_qr(
  p_user_id UUID,
  p_short_code TEXT,
  p_destination_url TEXT,
  p_owner_token TEXT,
  p_title TEXT DEFAULT NULL,
  p_max_scans INT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_routing_mode TEXT DEFAULT 'simple',
  p_routing_config JSONB DEFAULT NULL,
  p_splash_config JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tier TEXT := 'free';
  v_paid_through TIMESTAMPTZ := NULL;
  v_total_allowed INT := 5;
  v_used_count INT := 0;
  v_is_active_plus BOOLEAN := FALSE;
  v_new_id UUID;
BEGIN
  -- Insert default entitlement if missing, and acquire row lock FOR UPDATE
  INSERT INTO public.library_entitlements (user_id, tier, paid_through)
  VALUES (p_user_id, 'free', NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT tier, paid_through
  INTO v_tier, v_paid_through
  FROM public.library_entitlements
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_tier IN ('plus', 'supporter') AND v_paid_through IS NOT NULL AND v_paid_through > now() THEN
    v_is_active_plus := TRUE;
    v_total_allowed := 100;
  ELSE
    v_is_active_plus := FALSE;
    v_total_allowed := 5;
  END IF;

  -- Count current non-legacy codes under transaction lock
  SELECT count(*)
  INTO v_used_count
  FROM public.dynamic_qr_codes
  WHERE user_id = p_user_id
    AND is_legacy = FALSE;

  IF v_used_count >= v_total_allowed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QUOTA_EXCEEDED',
      'total_allowed', v_total_allowed,
      'used_count', v_used_count,
      'tier', CASE WHEN v_is_active_plus THEN 'plus' ELSE 'free' END
    );
  END IF;

  -- Insert new dynamic QR bound to this library (non-legacy)
  INSERT INTO public.dynamic_qr_codes (
    short_code,
    destination_url,
    user_id,
    is_legacy,
    title,
    max_scans,
    expires_at,
    routing_mode,
    routing_config,
    splash_config,
    owner_token,
    is_active
  ) VALUES (
    p_short_code,
    p_destination_url,
    p_user_id,
    FALSE,
    COALESCE(p_title, p_destination_url),
    p_max_scans,
    p_expires_at,
    p_routing_mode,
    p_routing_config,
    p_splash_config,
    p_owner_token,
    TRUE
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'short_code', p_short_code,
    'used_count', v_used_count + 1,
    'total_allowed', v_total_allowed
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_library_dynamic_qr(UUID, TEXT, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, TEXT, JSONB, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_library_dynamic_qr(UUID, TEXT, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, TEXT, JSONB, JSONB) TO authenticated, service_role;

-- 7. RPC: Fulfill Supporter/Plus Entitlement
-- Idempotently extends paid_through from max(now, existing_paid_through) by specified days (default 365).
CREATE OR REPLACE FUNCTION public.fulfill_supporter_entitlement(
  p_user_id UUID,
  p_checkout_id UUID,
  p_duration_days INT DEFAULT 365
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_paid_through TIMESTAMPTZ;
  v_current_paid_through TIMESTAMPTZ;
BEGIN
  -- Insert or lock entitlement row
  INSERT INTO public.library_entitlements (user_id, tier, paid_through)
  VALUES (p_user_id, 'free', NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT paid_through
  INTO v_current_paid_through
  FROM public.library_entitlements
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Extend from max(now, current_paid_through)
  v_new_paid_through := GREATEST(now(), COALESCE(v_current_paid_through, now())) + (p_duration_days || ' days')::interval;

  UPDATE public.library_entitlements
  SET
    tier = 'plus',
    paid_through = v_new_paid_through,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Ensure checkout record binds user_id
  IF p_checkout_id IS NOT NULL THEN
    UPDATE public.supporter_checkouts
    SET user_id = p_user_id
    WHERE checkout_id = p_checkout_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tier', 'plus',
    'paid_through', v_new_paid_through
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_supporter_entitlement(UUID, UUID, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_supporter_entitlement(UUID, UUID, INT) TO service_role;
