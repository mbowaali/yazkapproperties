-- Yazkap Properties — Additional admin tables migration
-- Run this in Vercel Dashboard → Storage → your DB → Query

-- Tenant adjustments (refunds and discounts)
CREATE TABLE IF NOT EXISTS tenant_adjustments (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adjustment_type  TEXT NOT NULL CHECK (adjustment_type IN ('refund', 'discount')),
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'AED',
  effective_date   DATE NOT NULL,
  reason           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_adjustments_user ON tenant_adjustments(user_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_adjustments_date ON tenant_adjustments(effective_date);

-- Application settings
CREATE TABLE IF NOT EXISTS app_settings (
  id               SERIAL PRIMARY KEY,
  key              TEXT UNIQUE NOT NULL,
  value            TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial app settings
INSERT INTO app_settings (key, value, updated_at) VALUES
('admin_name', 'Yazid Ntulume', NOW()),
('admin_photo', '', NOW()),
('admin_bio', 'Property Manager at Yazkap Properties', NOW()),
('company_name', 'Yazkap Properties', NOW()),
('company_email', 'contact@yazkapproperties.com', NOW()),
('company_phone', '+971 4 123 4567', NOW()),
('company_address', '123 Business Avenue, Dubai, UAE', NOW())
ON CONFLICT (key) DO NOTHING;

-- Chatbot responses
CREATE TABLE IF NOT EXISTS chatbot_responses (
  id               SERIAL PRIMARY KEY,
  trigger_phrases  TEXT[] NOT NULL,
  response_text    TEXT NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  event_date       DATE NOT NULL,
  location         TEXT,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Requests table (general admin requests)
CREATE TABLE IF NOT EXISTS requests (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type     TEXT NOT NULL,
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);