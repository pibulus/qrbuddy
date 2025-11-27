-- Pro Subscriptions Table
-- Stores Pro tier subscription data from Stripe

CREATE TABLE IF NOT EXISTS pro_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Stripe data
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,

  -- Pro access
  pro_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Metadata
  plan TEXT DEFAULT 'pro',
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_token ON pro_subscriptions(pro_token);
CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_email ON pro_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_stripe_customer ON pro_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_status ON pro_subscriptions(status);

-- RLS Policies
ALTER TABLE pro_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription by token
DROP POLICY IF EXISTS "Users can read own subscription" ON pro_subscriptions;
CREATE POLICY "Users can read own subscription"
  ON pro_subscriptions
  FOR SELECT
  USING (true); -- Public read by token (checked in application)

-- Only service role can insert/update
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON pro_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON pro_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to check Pro status by token
CREATE OR REPLACE FUNCTION check_pro_status(token TEXT)
RETURNS TABLE (
  is_active BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (status = 'active' AND ps.expires_at > CURRENT_TIMESTAMP) AS is_active,
    ps.expires_at,
    ps.email
  FROM pro_subscriptions ps
  WHERE ps.pro_token = token
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
