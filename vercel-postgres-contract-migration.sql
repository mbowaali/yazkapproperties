CREATE TABLE IF NOT EXISTS tenant_contract_versions (
  version      SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_contract_signatures (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version        INTEGER NOT NULL REFERENCES tenant_contract_versions(version),
  signature_name TEXT NOT NULL,
  signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address     TEXT,
  user_agent     TEXT,
  UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_user
  ON tenant_contract_signatures(user_id, version);