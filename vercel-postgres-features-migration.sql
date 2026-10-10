CREATE TABLE IF NOT EXISTS laundry_collections (
  id               SERIAL PRIMARY KEY,
  collection_month DATE NOT NULL UNIQUE CHECK (EXTRACT(DAY FROM collection_month) = 1),
  coin_count       INTEGER NOT NULL CHECK (coin_count >= 0),
  total_amount     NUMERIC(12,2) GENERATED ALWAYS AS (coin_count * 3.00) STORED,
  collected_by     TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_adjustments (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('refund','discount')),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'AED',
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_adjustments_user_date
  ON tenant_adjustments(user_id, effective_date DESC);