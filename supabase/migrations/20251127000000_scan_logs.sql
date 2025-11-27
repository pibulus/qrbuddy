-- Create scan_logs table for privacy-first analytics
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Device / Tech Info
  device_type TEXT, -- 'mobile', 'tablet', 'desktop', 'bot'
  os TEXT,          -- 'ios', 'android', 'macos', 'windows', 'linux'
  browser TEXT,     -- 'chrome', 'safari', 'firefox'
  
  -- Geo Info (Approximate, from headers)
  country TEXT,
  city TEXT,
  
  -- Raw UA for debugging (optional, can be omitted for stricter privacy)
  -- user_agent TEXT, 

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast analytics
CREATE INDEX idx_scan_logs_qr_id ON scan_logs(qr_id);
CREATE INDEX idx_scan_logs_scanned_at ON scan_logs(scanned_at);

-- RLS Policies
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs (via redirect-qr edge function)
CREATE POLICY "Service role can insert logs" ON scan_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service role can read logs (via get-analytics edge function)
-- We don't expose this directly to public/anon to prevent scraping
CREATE POLICY "Service role can read logs" ON scan_logs
  FOR SELECT
  USING (auth.role() = 'service_role');
